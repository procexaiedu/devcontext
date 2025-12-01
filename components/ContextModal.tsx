
import React from 'react';
import { Project, Task } from '../types';
import { X } from './Icons';
import { generateProjectContext, ContextFormat } from '../services/contextGenerator';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    tasks: Task[];
}

export const ContextModal: React.FC<Props> = ({ isOpen, onClose, project, tasks }) => {
    if (!isOpen) return null;
    const text = generateProjectContext(project, tasks, [], ContextFormat.PROMPT);
    
    return (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
            <div className="bg-surface border border-border w-full max-w-3xl rounded-xl shadow-2xl flex flex-col h-[600px] animate-fade-in">
                <div className="p-4 border-b border-border flex justify-between items-center bg-surfaceHighlight/30">
                    <h3 className="font-bold text-text">AI Context Generator</h3>
                    <button onClick={onClose} className="text-textMuted hover:text-text"><X size={20}/></button>
                </div>
                <div className="flex-1 flex flex-col p-4 overflow-hidden">
                    <div className="mb-2 text-xs text-textMuted">Copy the prompt below to Claude, ChatGPT, or Gemini to give them full context.</div>
                    <textarea 
                        readOnly 
                        value={text} 
                        className="flex-1 bg-[#0d1117] text-gray-300 p-4 font-mono text-xs resize-none outline-none border border-border rounded-lg"
                        onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                    />
                </div>
                <div className="p-4 border-t border-border flex justify-end">
                     <button 
                        onClick={() => { navigator.clipboard.writeText(text); onClose(); }} 
                        className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primaryHover"
                     >
                         Copy to Clipboard
                     </button>
                </div>
            </div>
        </div>
    );
};
