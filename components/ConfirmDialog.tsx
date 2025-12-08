import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export const ConfirmDialog: React.FC<Props> = ({ 
  isOpen, onClose, onConfirm, title, message, 
  confirmLabel = 'Confirm', cancelLabel = 'Cancel', isDestructive = false 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-border w-full max-w-md rounded-xl shadow-2xl p-6 transform scale-100 transition-all">
        <div className="flex items-start gap-4 mb-4">
          <div className={`p-3 rounded-full ${isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text mb-1">{title}</h3>
            <p className="text-sm text-textMuted leading-relaxed">{message}</p>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-textMuted hover:text-text hover:bg-surfaceHighlight transition-colors"
          >
            {cancelLabel}
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white shadow-lg transition-all transform active:scale-95 ${
              isDestructive 
                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' 
                : 'bg-primary hover:bg-primaryHover shadow-primary/20'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
