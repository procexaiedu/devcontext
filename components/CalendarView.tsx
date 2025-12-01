
import React, { useState } from 'react';
import { Task, Project } from '../types';
import { ChevronLeft, ChevronRight, Clock, AlertCircle } from './Icons';

interface Props {
  project?: Project; // If null, global calendar
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export const CalendarView: React.FC<Props> = ({ project, tasks, onTaskClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const tasksByDay: { [key: number]: Task[] } = {};

  tasks.forEach(task => {
      // Logic: Show task on Due Date. If start date exists, could span, but keeping simple: Due Date focus.
      if (task.dueDate) {
          const d = new Date(task.dueDate);
          if (d.getMonth() === month && d.getFullYear() === year) {
              const day = d.getDate();
              if (!tasksByDay[day]) tasksByDay[day] = [];
              tasksByDay[day].push(task);
          }
      }
  });

  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const slots = [...blanks, ...days];

  return (
    <div className="h-full flex flex-col bg-background p-6">
       {/* Header */}
       <div className="flex justify-between items-center mb-6">
           <div className="flex items-center gap-4">
               <h2 className="text-2xl font-bold text-text">{monthNames[month]} {year}</h2>
               <div className="flex bg-surface border border-border rounded-lg">
                   <button onClick={prevMonth} className="p-2 hover:bg-surfaceHighlight text-textMuted hover:text-text rounded-l-lg"><ChevronLeft size={18}/></button>
                   <button onClick={nextMonth} className="p-2 hover:bg-surfaceHighlight text-textMuted hover:text-text rounded-r-lg"><ChevronRight size={18}/></button>
               </div>
           </div>
           <button onClick={() => setCurrentDate(new Date())} className="text-xs font-bold text-primary hover:underline">Today</button>
       </div>

       {/* Grid */}
       <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden flex-1 border border-border">
           {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
               <div key={day} className="bg-surfaceHighlight/30 p-3 text-center text-xs font-bold text-textMuted uppercase">
                   {day}
               </div>
           ))}
           
           {slots.map((day, idx) => (
               <div key={idx} className={`bg-surface min-h-[100px] p-2 flex flex-col transition-colors hover:bg-surfaceHighlight/10 ${!day ? 'bg-surfaceHighlight/5' : ''}`}>
                   {day && (
                       <>
                           <span className={`text-sm font-medium mb-2 w-6 h-6 flex items-center justify-center rounded-full ${
                               day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear() 
                               ? 'bg-primary text-white' 
                               : 'text-textMuted'
                           }`}>
                               {day}
                           </span>
                           <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
                               {tasksByDay[day as number]?.map(task => (
                                   <div 
                                      key={task.id} 
                                      onClick={() => onTaskClick(task)}
                                      className={`text-[10px] p-1.5 rounded border truncate cursor-pointer transition-transform hover:scale-105 ${
                                          task.status === 'DONE' ? 'bg-green-500/10 border-green-500/20 text-green-400 line-through opacity-60' : 
                                          task.priority === 'HIGH' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                          'bg-surfaceHighlight border-border text-text'
                                      }`}
                                   >
                                       {task.title}
                                   </div>
                               ))}
                           </div>
                       </>
                   )}
               </div>
           ))}
       </div>
    </div>
  );
};
