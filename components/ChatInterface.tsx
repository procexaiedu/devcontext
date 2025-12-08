
import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, ArrowRight, Sparkles, AlertCircle, Mic, Square, Paperclip, Copy } from 'lucide-react';
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const currentProject = currentProjectId ? data.projects.find(p => p.id === currentProjectId) : null;

  // ... existing scrollToBottom, adjustTextareaHeight, useEffects ...

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const adjustTextareaHeight = () => {
      if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, transcribing]);

  useEffect(() => {
      adjustTextareaHeight();
  }, [input]);

  const handleInputKeydown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSubmit(e as any);
      }
  };

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

  // --- TOOL HANDLER ---
  const handleToolAction = async (tool: string, args: any): Promise<string> => {
    const timestamp = Date.now();
    let result = "Action executed";
    
    // Normalize action if missing but implied by args
    let action = args.action;
    if (!action) {
        if (tool === 'MANAGE_PROJECT') {
             if (args.name && !args.id) action = 'CREATE';
             else if (args.id) action = 'UPDATE';
        } else if (tool === 'MANAGE_TASK') {
             if (args.title && !args.id) action = 'CREATE';
             else if (args.id) action = 'UPDATE';
        } else if (tool === 'MANAGE_FILE') {
             if (args.name && args.content) action = 'CREATE'; // or UPDATE, handled same
        }
    }

    try {
        switch (tool) {
            case 'MANAGE_PROJECT':
                if (action === 'CREATE') {
                    const newProject: Project = {
                        id: `p-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
                        name: args.name || 'New Project',
                        description: args.description || '',
                        status: 'ACTIVE',
                        createdAt: timestamp,
                        updatedAt: timestamp,
                        columns: [
                            { id: 'TODO', title: 'To Do', color: '#e2e8f0' },
                            { id: 'IN_PROGRESS', title: 'In Progress', color: '#3b82f6' },
                            { id: 'DONE', title: 'Done', color: '#22c55e' }
                        ],
                        files: []
                    };
                    dispatch({ type: 'ADD_PROJECT', payload: newProject });
                    result = `Project "${newProject.name}" created with ID ${newProject.id}`;
                } else if (action === 'UPDATE' && args.id) {
                    const p = data.projects.find(prj => prj.id === args.id);
                    if(p) {
                        dispatch({ type: 'UPDATE_PROJECT', payload: { ...p, ...args, updatedAt: timestamp }});
                        result = "Project Updated";
                    } else {
                        result = "Project not found";
                    }
                } else {
                    result = `Invalid Project Action: ${JSON.stringify(args)}`;
                }
                break;
            case 'MANAGE_TASK':
                if (action === 'CREATE') {
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
                    if (!newTask.projectId) {
                         result = "Error: No Project ID provided or active.";
                    } else {
                        dispatch({ type: 'SAVE_TASK', payload: newTask });
                        result = `Task "${newTask.title}" created`;
                    }
                } else if (action === 'UPDATE') {
                     const existing = data.tasks.find(t => t.id === args.id);
                     if(existing) {
                         dispatch({ type: 'SAVE_TASK', payload: { ...existing, ...args, updatedAt: timestamp }});
                         result = `Task updated`;
                     } else {
                         result = "Task not found";
                     }
                } else {
                    result = `Invalid Task Action: ${JSON.stringify(args)}`;
                }
                break;
            case 'BATCH_CREATE_TASKS':
                if (args.tasks && Array.isArray(args.tasks)) {
                    let createdCount = 0;
                    args.tasks.forEach((tArgs: any) => {
                         const newTask: Task = {
                            id: `t-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
                            projectId: tArgs.projectId || args.projectId || currentProjectId,
                            title: tArgs.title || 'New Task',
                            description: tArgs.description || '',
                            status: tArgs.status || 'TODO',
                            priority: tArgs.priority || Priority.MEDIUM,
                            tags: tArgs.tags || [],
                            subtasks: (tArgs.subtasks || []).map((st:string) => ({id: Math.random().toString(), title: st, completed: false})),
                            dueDate: tArgs.dueDate,
                            timeSpent: 0,
                            isTimerRunning: false,
                            createdAt: timestamp,
                            updatedAt: timestamp
                        };
                        
                        if (newTask.projectId) {
                            dispatch({ type: 'SAVE_TASK', payload: newTask });
                            createdCount++;
                        }
                    });
                    result = `Successfully created ${createdCount} tasks in batch.`;
                } else {
                    result = "Error: 'tasks' array missing in BATCH_CREATE_TASKS args.";
                }
                break;
            case 'MANAGE_FILE':
                 if (action === 'CREATE' || action === 'UPDATE' || (!action && args.name && args.content)) {
                     if (!currentProjectId) {
                         result = "Error: No active project for file creation.";
                     } else {
                         dispatch({ 
                             type: 'SAVE_FILE', 
                             payload: { 
                                 projectId: currentProjectId, 
                                 file: { id: args.id || `f-${timestamp}`, name: args.name, content: args.content, type: 'md', path: args.path || '/' } 
                             } 
                         });
                         result = `File "${args.name}" saved`;
                     }
                 }
                 break;
            default: result = "Unknown tool";
        }
    } catch (err: any) {
        result = `Error executing tool: ${err.message}`;
    }

    // Log the interaction
    setLogs(prev => [{ timestamp: new Date().toISOString(), tool, args, result }, ...prev]);
    return result;
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
        <div className="flex items-center gap-1">
            <button onClick={() => setShowLogs(!showLogs)} className={`text-textMuted hover:text-text p-2 hover:bg-white/5 rounded-lg ${showLogs ? 'text-primary' : ''}`} title="Debug Logs">
                <AlertCircle size={18} />
            </button>
            <button onClick={onClose} className="text-textMuted hover:text-text p-2 hover:bg-white/5 rounded-lg">
              <X size={18} />
            </button>
        </div>
      </div>

      {showLogs ? (
          <div className="flex-1 overflow-y-auto p-4 bg-surfaceHighlight font-mono text-xs text-textMuted">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-text font-bold">System Logs</h3>
                  <button 
                    onClick={() => {
                        const text = logs.map(l => `[${l.timestamp}] ${l.tool}\nARGS: ${JSON.stringify(l.args)}\nRESULT: ${l.result}`).join('\n\n');
                        navigator.clipboard.writeText(text);
                        alert('Logs copied!');
                    }} 
                    className="p-1 bg-surface border border-border rounded hover:bg-surfaceHighlight text-white flex items-center gap-1"
                  >
                      <Copy size={12}/> Copy
                  </button>
              </div>
              {logs.length === 0 && <p>No actions recorded yet.</p>}
              {logs.map((log, i) => (
                  <div key={i} className="mb-4 border-b border-border pb-2">
                      <div className="text-primary mb-1">{new Date(log.timestamp).toLocaleTimeString()}</div>
                      <div className="font-bold text-white">TOOL: {log.tool}</div>
                      <pre className="whitespace-pre-wrap my-1 bg-black/20 p-2 rounded break-all">{JSON.stringify(log.args, null, 2)}</pre>
                      <div className={log.result.startsWith('Error') ? 'text-red-400' : 'text-green-400'}>Result: {log.result}</div>
                  </div>
              ))}
          </div>
      ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm whitespace-pre-wrap break-words ${msg.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-surfaceHighlight border border-border text-text rounded-tl-none'}`}>
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
      )}

      <div className="p-4 border-t border-border bg-surface">
        {transcribing && <div className="text-xs text-primary animate-pulse mb-2 flex items-center gap-2"><Mic size={12}/> Transcribing audio...</div>}
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleInputKeydown}
            placeholder={isRecording ? "Recording..." : "Message..."}
            className="w-full pl-4 pr-20 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm text-text resize-none overflow-y-auto min-h-[48px] max-h-[200px]"
            rows={1}
            style={{ height: 'auto' }}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
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
