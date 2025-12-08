
import React, { useState, useEffect, useReducer } from 'react';
import { 
  AppData, Project, Task, ViewState, Priority, AppSettings, DocFile, DefaultStatus, Toast
} from './types';
import * as DB from './services/database'; 
import * as Storage from './services/storage'; 
import { ChatInterface } from './components/ChatInterface';
import { TaskModal } from './components/TaskModal';
import { ProjectSettingsModal } from './components/ProjectSettingsModal';
import { ProjectCreateModal } from './components/ProjectCreateModal';
import { SettingsView } from './components/SettingsView';
import { DashboardView } from './components/DashboardView';
import { ProjectsListView } from './components/ProjectsListView';
import { ProjectDetailView } from './components/ProjectDetailView';
import { ContextModal } from './components/ContextModal';
import { CalendarView } from './components/CalendarView';
import { 
  LayoutDashboard, Calendar, Settings, Bot, Copy, X, FolderOpen
} from './components/Icons';
import { translations } from './lib/translations';

declare const marked: any;

// --- ACTIONS & REDUCER ---
type Action = 
  | { type: 'INIT_DATA'; payload: AppData }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: Project }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'SAVE_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'MOVE_TASK'; payload: { taskId: string, newStatus: string } }
  | { type: 'SAVE_FILE'; payload: { projectId: string, file: DocFile } }
  | { type: 'DELETE_FILE'; payload: { projectId: string, fileId: string } }
  | { type: 'TICK_TIMERS' };

function appReducer(state: AppData, action: Action): AppData {
  let newState: AppData;
  switch (action.type) {
    case 'INIT_DATA':
      return action.payload;
    case 'ADD_PROJECT':
      newState = { ...state, projects: [...state.projects, action.payload] };
      DB.createProject(action.payload);
      return newState;
    case 'UPDATE_PROJECT':
      newState = {
        ...state,
        projects: state.projects.map(p => p.id === action.payload.id ? action.payload : p)
      };
      DB.updateProject(action.payload);
      return newState;
    case 'SAVE_FILE':
      newState = {
        ...state,
        projects: state.projects.map(p => {
            if (p.id !== action.payload.projectId) return p;
            const existingFileIndex = p.files.findIndex(f => f.id === action.payload.file.id);
            let newFiles = [...p.files];
            if (existingFileIndex >= 0) {
                newFiles[existingFileIndex] = { ...newFiles[existingFileIndex], ...action.payload.file };
            } else {
                newFiles.push(action.payload.file);
            }
            return { ...p, files: newFiles, updatedAt: Date.now() };
        })
      };
      DB.upsertFile(action.payload.projectId, action.payload.file);
      return newState;
    case 'DELETE_FILE':
      newState = {
        ...state,
        projects: state.projects.map(p => {
            if (p.id !== action.payload.projectId) return p;
            return { ...p, files: p.files.filter(f => f.id !== action.payload.fileId), updatedAt: Date.now() };
        })
      };
      DB.deleteFile(action.payload.fileId);
      return newState;
    case 'DELETE_PROJECT':
      newState = {
        ...state,
        projects: state.projects.filter(p => p.id !== action.payload),
        tasks: state.tasks.filter(t => t.projectId !== action.payload)
      };
      DB.deleteProject(action.payload);
      return newState;
    case 'SAVE_TASK':
      const exists = state.tasks.find(t => t.id === action.payload.id);
      if (exists) {
        newState = { ...state, tasks: state.tasks.map(t => t.id === action.payload.id ? action.payload : t) };
      } else {
        newState = { ...state, tasks: [...state.tasks, action.payload] };
      }
      DB.upsertTask(action.payload);
      return newState;
    case 'MOVE_TASK':
      const movedTask = state.tasks.find(t => t.id === action.payload.taskId);
      newState = {
        ...state,
        tasks: state.tasks.map(t => t.id === action.payload.taskId ? { ...t, status: action.payload.newStatus, updatedAt: Date.now() } : t)
      };
      if (movedTask) DB.upsertTask({ ...movedTask, status: action.payload.newStatus });
      return newState;
    case 'DELETE_TASK':
      newState = { ...state, tasks: state.tasks.filter(t => t.id !== action.payload) };
      DB.deleteTask(action.payload);
      return newState;
    case 'UPDATE_SETTINGS':
      newState = { ...state, settings: { ...state.settings, ...action.payload } };
      Storage.saveData(newState); 
      return newState;
    case 'TICK_TIMERS':
      newState = {
          ...state,
          tasks: state.tasks.map(t => t.isTimerRunning ? { ...t, timeSpent: (t.timeSpent || 0) + 1 } : t)
      };
      return newState;
    default:
      return state;
  }
}

export default function App() {
  // Lazy init to grab Storage immediately
  const [state, dispatch] = useReducer(appReducer, null, () => Storage.loadData()); 
  
  // Sync with DB if available
  useEffect(() => {
      DB.loadAppData().then(data => {
          if (data && data.projects.length !== state.projects.length) {
             dispatch({ type: 'INIT_DATA', payload: data });
          }
      });
  }, []);

  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [isProjectCreateOpen, setIsProjectCreateOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  const lang = state.settings.language || 'en';
  // Check translation availability
  const t = translations[lang] || translations['en'];

  useEffect(() => {
    const interval = setInterval(() => {
        dispatch({ type: 'TICK_TIMERS' });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (message: string, type: 'SUCCESS' | 'ERROR' | 'INFO' = 'INFO') => {
    const id = Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const currentProject = selectedProjectId ? state.projects.find(p => p.id === selectedProjectId) : null;
  const projectTasks = selectedProjectId ? state.tasks.filter(t => t.projectId === selectedProjectId) : [];

  const openTaskModal = (task?: Task) => {
    setEditingTask(task || null);
    setTaskModalOpen(true);
  };

  const saveTask = (partial: Partial<Task>) => {
    const defaultStatus = currentProject?.columns[0]?.id || 'TODO';
    
    const fullTask: Task = {
        ...partial,
        id: partial.id || `t-${Date.now()}`,
        projectId: partial.projectId!,
        title: partial.title!,
        description: partial.description || '',
        status: partial.status || defaultStatus,
        priority: partial.priority || Priority.MEDIUM,
        tags: partial.tags || [],
        subtasks: partial.subtasks || [],
        createdAt: partial.createdAt || Date.now(),
        updatedAt: Date.now(),
        timeSpent: partial.timeSpent || 0,
        isTimerRunning: partial.isTimerRunning || false
    } as Task;
    
    dispatch({ type: 'SAVE_TASK', payload: fullTask });
    showToast('Task saved', 'SUCCESS');
  };

  const handleCreateProject = (p: Project) => {
    dispatch({ type: 'ADD_PROJECT', payload: p });
    showToast('Project created successfully', 'SUCCESS');
  };

  return (
    <div className="flex h-screen bg-background text-text selection:bg-primary/30 font-sans">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-[80] flex flex-col gap-2 pointer-events-none">
          {toasts.map(t => (
              <div key={t.id} className={`pointer-events-auto px-4 py-3 rounded-lg shadow-xl border flex items-center gap-2 animate-fade-in bg-surface border-border text-text`}>
                  <span className="text-sm font-medium">{t.message}</span>
              </div>
          ))}
      </div>

      <aside className="w-16 md:w-20 bg-surface border-r border-border flex flex-col items-center py-6 gap-8 z-20 shadow-xl">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl cursor-pointer" onClick={() => { setView('DASHBOARD'); setSelectedProjectId(null); }}>D</div>
        <nav className="flex flex-col gap-4 w-full px-2">
            {[
                { id: 'DASHBOARD', icon: LayoutDashboard, label: t.dashboard },
                { id: 'PROJECTS_LIST', icon: FolderOpen, label: t.projects },
                { id: 'CALENDAR', icon: Calendar, label: t.calendar },
                { id: 'SETTINGS', icon: Settings, label: t.settings }
            ].map(item => (
                <button 
                    key={item.id}
                    onClick={() => { setView(item.id as ViewState); setSelectedProjectId(null); }}
                    className={`group w-full aspect-square rounded-xl flex items-center justify-center transition-all relative ${view === item.id && !selectedProjectId ? 'bg-primary text-white' : 'text-textMuted hover:text-text hover:bg-surfaceHighlight'}`}
                    title={item.label}
                >
                    <item.icon size={22} />
                </button>
            ))}
        </nav>
        <div className="mt-auto pb-4">
             <button onClick={() => setIsChatOpen(true)} className="w-12 h-12 rounded-xl flex items-center justify-center bg-surfaceHighlight text-white"><Bot size={24} /></button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {selectedProjectId && currentProject ? (
             <ProjectDetailView 
                project={currentProject}
                tasks={projectTasks}
                onBack={() => { setSelectedProjectId(null); setView('PROJECTS_LIST'); }}
                onOpenSettings={() => setIsProjectSettingsOpen(true)}
                onOpenContext={() => setIsContextModalOpen(true)}
                onMoveTask={(tid, status) => dispatch({ type: 'MOVE_TASK', payload: { taskId: tid, newStatus: status } })}
                onTaskClick={openTaskModal}
                onNewTask={() => { setEditingTask(null); setTaskModalOpen(true); }}
                onSaveFile={(f) => dispatch({ type: 'SAVE_FILE', payload: { projectId: currentProject.id, file: f } })}
                onDeleteFile={(fid) => dispatch({ type: 'DELETE_FILE', payload: { projectId: currentProject.id, fileId: fid } })}
                showToast={(msg) => showToast(msg, 'SUCCESS')}
             />
        ) : (
            <div className="flex-1 overflow-y-auto bg-[#0c0c0e]">
                {view === 'DASHBOARD' && (
                    <DashboardView 
                        state={state} 
                        showArchived={showArchived} 
                        setShowArchived={setShowArchived}
                        onAddProject={() => setIsProjectCreateOpen(true)}
                        onSelectProject={(id) => { setSelectedProjectId(id); setView('PROJECT_DETAIL'); }}
                    />
                )}
                {view === 'PROJECTS_LIST' && (
                  <ProjectsListView 
                    projects={state.projects}
                    tasks={state.tasks}
                    onSelectProject={(id) => { setSelectedProjectId(id); setView('PROJECT_DETAIL'); }}
                    onAddProject={() => setIsProjectCreateOpen(true)}
                    language={lang}
                  />
                )}
                {view === 'CALENDAR' && (
                  <CalendarView 
                    tasks={state.tasks}
                    onTaskClick={openTaskModal}
                  />
                )}
                {view === 'SETTINGS' && (
                    <SettingsView 
                        settings={state.settings}
                        onUpdate={(s) => dispatch({ type: 'UPDATE_SETTINGS', payload: s })}
                        showToast={showToast}
                    />
                )}
            </div>
        )}
      </main>
      
      <ChatInterface isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} data={state} currentProjectId={selectedProjectId} dispatch={dispatch} />
      
      {isContextModalOpen && currentProject && (
        <ContextModal 
            isOpen={isContextModalOpen} 
            onClose={() => setIsContextModalOpen(false)} 
            project={currentProject} 
            tasks={projectTasks} 
        />
      )}

      {isProjectSettingsOpen && currentProject && (
          <ProjectSettingsModal isOpen={isProjectSettingsOpen} onClose={() => setIsProjectSettingsOpen(false)} project={currentProject} onUpdate={(p) => dispatch({ type: 'UPDATE_PROJECT', payload: p })} onDelete={(id) => { dispatch({ type: 'DELETE_PROJECT', payload: id }); setSelectedProjectId(null); }} />
      )}

      {taskModalOpen && currentProject && (
          <TaskModal 
            isOpen={taskModalOpen} 
            onClose={() => setTaskModalOpen(false)} 
            projectId={currentProject.id}
            initialTask={editingTask}
            projectColumns={currentProject.columns}
            onSave={saveTask}
            onDelete={(tid) => { dispatch({ type: 'DELETE_TASK', payload: tid }); showToast('Task deleted', 'SUCCESS'); }}
          />
      )}

      {isProjectCreateOpen && (
        <ProjectCreateModal 
          isOpen={isProjectCreateOpen}
          onClose={() => setIsProjectCreateOpen(false)}
          onSave={handleCreateProject}
          language={lang}
        />
      )}
    </div>
  );
}
