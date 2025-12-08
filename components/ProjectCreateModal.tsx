
import React, { useState } from 'react';
import { X, Tag, Plus, Github } from './Icons';
import { Project, DefaultStatus, Language } from '../types';
import { translations } from '../lib/translations';
import { GitHubRepoSelector } from './GitHubRepoSelector';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
  language: Language;
}

export const ProjectCreateModal: React.FC<Props> = ({ isOpen, onClose, onSave, language }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [token, setToken] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  
  const t = translations[language];

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) return;

    const timestamp = Date.now();
    const newProject: Project = {
      id: `p-${timestamp}`,
      name,
      description,
      status: 'ACTIVE',
      files: [{ id: `f-${timestamp}`, name: 'README.md', kind: 'file', type: 'md', content: `# ${name}\n\n${description}`, path: '/', source: 'local' }],
      columns: [
        { id: DefaultStatus.TODO, title: 'To Do', color: 'border-slate-500' },
        { id: DefaultStatus.IN_PROGRESS, title: 'In Progress', color: 'border-blue-500' },
        { id: DefaultStatus.DONE, title: 'Done', color: 'border-green-500' }
      ],
      tags,
      relatedProjectIds: [],
      threads: [],
      githubRepo: repo.trim(),
      githubBranch: branch.trim(),
      githubToken: token.trim(),
      createdAt: timestamp,
      updatedAt: timestamp
    };

    onSave(newProject);
    onClose();
    setName('');
    setDescription('');
    setRepo('');
    setToken('');
    setTags([]);
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-surface border border-border w-full max-w-2xl rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        <div className="flex justify-between items-center p-5 border-b border-border bg-surfaceHighlight/5">
          <h2 className="text-xl font-semibold text-text flex items-center gap-2">
              <div className="w-2 h-6 bg-primary rounded-full"></div>
              {t.createProject}
          </h2>
          <button onClick={onClose} className="text-textMuted hover:text-text p-1.5 rounded-lg hover:bg-surfaceHighlight transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[70vh]">
          {/* Left Column: Basic Info */}
          <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-textMuted uppercase mb-2">{t.projectName} <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., AI Chatbot Integration"
                  autoFocus
                  className="w-full bg-background border border-border rounded-lg p-3 text-text outline-none focus:border-primary transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-textMuted uppercase mb-2">{t.description}</label>
                <textarea 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Briefly describe the goals and scope..."
                  rows={6}
                  className="w-full bg-background border border-border rounded-lg p-3 text-text outline-none focus:border-primary resize-none custom-scrollbar transition-colors"
                />
              </div>
          </div>

          {/* Right Column: Context & Integrations */}
          <div className="space-y-5">
              {/* GitHub Integration */}
              <GitHubRepoSelector 
                repo={repo}
                branch={branch}
                token={token}
                onRepoChange={setRepo}
                onBranchChange={setBranch}
                onTokenChange={setToken}
              />

              <div>
                 <label className="block text-xs font-bold text-textMuted uppercase mb-2">{t.tags}</label>
                 <div className="flex items-center gap-2 mb-2">
                    <input 
                      type="text" 
                      value={newTag}
                      onChange={e => setNewTag(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addTag()}
                      placeholder="Add tag..."
                      className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors"
                    />
                    <button onClick={addTag} className="bg-surfaceHighlight hover:bg-border text-text p-2 rounded-lg transition-colors">
                      <Plus size={16}/>
                    </button>
                 </div>
                 <div className="flex flex-wrap gap-2 min-h-[40px]">
                    {tags.map(tag => (
                      <span key={tag} className="bg-primary/10 text-primary border border-primary/20 text-xs px-2 py-1 rounded flex items-center gap-1 animate-fade-in">
                        {tag}
                        <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-white transition-colors"><X size={12}/></button>
                      </span>
                    ))}
                 </div>
              </div>
          </div>
        </div>

        <div className="p-5 border-t border-border flex justify-end gap-3 bg-surfaceHighlight/10">
          <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-medium text-textMuted hover:text-text hover:bg-surfaceHighlight transition-colors">
            {t.cancel}
          </button>
          <button 
            onClick={handleSave} 
            disabled={!name.trim()}
            className="px-6 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primaryHover shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {t.create}
          </button>
        </div>

      </div>
    </div>
  );
};