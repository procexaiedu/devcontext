
import React, { useState } from 'react';
import { Project, Task, Language } from '../types';
import { ProjectCard } from './ProjectCard';
import { Search, Plus, Archive } from './Icons';
import { translations } from '../lib/translations';

interface Props {
  projects: Project[];
  tasks: Task[];
  onSelectProject: (id: string) => void;
  onAddProject: () => void;
  language: Language;
}

export const ProjectsListView: React.FC<Props> = ({ projects, tasks, onSelectProject, onAddProject, language }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const t = translations[language];

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = showArchived ? p.status === 'ARCHIVED' : p.status !== 'ARCHIVED';
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in pb-20 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text mb-2">{t.projectsList}</h1>
          <p className="text-textMuted">Manage your development portfolio</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative group flex-1 md:w-64">
             <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted group-focus-within:text-primary transition-colors"/>
             <input 
               type="text" 
               placeholder={t.search}
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
             />
          </div>
          <button 
            onClick={() => setShowArchived(!showArchived)}
            className={`p-2.5 rounded-xl border border-border text-textMuted hover:text-text hover:bg-surfaceHighlight transition-colors ${showArchived ? 'bg-primary/20 text-primary border-primary/30' : ''}`}
            title={showArchived ? t.hideArchived : t.showArchived}
          >
            <Archive size={20}/>
          </button>
          <button 
            onClick={onAddProject}
            className="bg-primary hover:bg-primaryHover text-white px-5 py-2.5 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 font-medium transition-all"
          >
            <Plus size={18}/> <span className="hidden md:inline">{t.newProject}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
          {filteredProjects.map(p => (
            <ProjectCard key={p.id} project={p} tasks={tasks} onClick={() => onSelectProject(p.id)} />
          ))}
          {filteredProjects.length === 0 && (
            <div className="col-span-full py-20 text-center text-textMuted border-2 border-dashed border-border rounded-xl bg-surface/30">
              <p className="text-lg mb-2">{t.noProjects}</p>
              <button onClick={onAddProject} className="text-primary hover:underline">{t.createProject}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
