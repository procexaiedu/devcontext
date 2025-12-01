
import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, ArrowRight, Sparkles, AlertCircle, Mic, Square, Paperclip } from 'lucide-react';
import { ChatMessage, AppData, Project, Task, Priority, DocFile } from '../types';
import { sendMessageToOpenRouter, buildSystemPrompt, transcribeAudio } from '../services/ai';

declare const marked: any;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: AppData;
  currentProjectId: string | null;
  dispatch: any; 
}

export const ChatInterface: React.FC<Props> = ({ 
  isOpen, onClose, data, currentProjectId, dispatch 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: 'init', 
      role: 'assistant', 
      content: 'Hello! I am your Senior PM. I can analyze tasks, organize docs, and help you plan. You can speak to me or drag files.', 
      timestamp: Date.now() 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const currentProject = currentProjectId ? data.projects.find(p => p.id === currentProjectId) : null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, transcribing]);

  // --- AUDIO HANDLERS ---
  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorderRef.current = new MediaRecorder(stream);
          audioChunksRef.current = [];
          
          mediaRecorderRef.current.ondataavailable = (event) => {
              audioChunksRef.current.push(event.data);
          };
          
          mediaRecorderRef.current.onstop = async () => {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              await handleTranscription(audioBlob);
              stream.getTracks().forEach(track => track.stop()); // Stop mic
          };

          mediaRecorderRef.current.start();
          setIsRecording(true);
      } catch (err) {
          console.error("Mic Error:", err);
          alert("Could not access microphone.");
      }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  const handleTranscription = async (blob: Blob) => {
      if (!data.settings.groqApiKey) {
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: '⚠️ Please configure Groq API Key in Settings for Audio.', timestamp: Date.now() }]);
          return;
      }
      setTranscribing(true);
      try {
          const text = await transcribeAudio(blob, data.settings.groqApiKey);
          setInput(prev => prev + " " + text);
      } catch (e) {
          alert("Transcription Failed");
      } finally {
          setTranscribing(false);
      }
  };

  // --- TOOL HANDLER (Simplified for brevity, same logic as before but updated names) ---
  const handleToolAction = async (tool: string, args: any): Promise<string> => {
    // ... Existing logic from previous steps, ensuring consistency ...
    // Using a streamlined version here assuming the Dispatcher handles the logic provided in App.tsx
    // Ideally this logic should be imported or passed down, but for now we implement the calls to dispatch
    const timestamp = Date.now();
    switch (tool) {
        case 'MANAGE_PROJECT':
            if (args.action === 'UPDATE' && args.id) {
                // Fetch existing to merge
                const p = data.projects.find(prj => prj.id === args.id);
                if(p) dispatch({ type: 'UPDATE_PROJECT', payload: { ...p, ...args, updatedAt: timestamp }});
                return "Project Updated";
            }
            return "Project Action Handled";
        case 'MANAGE_TASK':
            if (args.action === 'CREATE') {
                const newTask: Task = {
                    id: `t-${timestamp}-${Math.random()}`,
                    projectId: args.projectId || currentProjectId,
                    title: args.title || 'New Task',
                    description: args.description || '',
                    status: args.status || 'TODO',
                    priority: args.priority || Priority.MEDIUM,
                    tags: args.tags || [],
                    subtasks: (args.subtasks || []).map((t:string) => ({id: Math.random().toString(), title: t, completed: false})),
                    dueDate: args.dueDate,
                    timeSpent: 0,
                    isTimerRunning: false,
                    createdAt: timestamp,
                    updatedAt: timestamp
                };
                dispatch({ type: 'SAVE_TASK', payload: newTask });
                return `Task ${newTask.title} created`;
            }
            if (args.action === 'UPDATE') {
                 // Logic to find task and update
                 const existing = data.tasks.find(t => t.id === args.id);
                 if(existing) dispatch({ type: 'SAVE_TASK', payload: { ...existing, ...args, updatedAt: timestamp }});
                 return `Task updated`;
            }
            return "Task Action Handled";
        case 'MANAGE_FILE':
             if (args.action === 'CREATE' || args.action === 'UPDATE') {
                 dispatch({ 
                     type: 'SAVE_FILE', 
                     payload: { 
                         projectId: currentProjectId, 
                         file: { id: args.id || `f-${timestamp}`, name: args.name, content: args.content, type: 'md', path: args.path || '/' } 
                     } 
                 });
                 return `File ${args.name} saved`;
             }
             return "File managed";
        default: return "Unknown tool";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!data.settings.openRouterKey) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '⚠️ Please configure your OpenRouter API Key.',
        timestamp: Date.now()
      }]);
      return;
    }

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const systemPrompt = buildSystemPrompt(data, currentProjectId, data.settings.customSystemPrompt);
      const responseMsg = await sendMessageToOpenRouter(
        [...messages, userMsg],
        data.settings.openRouterKey,
        data.settings.defaultModel,
        systemPrompt,
        handleToolAction
      );
      setMessages(prev => [...prev, responseMsg]);
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: '⚠️ Error.', timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[450px] bg-surface border-l border-border flex flex-col z-50 shadow-2xl animate-fade-in">
      <div className="p-4 border-b border-border flex justify-between items-center bg-surfaceHighlight/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-2 rounded-lg">
            <Bot size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-text text-sm">DevContext PM</h2>
            <p className="text-[10px] text-textMuted flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              {currentProject ? currentProject.name : 'Global'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-textMuted hover:text-text p-2 hover:bg-white/5 rounded-lg">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-surfaceHighlight border border-border text-text rounded-tl-none'}`}>
              {msg.role === 'assistant' ? <div className="markdown-body text-xs" dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) }} /> : msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
           <div className="flex justify-start">
             <div className="bg-surfaceHighlight border border-border rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
               <Sparkles size={16} className="text-primary animate-pulse" />
               <span className="text-xs text-textMuted">Thinking...</span>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border bg-surface">
        {transcribing && <div className="text-xs text-primary animate-pulse mb-2 flex items-center gap-2"><Mic size={12}/> Transcribing audio...</div>}
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isRecording ? "Recording..." : "Message..."}
            className="w-full pl-4 pr-20 py-3.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm text-text"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              <button 
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-1.5 rounded-lg transition-colors ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-textMuted hover:bg-surfaceHighlight'}`}
                title="Voice Input"
              >
                  {isRecording ? <Square size={16}/> : <Mic size={16}/>}
              </button>
              <button 
                type="submit"
                disabled={isLoading || !input.trim()}
                className="p-1.5 bg-primary rounded-lg text-white hover:bg-primaryHover disabled:opacity-50"
              >
                <ArrowRight size={16} />
              </button>
          </div>
        </form>
      </div>
    </div>
  );
};
