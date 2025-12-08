
import React, { useState, useEffect, useMemo } from 'react';
import { DocFile, Project } from '../types';
import { 
  FileText, Plus, Trash2, Save, FileCode, Folder, 
  ChevronRight, ChevronDown, AlertCircle, FolderPlus, 
  FolderOpen, Paperclip, Globe, Edit2, MoreVertical 
} from './Icons';
import { FileOperationModal } from './FileOperationModal';
import { Github } from 'lucide-react';
import * as GitHubService from '../services/github';

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
    const [isDirty, setIsDirty] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));
    
    // GitHub State
    const [githubFiles, setGithubFiles] = useState<DocFile[]>([]);
    const [isLoadingGithub, setIsLoadingGithub] = useState(false);

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [modalOp, setModalOp] = useState<'CREATE_FILE' | 'CREATE_FOLDER' | 'RENAME' | 'DELETE' | 'CONNECT_REPO'>('CREATE_FILE');
    const [targetItem, setTargetItem] = useState<DocFile | null>(null); // For rename/delete
    const [targetPath, setTargetPath] = useState<string>('/'); // For creation

    // Drag & Drop State
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

    // Load GitHub Tree
    useEffect(() => {
        if (project.githubRepo) {
            setIsLoadingGithub(true);
            const [owner, repo] = project.githubRepo.split('/');
            GitHubService.fetchRepoTree(owner, repo, project.githubBranch || 'main', project.githubToken)
                .then(tree => {
                    const mappedFiles: DocFile[] = tree.map(item => {
                         const parts = item.path.split('/');
                         const name = parts.pop() || '';
                         const folderPath = parts.length > 0 ? '/' + parts.join('/') : '/';
                         
                         return {
                             id: `gh-${item.sha}`,
                             name: name,
                             kind: item.type === 'tree' ? 'folder' : 'file',
                             type: name.endsWith('.json') ? 'json' : 'txt', // Simplified
                             content: '', // Loaded on demand
                             path: folderPath,
                             source: 'github',
                             sha: item.sha
                         };
                    });
                    setGithubFiles(mappedFiles);
                })
                .catch(err => {
                    console.error(err);
                    showToast('Failed to load GitHub repo');
                })
                .finally(() => setIsLoadingGithub(false));
        } else {
            setGithubFiles([]);
        }
    }, [project.githubRepo, project.githubBranch]);

    // Initialize selection
    useEffect(() => {
        if (!selectedFileId && project.files.length > 0) {
            const firstFile = project.files.find(f => f.kind === 'file');
            if (firstFile) setSelectedFileId(firstFile.id);
        }
    }, [project.files, selectedFileId]);

    // Unified File List (Local + GitHub)
    const allFiles = useMemo(() => [...project.files, ...githubFiles], [project.files, githubFiles]);

    const selectedFile = useMemo(() => 
        allFiles.find(f => f.id === selectedFileId), 
    [allFiles, selectedFileId]);

    // Sync editor state when selection changes
    useEffect(() => {
        if (selectedFile && selectedFile.kind === 'file') {
            if (selectedFile.source === 'github' && !selectedFile.content) {
                // Fetch content on demand
                setEditContent('Loading from GitHub...');
                const [owner, repo] = (project.githubRepo || '').split('/');
                // Construct full path from file path + name
                const fullPath = (selectedFile.path === '/' ? '' : selectedFile.path?.substring(1) + '/') + selectedFile.name;
                
                GitHubService.fetchFileContent(owner, repo, fullPath, project.githubBranch, project.githubToken)
                    .then(content => {
                         setEditContent(content);
                         // Update the local cache of the file content so we don't re-fetch immediately
                         setGithubFiles(prev => prev.map(f => f.id === selectedFile.id ? { ...f, content } : f));
                    })
                    .catch(err => setEditContent('Error loading content: ' + err.message));
                
                setFileName(selectedFile.name);
                setMode('PREVIEW'); // Default to preview for code
                setIsDirty(false);
            } else {
                setEditContent(selectedFile.content);
                setFileName(selectedFile.name);
                setMode(selectedFile.source === 'github' ? 'PREVIEW' : 'PREVIEW');
                setIsDirty(false);
            }
        } else {
            setEditContent('');
            setFileName('');
        }
    }, [selectedFileId, selectedFile]); 

    const handleSaveContent = () => {
        if (!selectedFileId || !selectedFile) return;
        if (selectedFile.source === 'github') {
            showToast('Cannot edit GitHub files directly yet.');
            return;
        }
        onSaveFile({ ...selectedFile, content: editContent, name: fileName });
        setIsDirty(false);
        showToast('File saved successfully');
    };

    // --- Modal Handlers ---
    const openCreateFile = (path: string) => {
        setTargetPath(path);
        setModalOp('CREATE_FILE');
        setModalOpen(true);
    };

    const openCreateFolder = (path: string) => {
        setTargetPath(path);
        setModalOp('CREATE_FOLDER');
        setModalOpen(true);
    };

    const openRename = (file: DocFile) => {
        setTargetItem(file);
        setModalOp('RENAME');
        setModalOpen(true);
    };

    const openDelete = (file: DocFile) => {
        setTargetItem(file);
        setModalOp('DELETE');
        setModalOpen(true);
    };

    const openConnectRepo = () => {
        setModalOp('CONNECT_REPO');
        setModalOpen(true);
    };

    const handleModalConfirm = (name: string) => {
        if (modalOp === 'DELETE' && targetItem) {
            onDeleteFile(targetItem.id);
            if (selectedFileId === targetItem.id) setSelectedFileId(null);
            showToast('Item deleted');
            return;
        }

        if (modalOp === 'RENAME' && targetItem) {
            onSaveFile({ ...targetItem, name });
            showToast('Renamed successfully');
            return;
        }

        if (modalOp === 'CONNECT_REPO') {
            // This is handled in Project Settings usually, but let's just toast for now
            // Or ideally, update the project via a callback props
            alert("To connect a repo, please go to Project Settings > Edit Project.");
            return;
        }

        // Creation logic
        const newId = `f-${Date.now()}`;
        const cleanName = name.trim();
        
        if (modalOp === 'CREATE_FILE') {
             const ext = cleanName.split('.').pop();
             const type = (['md', 'json', 'txt'].includes(ext || '') ? ext : 'md') as 'md' | 'json' | 'txt';
             const newFile: DocFile = {
                 id: newId,
                 name: cleanName,
                 kind: 'file',
                 type: type,
                 content: `# ${cleanName}\n\nStart writing...`,
                 path: targetPath,
                 source: 'local'
             };
             onSaveFile(newFile);
             setSelectedFileId(newId);
             setMode('EDIT');
             setExpandedFolders(prev => new Set(prev).add(targetPath));
        } else if (modalOp === 'CREATE_FOLDER') {
             const newFolder: DocFile = {
                 id: newId,
                 name: cleanName,
                 kind: 'folder',
                 type: 'txt', 
                 content: '', 
                 path: targetPath,
                 source: 'local'
             };
             onSaveFile(newFolder);
             setExpandedFolders(prev => new Set(prev).add(targetPath === '/' ? '/' + cleanName : targetPath + '/' + cleanName));
        }
    };

    // --- Drag & Drop ---
    const handleDragStart = (e: React.DragEvent, fileId: string) => {
        e.dataTransfer.setData('text/plain', fileId);
        setDraggedItemId(fileId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Allow drop
    };

    const handleDrop = (e: React.DragEvent, targetFolderPath: string) => {
        e.preventDefault();
        e.stopPropagation();
        const fileId = e.dataTransfer.getData('text/plain');
        const file = project.files.find(f => f.id === fileId); // Only move local files

        if (!file || file.path === targetFolderPath) return; 

        onSaveFile({ ...file, path: targetFolderPath });
        setDraggedItemId(null);
        showToast(`Moved to ${targetFolderPath}`);
    };


    // --- File Tree Logic ---
    const renderTreeItem = (currentPath: string, depth: number = 0) => {
        // Filter from unified list
        const items = allFiles.filter(f => f.path === currentPath);
        
        const sortedItems = items.sort((a, b) => {
            // Folders first
            if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
            // GitHub files last in same category? No, mix them alphabetically
            return a.name.localeCompare(b.name);
        });

        if (sortedItems.length === 0 && currentPath !== '/') return <div className="pl-6 text-[10px] text-textMuted italic">Empty</div>;

        return sortedItems.map(item => {
            const isFolder = item.kind === 'folder';
            const fullPath = currentPath === '/' ? '/' + item.name : currentPath + '/' + item.name;
            const isOpen = expandedFolders.has(fullPath);
            const isSelected = selectedFileId === item.id;
            const isGithub = item.source === 'github';

            return (
                <div 
                    key={item.id} 
                    className="select-none"
                    draggable={!isGithub} // Disable drag for github files for now
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onDragOver={(e) => isFolder ? handleDragOver(e) : undefined}
                    onDrop={(e) => isFolder && !isGithub ? handleDrop(e, fullPath) : undefined}
                >
                    <div 
                        className={`
                            group flex items-center justify-between px-2 py-1.5 rounded text-sm cursor-pointer transition-all mb-0.5 border border-transparent
                            ${isSelected ? 'bg-primary/10 text-primary border-primary/20' : 'text-textMuted hover:text-text hover:bg-surfaceHighlight'}
                            ${draggedItemId === item.id ? 'opacity-50' : ''}
                        `}
                        style={{ paddingLeft: `${depth * 12 + 8}px` }}
                        onClick={() => {
                            if (isFolder) {
                                const newSet = new Set(expandedFolders);
                                if (newSet.has(fullPath)) newSet.delete(fullPath);
                                else newSet.add(fullPath);
                                setExpandedFolders(newSet);
                            } else {
                                if (isDirty && !confirm("Unsaved changes. Discard?")) return;
                                setSelectedFileId(item.id);
                            }
                        }}
                    >
                        <div className="flex items-center gap-2 truncate flex-1">
                             {isFolder ? (
                                 <div className="flex items-center gap-1">
                                     {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                     <Folder size={14} className={isGithub ? "text-gray-500" : "text-yellow-500/80 fill-yellow-500/20"} />
                                 </div>
                             ) : (
                                 <div className="flex items-center gap-2">
                                     <span className="w-3"></span>
                                     {item.type === 'json' ? <FileCode size={14} /> : <FileText size={14} />}
                                 </div>
                             )}
                             <span className={`truncate text-xs font-medium ${isGithub ? 'opacity-80' : ''}`}>{item.name}</span>
                             {isGithub && <Globe size={10} className="text-textMuted" />}
                        </div>

                        {/* Context Actions (Hover) - Only for local files */}
                        {!isGithub && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {isFolder && (
                                    <>
                                        <button onClick={(e) => { e.stopPropagation(); openCreateFile(fullPath); }} className="p-1 hover:text-green-400" title="New File"><Plus size={12}/></button>
                                        <button onClick={(e) => { e.stopPropagation(); openCreateFolder(fullPath); }} className="p-1 hover:text-yellow-400" title="New Folder"><FolderPlus size={12}/></button>
                                    </>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); openRename(item); }} className="p-1 hover:text-blue-400" title="Rename"><Edit2 size={12}/></button>
                                <button onClick={(e) => { e.stopPropagation(); openDelete(item); }} className="p-1 hover:text-red-500" title="Delete"><Trash2 size={12}/></button>
                            </div>
                        )}
                    </div>
                    
                    {/* Recursive Children Rendering for Folders */}
                    {isFolder && isOpen && (
                        <div className="border-l border-border/50 ml-[calc(12px+8px)]">
                             {renderTreeItem(fullPath, depth + 1)}
                        </div>
                    )}
                </div>
            );
        });
    };

    return (
        <div className="h-full flex bg-[#0c0c0e]">
            {/* Sidebar */}
            <div className="w-72 border-r border-border bg-surface flex flex-col shrink-0">
                <div className="p-3 border-b border-border bg-surfaceHighlight/5 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-text uppercase flex items-center gap-2">
                            <FolderOpen size={14} className="text-primary"/> Explorer
                        </span>
                        <div className="flex gap-1">
                             <button onClick={openConnectRepo} className={`p-1.5 rounded transition-colors ${project.githubRepo ? 'text-green-500 bg-green-500/10' : 'text-textMuted hover:text-text hover:bg-surfaceHighlight'}`} title={project.githubRepo ? `Connected to ${project.githubRepo}` : "Connect Repo"}>
                                <Github size={14}/>
                             </button>
                             <button onClick={() => openCreateFolder('/')} className="p-1.5 text-textMuted hover:text-text hover:bg-surfaceHighlight rounded transition-colors" title="New Folder">
                                <FolderPlus size={14}/>
                             </button>
                             <button onClick={() => openCreateFile('/')} className="p-1.5 text-textMuted hover:text-text hover:bg-surfaceHighlight rounded transition-colors" title="New File">
                                <Plus size={14}/>
                             </button>
                        </div>
                    </div>
                    {isLoadingGithub && <div className="text-[10px] text-textMuted animate-pulse">Syncing GitHub...</div>}
                </div>

                {/* Root Drop Zone */}
                <div 
                    className="flex-1 overflow-y-auto p-2 custom-scrollbar"
                    onDragOver={(e) => handleDragOver(e)}
                    onDrop={(e) => handleDrop(e, '/')}
                >
                    {renderTreeItem('/')}
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative bg-background">
                {selectedFile && selectedFile.kind === 'file' ? (
                    <>
                        <div className="h-12 border-b border-border bg-surface/30 flex items-center justify-between px-4 gap-4">
                            <div className="flex items-center gap-2 flex-1 text-xs text-textMuted overflow-hidden">
                                <span className="opacity-50">{selectedFile.path === '/' ? 'root' : selectedFile.path}</span> 
                                <ChevronRight size={10}/>
                                {selectedFile.source === 'github' ? (
                                    <span className="font-bold text-text flex items-center gap-2">
                                        {selectedFile.name} <span className="text-[10px] bg-surfaceHighlight px-1.5 rounded border border-border font-normal opacity-70">Read-only</span>
                                    </span>
                                ) : (
                                    <>
                                        <input 
                                            value={fileName}
                                            onChange={e => { setFileName(e.target.value); setIsDirty(true); }}
                                            className="bg-transparent font-bold text-text outline-none border-b border-transparent focus:border-primary transition-colors min-w-[50px]"
                                        />
                                        {isDirty && <span className="text-yellow-500 flex items-center gap-1 animate-pulse"><AlertCircle size={10}/> Unsaved</span>}
                                    </>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex bg-surfaceHighlight rounded-lg p-0.5 border border-border">
                                    <button onClick={() => setMode('EDIT')} className={`px-3 py-1 text-[10px] rounded-md transition-all ${mode === 'EDIT' ? 'bg-background text-text shadow-sm' : 'text-textMuted hover:text-text'}`}>Code</button>
                                    <button onClick={() => setMode('PREVIEW')} className={`px-3 py-1 text-[10px] rounded-md transition-all ${mode === 'PREVIEW' ? 'bg-background text-text shadow-sm' : 'text-textMuted hover:text-text'}`}>Preview</button>
                                </div>
                                <button 
                                    onClick={handleSaveContent} 
                                    disabled={selectedFile.source === 'github'}
                                    className={`px-3 py-1.5 text-[10px] rounded-lg font-medium flex items-center gap-1 transition-all ${selectedFile.source === 'github' ? 'opacity-50 cursor-not-allowed bg-surfaceHighlight text-textMuted' : isDirty ? 'bg-primary text-white hover:bg-primaryHover' : 'bg-surfaceHighlight text-textMuted hover:text-text'}`}
                                >
                                    <Save size={12}/> Save
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden relative">
                            {mode === 'EDIT' ? (
                                <textarea 
                                    value={editContent}
                                    onChange={e => { setEditContent(e.target.value); setIsDirty(true); }}
                                    readOnly={selectedFile.source === 'github'}
                                    className="w-full h-full bg-[#0d1117] p-8 text-sm font-mono text-gray-300 outline-none resize-none leading-relaxed custom-scrollbar"
                                    spellCheck={false}
                                    placeholder="Type your documentation here..."
                                />
                            ) : (
                                <div className="w-full h-full p-8 overflow-y-auto markdown-body custom-scrollbar bg-[#0d1117]">
                                    {selectedFile.type === 'json' ? <pre><code>{editContent}</code></pre> : <div dangerouslySetInnerHTML={{ __html: marked.parse(editContent) }} />}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-textMuted bg-[#0c0c0e]">
                        <div className="w-20 h-20 bg-surfaceHighlight/50 rounded-full flex items-center justify-center mb-4">
                            <FileText size={40} className="opacity-20"/>
                        </div>
                        <p className="text-sm font-medium text-text">No file selected</p>
                        <p className="text-xs opacity-60 mt-1">Select a file from the explorer or create a new one.</p>
                        <button onClick={() => openCreateFile('/')} className="mt-4 px-4 py-2 bg-primary/10 text-primary text-xs rounded-lg hover:bg-primary/20 transition-colors">
                            Create New File
                        </button>
                    </div>
                )}
            </div>

            <FileOperationModal 
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onConfirm={handleModalConfirm}
                operation={modalOp}
                initialName={modalOp === 'RENAME' && targetItem ? targetItem.name : ''}
                targetName={targetItem ? targetItem.name : ''}
            />
        </div>
    );
};
