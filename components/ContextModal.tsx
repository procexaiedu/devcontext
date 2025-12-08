
import React, { useState } from 'react';
import { Project, Task } from '../types';
import { X, Copy, CheckCircle2 } from './Icons';
import { generateProjectContext, ContextFormat } from '../services/contextGenerator';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    tasks: Task[];
}

export const ContextModal: React.FC<Props> = ({ isOpen, onClose, project, tasks }) => {
    const [format, setFormat] = useState<ContextFormat>(ContextFormat.PROMPT);
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;
    
    const text = generateProjectContext(project, tasks, [], format);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
            // Optional: onClose(); 
        }, 2000);
    };
    
    return (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-surface border border-border w-full max-w-4xl rounded-xl shadow-2xl flex flex-col h-[80vh]">
                <div className="p-4 border-b border-border flex justify-between items-center bg-surfaceHighlight/10">
                    <div className="flex items-center gap-3">
                        <h3 className="font-bold text-text text-lg">AI Context Generator</h3>
                        <span className="bg-primary/10 text-primary text-[10px] px-2 py-1 rounded-full border border-primary/20">
                            {text.length} chars
                        </span>
                    </div>
                    <button onClick={onClose} className="text-textMuted hover:text-text transition-colors"><X size={20}/></button>
                </div>

                {/* Toolbar */}
                <div className="p-2 border-b border-border bg-surfaceHighlight/5 flex gap-2 overflow-x-auto">
                    {[
                        { id: ContextFormat.PROMPT, label: 'AI Prompt' },
                        { id: ContextFormat.MARKDOWN, label: 'Markdown' },
                        { id: ContextFormat.TECHNICAL, label: 'Technical Spec' },
                        { id: ContextFormat.SUMMARY, label: 'Summary' }
                    ].map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => setFormat(opt.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${format === opt.id ? 'bg-primary text-white shadow-md' : 'text-textMuted hover:text-text hover:bg-surfaceHighlight'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 flex flex-col p-0 overflow-hidden relative group">
                    <textarea 
                        readOnly 
                        value={text} 
                        className="flex-1 bg-[#0d1117] text-gray-300 p-6 font-mono text-xs resize-none outline-none leading-relaxed custom-scrollbar"
                        onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                    />
                     <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-textMuted bg-black/50 px-2 py-1 rounded backdrop-blur">Click text to select all</span>
                     </div>
                </div>

                <div className="p-4 border-t border-border flex justify-between items-center bg-surfaceHighlight/10">
                     <p className="text-xs text-textMuted max-w-md">
                        Paste this into Claude, ChatGPT, or Gemini to provide instant project context.
                     </p>
                     <button 
                        onClick={handleCopy} 
                        className={`px-6 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-lg ${copied ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primaryHover'}`}
                     >
                         {copied ? <CheckCircle2 size={16}/> : <Copy size={16}/>}
                         {copied ? 'Copied!' : 'Copy to Clipboard'}
                     </button>
                </div>
            </div>
        </div>
    );
};
