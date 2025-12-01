import React from 'react';
import { Project, Task, DefaultStatus } from '../types';
import { ArrowRight, Clock } from './Icons';

interface Props {
  project: Project;
  tasks: Task[];
  onClick: () => void;
}

export const ProjectCard: React.FC<Props> = ({ project, tasks, onClick }) => {
  const projectTasks = tasks.filter(t => t.projectId === project.id);
  const done = projectTasks.filter(t => t.status === DefaultStatus.DONE).length;
  const total = projectTasks.length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div 
      onClick={onClick}
      className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
            {project.name}
          </h3>
          <p className="text-sm text-slate-500 mt-1 line-clamp-2 h-10">
            {project.description}
          </p>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          project.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
        }`}>
          {project.status}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center text-xs text-slate-500 gap-4">
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {new Date(project.createdAt).toLocaleDateString()}
          </span>
          <span>{projectTasks.length} Tasks</span>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs font-medium text-slate-600">{progress}% Complete</span>
          <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
        </div>
      </div>
    </div>
  );
};