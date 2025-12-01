
import React, { useState } from 'react';
import { X, Tag, Plus } from './Icons';
import { Project, DefaultStatus, Language } from '../types';
import { translations } from '../lib/translations';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
  language: Language;
}

export const ProjectCreateModal: React.FC<Props> = ({ isOpen, onClose, onSave, language }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
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
      files: [{ id: `f-${timestamp}`, name: 'README.md', type: 'md', content: `# ${name}\n\n${description}` }],
      columns: [
        { id: DefaultStatus.TODO, title: 'To Do', color: 'border-slate-500' },
        { id: DefaultStatus.IN_PROGRESS, title: 'In Progress', color: 'border-blue-500' },
        { id: DefaultStatus.DONE, title: 'Done', color: 'border-green-500' }
      ],
      tags,
      relatedProjectIds: [],
      threads: [],
      createdAt: timestamp,
      updatedAt: timestamp
    };

    onSave(newProject);
    onClose();
    setName('');
    setDescription('');
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
      <div className="bg-surface border border-border w-full max-w-lg rounded-xl shadow-2xl flex flex-col">
        
        <div className="flex justify-between items-center p-5 border-b border-border">
          <h2 className="text-xl font-semibold text-text">{t.createProject}</h2>
          <button onClick={onClose} className="text-textMuted hover:text-text p-1 rounded-full hover:bg-surfaceHighlight">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-textMuted uppercase mb-2">{t.projectName}</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., AI Chatbot Integration"
              autoFocus
              className="w-full bg-background border border-border rounded-lg p-3 text-text outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-textMuted uppercase mb-2">{t.description}</label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Briefly describe the goals..."
              rows={4}
              className="w-full bg-background border border-border rounded-lg p-3 text-text outline-none focus:border-primary resize-none"
            />
          </div>

          <div>
             <label className="block text-xs font-bold text-textMuted uppercase mb-2">{t.tags}</label>
             <div className="flex items-center gap-2 mb-2">
                <input 
                  type="text" 
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTag()}
                  placeholder="Add tag..."
                  className="flex-1 bg-background border border-border rounded-lg p-2 text-sm text-text outline-none"
                />
                <button onClick={addTag} className="bg-surfaceHighlight hover:bg-border text-text p-2 rounded-lg">
                  <Plus size={16}/>
                </button>
             </div>
             <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span key={tag} className="bg-primary/20 text-primary text-xs px-2 py-1 rounded flex items-center gap-1">
                    {tag}
                    <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-white"><X size={12}/></button>
                  </span>
                ))}
             </div>
          </div>
        </div>

        <div className="p-5 border-t border-border flex justify-end gap-3 bg-surfaceHighlight/20 rounded-b-xl">
          <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-medium text-textMuted hover:text-text hover:bg-surfaceHighlight transition-colors">
            {t.cancel}
          </button>
          <button 
            onClick={handleSave} 
            disabled={!name.trim()}
            className="px-6 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primaryHover shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t.create}
          </button>
        </div>

      </div>
    </div>
  );
};