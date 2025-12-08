import React, { useState, useEffect } from 'react';
import { X, FileText, Folder } from './Icons';

type OperationType = 'CREATE_FILE' | 'CREATE_FOLDER' | 'RENAME' | 'DELETE' | 'CONNECT_REPO';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string, type?: 'file' | 'folder') => void;
  operation: OperationType;
  initialName?: string;
  targetName?: string; // For delete/rename messages
}

export const FileOperationModal: React.FC<Props> = ({ 
  isOpen, onClose, onConfirm, operation, initialName = '', targetName = '' 
}) => {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    setName(initialName);
  }, [initialName, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(name);
    onClose();
  };

  const getTitle = () => {
    switch (operation) {
      case 'CREATE_FILE': return 'New File';
      case 'CREATE_FOLDER': return 'New Folder';
      case 'RENAME': return 'Rename Item';
      case 'DELETE': return 'Delete Item';
      case 'CONNECT_REPO': return 'Connect GitHub Repo';
      default: return 'Operation';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border bg-surfaceHighlight/10">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            {operation === 'CREATE_FILE' && <FileText size={16} />}
            {operation === 'CREATE_FOLDER' && <Folder size={16} />}
            {getTitle()}
          </h3>
          <button onClick={onClose} className="text-textMuted hover:text-text transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          {operation === 'DELETE' ? (
             <p className="text-sm text-textMuted">
               Are you sure you want to delete <strong className="text-text">{targetName}</strong>? 
               <br/>This action cannot be undone.
             </p>
          ) : operation === 'CONNECT_REPO' ? (
              <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-textMuted uppercase">Repository URL</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="https://github.com/username/repo"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text focus:border-primary outline-none transition-all"
                  />
                  <p className="text-[10px] text-textMuted">Currently adds a visual link. Sync coming soon.</p>
              </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-textMuted uppercase">Name</label>
              <input 
                autoFocus
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={operation === 'CREATE_FOLDER' ? "e.g. components" : "e.g. readme.md"}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text focus:border-primary outline-none transition-all"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 mt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-textMuted hover:text-text hover:bg-surfaceHighlight rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className={`px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-all shadow-sm flex items-center gap-1 ${operation === 'DELETE' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primaryHover'}`}
            >
              {operation === 'DELETE' ? 'Delete' : operation === 'CONNECT_REPO' ? 'Connect' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
