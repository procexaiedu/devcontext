
import React, { useState, useEffect } from 'react';
import { Project, KanbanColumn } from '../types';
import { X, Save, Trash2, Archive, AlertCircle, Plus, GripVertical } from 'lucide-react';
import { GitHubRepoSelector } from './GitHubRepoSelector';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onUpdate: (project: Project) => void;
  onDelete: (projectId: string) => void;
}

export const ProjectSettingsModal: React.FC<Props> = ({ isOpen, onClose, project, onUpdate, onDelete }) => {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [status, setStatus] = useState(project.status);
  const [repo, setRepo] = useState(project.githubRepo || '');
  const [branch, setBranch] = useState(project.githubBranch || 'main');
  const [token, setToken] = useState(project.githubToken || '');
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setName(project.name);
    setDescription(project.description);
    setStatus(project.status);
    setRepo(project.githubRepo || '');
    setBranch(project.githubBranch || 'main');
    setToken(project.githubToken || '');
    setColumns(project.columns || []);
    setConfirmDelete(false);
  }, [project, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdate({
      ...project,
      name,
      description,
      status,
      columns,
      githubRepo: repo,
      githubBranch: branch,
      githubToken: token,
      updatedAt: Date.now()
    });
    onClose();
  };

  const updateColumn = (id: string, key: keyof KanbanColumn, val: string) => {
      setColumns(columns.map(c => c.id === id ? { ...c, [key]: val } : c));
  };

  const addColumn = () => {
      const id = `col-${Date.now()}`;
      setColumns([...columns, { id, title: 'New Column', color: 'border-slate-500' }]);
  };

  const removeColumn = (id: string) => {
      if (confirm("Deleting a column might hide tasks assigned to it. Continue?")) {
        setColumns(columns.filter(c => c.id !== id));
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-surface border border-border w-full max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-border">
          <h2 className="text-xl font-semibold text-text">Project Settings</h2>
          <button onClick={onClose} className="text-textMuted hover:text-text p-1 rounded-full hover:bg-surfaceHighlight transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Basic Info */}
          <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-textMuted uppercase mb-1">Project Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-background border border-border rounded-lg p-3 text-text outline-none focus:border-primary"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-textMuted uppercase mb-1">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full bg-background border border-border rounded-lg p-3 text-text outline-none resize-none"/>
              </div>
          </div>

          {/* GitHub Integration */}
          <GitHubRepoSelector 
            repo={repo}
            branch={branch}
            token={token}
            onRepoChange={setRepo}
            onBranchChange={setBranch}
            onTokenChange={setToken}
          />

          {/* Kanban Columns */}
          <div className="border-t border-border pt-4">
              <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-text">Kanban Columns</h3>
                  <button onClick={addColumn} className="text-xs text-primary flex items-center gap-1 hover:underline"><Plus size={12}/> Add Column</button>
              </div>
              <div className="space-y-2">
                  {columns.map((col, idx) => (
                      <div key={col.id} className="flex items-center gap-2 bg-background p-2 rounded border border-border">
                          <GripVertical size={16} className="text-textMuted cursor-grab"/>
                          <input 
                            type="text" 
                            value={col.title} 
                            onChange={e => updateColumn(col.id, 'title', e.target.value)} 
                            className="flex-1 bg-transparent text-sm text-text outline-none"
                          />
                          <div className="w-4 h-4 rounded-full border border-current opacity-50" style={{ color: col.color.replace('border-', '').replace('-500', '') }}></div>
                          <button onClick={() => removeColumn(col.id)} className="text-textMuted hover:text-red-500"><Trash2 size={14}/></button>
                      </div>
                  ))}
              </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-6 border-t border-border mt-4">
             <h3 className="text-sm font-semibold text-red-400 mb-4">Danger Zone</h3>
             <div className="flex flex-col gap-3">
                <button onClick={() => setStatus(status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED')} className="flex items-center justify-between px-4 py-3 bg-surfaceHighlight/30 border border-border rounded-lg hover:border-textMuted transition-colors group">
                   <div className="flex items-center gap-3">
                      <Archive size={18} className="text-textMuted group-hover:text-text"/>
                      <div className="text-left">
                        <span className="block text-sm font-medium text-text">{status === 'ARCHIVED' ? 'Restore Project' : 'Archive Project'}</span>
                        <span className="block text-xs text-textMuted">{status === 'ARCHIVED' ? 'Move back to active' : 'Hide from dashboard'}</span>
                      </div>
                   </div>
                </button>
                {!confirmDelete ? (
                   <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-4 py-3 rounded-lg text-sm transition-colors border border-transparent hover:border-red-500/20">
                     <Trash2 size={16} /> Delete Project
                   </button>
                ) : (
                   <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      <span className="text-sm text-red-200">Really delete?</span>
                      <button onClick={() => onDelete(project.id)} className="px-3 py-1 bg-red-500 text-white rounded text-xs font-bold">Confirm</button>
                   </div>
                )}
             </div>
          </div>
        </div>

        <div className="p-5 border-t border-border flex justify-end gap-3 bg-surfaceHighlight/20 rounded-b-xl">
          <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-medium text-textMuted hover:text-text">Cancel</button>
          <button onClick={handleSave} className="px-6 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primaryHover shadow-lg flex items-center gap-2"><Save size={16} /> Save Changes</button>
        </div>
      </div>
    </div>
  );
};
