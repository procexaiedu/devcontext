
import React from 'react';
import { Task } from '../types';
import { CheckSquare, Clock } from './Icons';

interface Props {
  task: Task;
  onClick: () => void;
}

export const TaskCard: React.FC<Props> = ({ task, onClick }) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const priorityConfig = {
    'HIGH': { color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
    'MEDIUM': { color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
    'LOW': { color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' }
  }[task.priority] || { color: 'text-gray-400', bg: 'bg-gray-400/10 border-gray-400/20' };

  const completedSubtasks = task.subtasks.filter(s => s.completed).length;

  return (
    <div 
      draggable 
      onDragStart={handleDragStart}
      onClick={onClick}
      className={`bg-surface border border-border p-3 rounded-lg hover:border-textMuted transition-all shadow-sm active:cursor-grabbing cursor-grab group hover:translate-y-[-2px] ${task.isTimerRunning ? 'border-l-2 border-l-green-500' : ''}`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${priorityConfig.bg} ${priorityConfig.color}`}>
          {task.priority}
        </span>
        {task.isTimerRunning && <span className="text-[10px] text-green-400 animate-pulse flex items-center gap-1"><Clock size={10}/> Running</span>}
      </div>
      
      <h4 className="font-medium text-text text-sm leading-tight mb-2">{task.title}</h4>
      
      <div className="flex items-center justify-between text-xs text-textMuted mt-3">
         <div className="flex items-center gap-2">
           {task.subtasks.length > 0 && (
             <span className={`flex items-center gap-1 ${completedSubtasks === task.subtasks.length ? 'text-green-500' : ''}`}>
               <CheckSquare size={12}/> {completedSubtasks}/{task.subtasks.length}
             </span>
           )}
           {task.dueDate && <span className="text-[10px] flex items-center gap-0.5 text-orange-400"><Clock size={10}/> {new Date(task.dueDate).getDate()}/{new Date(task.dueDate).getMonth()+1}</span>}
         </div>
      </div>
    </div>
  );
};
