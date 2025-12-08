
import React, { useState, useEffect } from 'react';
import { Task, Priority, Subtask } from '../types';
import { X, Plus, Trash2, Calendar, Tag, CheckSquare, AlignLeft, Flag, Clock, Play, Pause, Eraser } from './Icons';
import { ConfirmDialog } from './ConfirmDialog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  initialTask?: Task | null;
  projectId: string;
  projectColumns: any[];
}

export const TaskModal: React.FC<Props> = ({ isOpen, onClose, onSave, onDelete, initialTask, projectId, projectColumns }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [status, setStatus] = useState(projectColumns[0]?.id || 'TODO');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [timeSpent, setTimeSpent] = useState(0); 
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description);
      setPriority(initialTask.priority);
      setStatus(initialTask.status);
      setTags(initialTask.tags);
      setSubtasks(initialTask.subtasks);
      
      setStartDate(initialTask.startDate ? new Date(initialTask.startDate).toISOString().split('T')[0] : '');
      setDueDate(initialTask.dueDate ? new Date(initialTask.dueDate).toISOString().split('T')[0] : '');
      setTimeSpent(initialTask.timeSpent || 0);
      setIsTimerRunning(initialTask.isTimerRunning || false);
    } else {
      setTitle('');
      setDescription('');
      setPriority(Priority.MEDIUM);
      setStatus(projectColumns[0]?.id || 'TODO');
      setTags([]);
      setSubtasks([]);
      setStartDate('');
      setDueDate('');
      setTimeSpent(0);
      setIsTimerRunning(false);
    }
  }, [initialTask, isOpen]);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning) {
        interval = setInterval(() => {
            setTimeSpent(prev => prev + 1);
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      id: initialTask?.id,
      projectId,
      title,
      description,
      priority,
      status,
      tags,
      subtasks,
      startDate: startDate ? new Date(startDate).getTime() : undefined,
      dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
      timeSpent,
      isTimerRunning,
      createdAt: initialTask?.createdAt || Date.now(),
      updatedAt: Date.now()
    });
    onClose();
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const toggleTimer = () => {
      setIsTimerRunning(!isTimerRunning);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-surface border border-border w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-border">
          <div className="flex items-center gap-3">
             <h2 className="text-xl font-semibold text-text">{initialTask ? 'Edit Task' : 'New Task'}</h2>
             <select 
                value={status} 
                onChange={e => setStatus(e.target.value)}
                className="bg-surfaceHighlight border border-border rounded px-2 py-1 text-xs text-text outline-none focus:border-primary"
             >
                 {projectColumns.map(col => (
                     <option key={col.id} value={col.id}>{col.title}</option>
                 ))}
             </select>
          </div>
          <button onClick={onClose} className="text-textMuted hover:text-text hover:bg-surfaceHighlight p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          <div>
            <input 
              type="text" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Task Title"
              className="w-full bg-transparent text-2xl font-bold text-text outline-none placeholder-textMuted/50 border-b border-transparent focus:border-border transition-colors pb-1"
              autoFocus
            />
          </div>

          <div className="flex flex-wrap gap-4 bg-surfaceHighlight/20 p-4 rounded-lg border border-border/50">
             {/* Timer */}
             <div className="flex items-center gap-3 border-r border-border pr-4 min-w-[140px]">
                <button 
                  onClick={toggleTimer}
                  className={`p-2 rounded-full transition-colors ${isTimerRunning ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'}`}
                >
                    {isTimerRunning ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}
                </button>
                <div>
                    <span className="block text-[10px] text-textMuted uppercase font-bold">Time Spent</span>
                    <span className="font-mono text-sm text-text">{formatTime(timeSpent)}</span>
                </div>
             </div>

             {/* Dates */}
             <div className="flex flex-1 gap-4">
               <div className="flex-1">
                  <span className="block text-[10px] text-textMuted uppercase font-bold mb-1">Start Date</span>
                  <div className="relative group">
                    <input 
                        type="date" 
                        value={startDate} 
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-text outline-none focus:border-primary"
                    />
                    {startDate && (
                      <button onClick={() => setStartDate('')} className="absolute right-8 top-1/2 -translate-y-1/2 text-textMuted hover:text-text">
                        <Eraser size={12}/>
                      </button>
                    )}
                  </div>
               </div>

               <div className="flex-1">
                  <span className="block text-[10px] text-textMuted uppercase font-bold mb-1">Due Date</span>
                  <div className="relative group">
                    <input 
                        type="date" 
                        value={dueDate} 
                        onChange={e => setDueDate(e.target.value)}
                        className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-text outline-none focus:border-primary"
                    />
                     {dueDate && (
                      <button onClick={() => setDueDate('')} className="absolute right-8 top-1/2 -translate-y-1/2 text-textMuted hover:text-text">
                        <Eraser size={12}/>
                      </button>
                    )}
                  </div>
               </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-textMuted uppercase mb-1 flex items-center gap-1"><Flag size={12}/> Priority</label>
              <div className="flex gap-2">
                {[Priority.LOW, Priority.MEDIUM, Priority.HIGH].map(p => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                      priority === p 
                        ? p === Priority.HIGH ? 'bg-red-500/20 text-red-500 border-red-500' : p === Priority.MEDIUM ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500' : 'bg-blue-500/20 text-blue-500 border-blue-500'
                        : 'bg-surfaceHighlight text-textMuted border-transparent hover:border-border'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
               <label className="block text-xs font-bold text-textMuted uppercase mb-1 flex items-center gap-1"><Tag size={12}/> Tags</label>
               <div className="bg-background border border-border rounded-lg p-2 min-h-[42px] flex flex-wrap gap-2 items-center">
                  {tags.map(tag => (
                    <span key={tag} className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded flex items-center gap-1">
                      {tag}
                      <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-white"><X size={10}/></button>
                    </span>
                  ))}
                  <input 
                    type="text"
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={(e) => { if(e.key==='Enter' && newTag.trim()) { setTags([...tags, newTag.trim()]); setNewTag(''); }}}
                    placeholder="Type..."
                    className="bg-transparent text-xs text-text outline-none flex-1 min-w-[60px]"
                  />
               </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-textMuted uppercase mb-1 flex items-center gap-1"><AlignLeft size={12}/> Description</label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add details..."
              className="w-full h-32 bg-background border border-border rounded-lg p-3 text-sm text-text focus:border-primary outline-none resize-none font-sans leading-relaxed"
            />
          </div>

          <div>
             <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-textMuted uppercase flex items-center gap-1"><CheckSquare size={12}/> Subtasks</label>
                <button onClick={() => setSubtasks([...subtasks, { id: Math.random().toString(), title: '', completed: false }])} className="text-xs text-primary hover:underline flex items-center gap-1">
                   <Plus size={12}/> Add
                </button>
             </div>
             <div className="space-y-2">
               {subtasks.map((st, idx) => (
                 <div key={st.id} className="flex items-center gap-2 group animate-fade-in">
                    <input 
                        type="checkbox" 
                        checked={st.completed}
                        onChange={() => setSubtasks(subtasks.map(s => s.id === st.id ? { ...s, completed: !s.completed } : s))}
                        className="accent-primary"
                    />
                    <input 
                      type="text" 
                      value={st.title} 
                      onChange={e => setSubtasks(subtasks.map(s => s.id === st.id ? { ...s, title: e.target.value } : s))}
                      className={`flex-1 bg-surfaceHighlight border border-transparent focus:border-border rounded px-2 py-1.5 text-sm outline-none transition-colors ${st.completed ? 'text-textMuted line-through' : 'text-text'}`}
                      placeholder="Subtask..."
                    />
                    <button onClick={() => setSubtasks(subtasks.filter(s => s.id !== st.id))} className="text-textMuted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={14}/>
                    </button>
                 </div>
               ))}
             </div>
          </div>
        </div>

        <div className="p-5 border-t border-border flex justify-between items-center bg-surfaceHighlight/20">
          <div>
              {initialTask && (
                  <button 
                    onClick={() => setShowDeleteConfirm(true)} 
                    className="px-4 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={16}/> Delete
                  </button>
              )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-medium text-textMuted hover:text-text transition-colors">
                Cancel
            </button>
            <button onClick={handleSave} className="px-6 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primaryHover shadow-lg shadow-primary/20 transition-all transform active:scale-95">
                Save Task
            </button>
          </div>
        </div>

        <ConfirmDialog 
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={() => {
                if (initialTask) {
                    onDelete(initialTask.id);
                    onClose();
                }
            }}
            title="Delete Task?"
            message="This action cannot be undone. Are you sure you want to permanently delete this task?"
            confirmLabel="Delete"
            isDestructive={true}
        />

      </div>
    </div>
  );
};
