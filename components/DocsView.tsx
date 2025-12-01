
import React, { useState, useEffect } from 'react';
import { DocFile, Project } from '../types';
import { FileText, Plus, Trash2, Save, FileCode, Folder, ChevronRight, ChevronDown, AlertCircle, FolderPlus, FolderOpen, Paperclip } from './Icons';

declare const marked: any;

interface Props {
    project: Project;
    onSaveFile: (file: DocFile) => void;
    onDeleteFile: (fileId: string) => void;
    showToast: (msg: string) => void;
}

export const DocsView: React.FC<Props> = ({ project, onSaveFile, onDeleteFile, showToast }) => {
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [mode, setMode] = useState<'EDIT' | 'PREVIEW'>('PREVIEW');
    const [fileName, setFileName] = useState('');
    const [filePath, setFilePath] = useState('/');
    const [isDirty, setIsDirty] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));

    // Initialize selection
    useEffect(() => {
        if (!selectedFileId && project.files.length > 0) {
            setSelectedFileId(project.files[0].id);
        }
    }, [project.files, selectedFileId]);

    const selectedFile = project.files.find(f => f.id === selectedFileId);

    // Sync state
    useEffect(() => {
        if (selectedFile) {
            setEditContent(selectedFile.content);
            setFileName(selectedFile.name);
            setFilePath(selectedFile.path || '/');
            setMode('PREVIEW');
            setIsDirty(false);
        } else {
            setEditContent('');
            setFileName('');
        }
    }, [selectedFileId]);

    const handleSave = () => {
        if (!selectedFileId || !selectedFile) return;
        onSaveFile({ ...selectedFile, content: editContent, name: fileName, path: filePath });
        setIsDirty(false);
        showToast('File saved successfully');
    };

    const handleCreateFile = () => {
        const fullPath = prompt("Enter file name (e.g. docs/api.md or just readme.md):", "untitled.md");
        if (!fullPath) return;

        const parts = fullPath.split('/');
        const name = parts.pop() || 'untitled.md';
        const path = parts.length > 0 ? '/' + parts.join('/') : '/';
        
        const ext = name.split('.').pop();
        const fileType = (['md', 'json', 'txt'].includes(ext || '') ? ext : 'md') as 'md' | 'json' | 'txt';

        const newFile: DocFile = {
            id: `f-${Date.now()}`,
            name: name,
            type: fileType,
            content: `# ${name}\n\nStart writing...`,
            path: path
        };
        onSaveFile(newFile);
        setTimeout(() => {
            setSelectedFileId(newFile.id);
            setMode('EDIT');
            setExpandedFolders(prev => new Set(prev).add(path));
        }, 100);
    };

    const handleImportFile = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = (e: any) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.readAsText(file);
            reader.onload = (re) => {
                const content = re.target?.result as string;
                const newFile: DocFile = {
                    id: `f-${Date.now()}`,
                    name: file.name,
                    type: 'txt',
                    content: content,
                    path: '/'
                };
                onSaveFile(newFile);
                showToast("File imported");
            };
        };
        input.click();
    };

    const toggleFolder = (path: string) => {
        const newSet = new Set(expandedFolders);
        if (newSet.has(path)) newSet.delete(path);
        else newSet.add(path);
        setExpandedFolders(newSet);
    };

    // Group files by folder
    const fileTree: Record<string, DocFile[]> = {};
    project.files.forEach(f => {
        const p = f.path || '/';
        if (!fileTree[p]) fileTree[p] = [];
        fileTree[p].push(f);
    });

    const sortedPaths = Object.keys(fileTree).sort();

    return (
        <div className="h-full flex bg-[#0c0c0e]">
            {/* Sidebar */}
            <div className="w-64 border-r border-border bg-surface flex flex-col shrink-0">
                <div className="p-4 border-b border-border flex justify-between items-center bg-surfaceHighlight/10">
                    <span className="text-xs font-bold text-textMuted uppercase flex items-center gap-2">
                        <FolderOpen size={14}/> Explorer
                    </span>
                    <div className="flex gap-1">
                        <button onClick={handleImportFile} className="text-textMuted hover:text-text hover:bg-surfaceHighlight p-1.5 rounded transition-colors" title="Import File">
                            <Paperclip size={14}/>
                        </button>
                        <button onClick={handleCreateFile} className="text-primary hover:bg-primary/10 p-1.5 rounded transition-colors" title="New File">
                            <Plus size={16}/>
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {sortedPaths.map(path => {
                        const isRoot = path === '/';
                        const folderName = isRoot ? 'root' : path.split('/').pop();
                        const isOpen = expandedFolders.has(path);

                        return (
                            <div key={path}>
                                {!isRoot && (
                                    <div 
                                        onClick={() => toggleFolder(path)}
                                        className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-textMuted hover:text-text cursor-pointer hover:bg-surfaceHighlight rounded"
                                    >
                                        {isOpen ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
                                        <Folder size={12} className="text-yellow-500/70"/> {folderName}
                                    </div>
                                )}
                                {(isOpen || isRoot) && (
                                    <div className={`${!isRoot ? 'pl-4' : ''}`}>
                                        {fileTree[path].map(f => (
                                            <div 
                                                key={f.id}
                                                onClick={() => {
                                                    if (isDirty && !confirm("Unsaved changes. Discard?")) return;
                                                    setSelectedFileId(f.id);
                                                }}
                                                className={`flex items-center justify-between px-3 py-1.5 rounded text-sm cursor-pointer group transition-all border border-transparent mb-0.5 ${selectedFileId === f.id ? 'bg-primary/10 text-primary border-primary/20' : 'text-text hover:bg-surfaceHighlight'}`}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    {f.type === 'json' ? <FileCode size={13} className="opacity-70"/> : <FileText size={13} className="opacity-70"/>}
                                                    <span className="truncate text-xs">{f.name}</span>
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); if(confirm("Delete?")) onDeleteFile(f.id); }} className="opacity-0 group-hover:opacity-100 text-textMuted hover:text-red-500 p-1">
                                                    <Trash2 size={12}/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {selectedFile ? (
                    <>
                        <div className="h-12 border-b border-border bg-surface/50 flex items-center justify-between px-4 gap-4">
                            <div className="flex items-center gap-2 flex-1 text-xs text-textMuted">
                                <span>{selectedFile.path || '/'}</span> /
                                <input 
                                    value={fileName}
                                    onChange={e => { setFileName(e.target.value); setIsDirty(true); }}
                                    className="bg-transparent font-bold text-text outline-none border-b border-transparent focus:border-border transition-colors min-w-[100px]"
                                />
                                {isDirty && <span className="text-yellow-500 flex items-center gap-1"><AlertCircle size={10}/></span>}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex bg-surfaceHighlight rounded-lg p-0.5 border border-border">
                                    <button onClick={() => setMode('EDIT')} className={`px-3 py-1 text-[10px] rounded-md transition-all ${mode === 'EDIT' ? 'bg-background text-text shadow-sm' : 'text-textMuted hover:text-text'}`}>Edit</button>
                                    <button onClick={() => setMode('PREVIEW')} className={`px-3 py-1 text-[10px] rounded-md transition-all ${mode === 'PREVIEW' ? 'bg-background text-text shadow-sm' : 'text-textMuted hover:text-text'}`}>Preview</button>
                                </div>
                                <button onClick={handleSave} className={`px-3 py-1.5 text-[10px] rounded-lg font-medium flex items-center gap-1 transition-all ${isDirty ? 'bg-primary text-white' : 'bg-surfaceHighlight text-textMuted'}`}>
                                    <Save size={12}/> Save
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden relative">
                            {mode === 'EDIT' ? (
                                <textarea 
                                    value={editContent}
                                    onChange={e => { setEditContent(e.target.value); setIsDirty(true); }}
                                    className="w-full h-full bg-[#0d1117] p-8 text-sm font-mono text-gray-300 outline-none resize-none leading-relaxed custom-scrollbar"
                                    spellCheck={false}
                                />
                            ) : (
                                <div className="w-full h-full p-8 overflow-y-auto markdown-body custom-scrollbar bg-[#0d1117]">
                                    {selectedFile.type === 'json' ? <pre><code>{editContent}</code></pre> : <div dangerouslySetInnerHTML={{ __html: marked.parse(editContent) }} />}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-textMuted bg-[#0d1117]">
                        <FileText size={40} className="opacity-20 mb-2"/>
                        <p className="text-xs">Select or create a file</p>
                    </div>
                )}
            </div>
        </div>
    );
};
