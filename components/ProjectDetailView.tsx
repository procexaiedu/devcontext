
import React, { useState } from 'react';
import { Project, Task, DocFile, DefaultStatus } from '../types';
import { KanbanView } from './KanbanView';
import { DocsView } from './DocsView';
import { CalendarView } from './CalendarView';
import { ChevronLeft, Edit2, Copy, List, Grid, Calendar, Folder, Search } from './Icons';
import { translations } from '../lib/translations';
import { TaskCard } from './TaskCard'; // Reusing TaskCard for Backlog

interface Props {
    project: Project;
    tasks: Task[];
    onBack: () => void;
    onOpenSettings: () => void;
    onOpenContext: () => void;
    onMoveTask: (taskId: string, newStatus: string) => void;
    onTaskClick: (task: Task) => void;
    onNewTask: () => void;
    onSaveFile: (file: DocFile) => void;
    onDeleteFile: (fileId: string) => void;
    showToast: (msg: string) => void;
}

export const ProjectDetailView: React.FC<Props> = ({ 
    project, tasks, onBack, onOpenSettings, onOpenContext,
    onMoveTask, onTaskClick, onNewTask, onSaveFile, onDeleteFile, showToast
}) => {
    const [tab, setTab] = useState<'KANBAN' | 'BACKLOG' | 'CALENDAR' | 'DOCS'>('KANBAN');
    const [filter, setFilter] = useState('');

    const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(filter.toLowerCase()));

    // Backlog: Tasks that are TODO
    const backlogTasks = filteredTasks.filter(t => t.status === DefaultStatus.TODO);

    return (
        <div className="flex flex-col h-full bg-[#0c0c0e]">
           <div className="h-16 border-b border-border bg-surface/50 backdrop-blur px-6 flex items-center justify-between">
               <div className="flex items-center gap-4">
                   <button onClick={onBack} className="p-2 hover:bg-surfaceHighlight rounded-lg text-textMuted"><ChevronLeft size={20} /></button>
                   <div>
                       <h1 className="text-lg font-bold text-text flex items-center gap-2">
                           {project.name}
                           <span className={`text-[10px] px-2 py-0.5 rounded-full ${project.status==='ACTIVE'?'bg-green-500/20 text-green-500':'bg-gray-500/20 text-gray-500'}`}>{project.status}</span>
                       </h1>
                   </div>
               </div>
               
               <div className="flex-1 max-w-md mx-4">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted"/>
                        <input 
                            value={filter} 
                            onChange={e => setFilter(e.target.value)} 
                            placeholder="Filter project tasks..."
                            className="w-full bg-surfaceHighlight/30 border border-transparent focus:border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-text outline-none"
                        />
                    </div>
               </div>

               <div className="flex gap-2">
                   <button onClick={onOpenSettings} className="p-2 hover:bg-surfaceHighlight rounded text-textMuted"><Edit2 size={16}/></button>
                   <button onClick={onOpenContext} className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded text-xs font-medium"><Copy size={14}/> Context</button>
               </div>
           </div>
           
           <div className="px-6 pt-4 pb-0 flex-1 overflow-hidden flex flex-col">
                <div className="flex gap-1 mb-4 bg-surface p-1 rounded-lg border border-border w-fit">
                   {[
                       { id: 'KANBAN', icon: Grid, label: 'Kanban' },
                       { id: 'BACKLOG', icon: List, label: 'Backlog' },
                       { id: 'CALENDAR', icon: Calendar, label: 'Calendar' },
                       { id: 'DOCS', icon: Folder, label: 'Docs' },
                   ].map(item => (
                       <button 
                         key={item.id}
                         onClick={() => setTab(item.id as any)} 
                         className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 transition-all ${tab === item.id ? 'bg-primary text-white shadow' : 'text-textMuted hover:text-text hover:bg-surfaceHighlight'}`}
                       >
                           <item.icon size={14}/> {item.label}
                       </button>
                   ))}
               </div>

               <div className="flex-1 overflow-hidden bg-surface/30 rounded-t-2xl border-t border-x border-border">
                   {tab === 'KANBAN' && (
                       <KanbanView 
                           project={project} 
                           tasks={filteredTasks} // Use filtered
                           onMoveTask={onMoveTask}
                           onTaskClick={onTaskClick}
                           onNewTask={onNewTask}
                       />
                   )}
                   {tab === 'BACKLOG' && (
                       <div className="p-6 overflow-y-auto h-full space-y-2">
                           {backlogTasks.length === 0 && <div className="text-center text-textMuted text-sm">No pending tasks found.</div>}
                           {backlogTasks.map(t => (
                               <TaskCard key={t.id} task={t} onClick={() => onTaskClick(t)} />
                           ))}
                       </div>
                   )}
                   {tab === 'CALENDAR' && (
                       <CalendarView 
                           project={project}
                           tasks={filteredTasks} 
                           onTaskClick={onTaskClick}
                       />
                   )}
                   {tab === 'DOCS' && (
                       <DocsView 
                           project={project} 
                           onSaveFile={onSaveFile}
                           onDeleteFile={onDeleteFile}
                           showToast={showToast}
                       />
                   )}
               </div>
           </div>
        </div>
    );
};
