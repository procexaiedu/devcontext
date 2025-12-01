
import React from 'react';
import { Project, Task } from '../types';
import { TaskCard } from './TaskCard';
import { Plus } from './Icons';

interface Props {
    project: Project;
    tasks: Task[];
    onMoveTask: (taskId: string, newStatus: string) => void;
    onTaskClick: (task: Task) => void;
    onNewTask: () => void;
}

export const KanbanView: React.FC<Props> = ({ project, tasks, onMoveTask, onTaskClick, onNewTask }) => {
    const handleDrop = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
        onMoveTask(taskId, statusId);
    }
    };

    return (
        <div className="h-full flex gap-4 p-6 overflow-x-auto">
            {project.columns.map(col => (
                <div 
                key={col.id}
                onDrop={(e) => handleDrop(e, col.id)}
                onDragOver={(e) => e.preventDefault()}
                className={`flex-1 min-w-[320px] rounded-xl flex flex-col bg-surface border border-border/50`}
                >
                    <div className={`p-3 border-b border-border flex justify-between items-center bg-surfaceHighlight/30`}>
                        <h3 className="font-semibold text-text text-sm tracking-wide flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full border border-current`} style={{ color: col.color.replace('border-', '').replace('-500', '') }}></span>
                            {col.title}
                        </h3>
                        <span className="text-xs bg-background/50 px-2 py-0.5 rounded text-textMuted font-mono">
                            {tasks.filter(t => t.status === col.id).length}
                        </span>
                    </div>
                    <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar bg-surface/50">
                        {tasks.filter(t => t.status === col.id).map(task => (
                            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
                        ))}
                    </div>
                    <div className="p-3 border-t border-border">
                    <button 
                        onClick={onNewTask}
                        className="w-full py-2 bg-surfaceHighlight hover:bg-surfaceHighlight/80 rounded-lg text-textMuted text-sm transition-colors flex justify-center items-center gap-2"
                    >
                        <Plus size={16} /> New Task
                    </button>
                    </div>
                </div>
            ))}
        </div>
    );
};
