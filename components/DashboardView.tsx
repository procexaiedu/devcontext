import React from 'react';
import { AppData, Project } from '../types';
import { ProjectCard } from './ProjectCard';
import { Plus, Archive, BarChart3, Clock } from './Icons';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

interface Props {
    state: AppData;
    showArchived: boolean;
    setShowArchived: (val: boolean) => void;
    onAddProject: () => void;
    onSelectProject: (id: string) => void;
}

export const DashboardView: React.FC<Props> = ({ state, showArchived, setShowArchived, onAddProject, onSelectProject }) => {
    const visibleProjects = state.projects.filter(p => showArchived ? p.status === 'ARCHIVED' : p.status !== 'ARCHIVED');
    const totalTasks = state.tasks.length;
    const completedTasks = state.tasks.filter(t => t.status === 'DONE' || t.status.includes('DONE')).length;
    
    // Mock Data for Charts (could be real if we track daily completions in a separate table)
    const activityData = [
      { name: 'Mon', tasks: 2 }, { name: 'Tue', tasks: 5 }, { name: 'Wed', tasks: 3 },
      { name: 'Thu', tasks: 8 }, { name: 'Fri', tasks: 6 }, { name: 'Sat', tasks: 2 }, { name: 'Sun', tasks: 4 }
    ];

    const upcomingDeadlines = state.tasks
        .filter(t => t.dueDate && t.status !== 'DONE')
        .sort((a,b) => (a.dueDate || 0) - (b.dueDate || 0))
        .slice(0, 5);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in pb-20">
             <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-text mb-2">Workspace Overview</h1>
                    <p className="text-textMuted">Welcome back, {state.settings.userName}</p>
                </div>
                <div className="flex gap-3">
                   <button 
                      onClick={() => setShowArchived(!showArchived)}
                      className={`px-4 py-2.5 rounded-xl border border-border flex items-center gap-2 text-sm transition-colors ${showArchived ? 'bg-primary/20 text-primary border-primary/30' : 'bg-surface hover:bg-surfaceHighlight text-textMuted'}`}
                   >
                      <Archive size={16}/> {showArchived ? 'Hide Archived' : 'Show Archived'}
                   </button>
                   <button 
                      onClick={onAddProject}
                      className="bg-primary hover:bg-primaryHover text-white px-5 py-2.5 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 font-medium transition-all"
                   >
                      <Plus size={18}/> New Project
                   </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-surface border border-border rounded-xl p-5">
                   <div className="text-textMuted text-xs font-bold uppercase mb-2">Total Projects</div>
                   <div className="text-3xl font-bold text-text">{state.projects.length}</div>
                </div>
                <div className="bg-surface border border-border rounded-xl p-5">
                   <div className="text-textMuted text-xs font-bold uppercase mb-2">Active Tasks</div>
                   <div className="text-3xl font-bold text-blue-400">{totalTasks - completedTasks}</div>
                </div>
                <div className="bg-surface border border-border rounded-xl p-5">
                   <div className="text-textMuted text-xs font-bold uppercase mb-2">Completed</div>
                   <div className="text-3xl font-bold text-green-400">{completedTasks}</div>
                </div>
                <div className="bg-surface border border-border rounded-xl p-5">
                   <div className="text-textMuted text-xs font-bold uppercase mb-2">Productivity</div>
                   <div className="text-3xl font-bold text-purple-400">{Math.round((completedTasks/totalTasks || 0) * 100)}%</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-80">
                {/* Chart */}
                <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-6 flex flex-col">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2"><BarChart3 size={18} className="text-primary"/> Activity (Last 7 Days)</h3>
                    <div className="flex-1 w-full min-h-0">
                       <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={activityData}>
                             <defs>
                                <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                             </defs>
                             <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                             <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                             <RechartsTooltip 
                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                                itemStyle={{ color: '#e4e4e7' }}
                             />
                             <Area type="monotone" dataKey="tasks" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTasks)" />
                          </AreaChart>
                       </ResponsiveContainer>
                    </div>
                </div>

                {/* Deadlines */}
                <div className="bg-surface border border-border rounded-xl p-6 flex flex-col">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Clock size={18} className="text-orange-400"/> Upcoming Deadlines</h3>
                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                        {upcomingDeadlines.length > 0 ? upcomingDeadlines.map(t => (
                            <div key={t.id} className="flex items-center justify-between p-3 bg-background rounded-lg border border-border/50">
                                <div className="truncate pr-2">
                                    <div className="text-sm font-medium text-text truncate">{t.title}</div>
                                    <div className="text-xs text-textMuted">{state.projects.find(p => p.id === t.projectId)?.name}</div>
                                </div>
                                <div className="text-xs font-bold text-orange-400 whitespace-nowrap bg-orange-400/10 px-2 py-1 rounded">
                                   {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ''}
                                </div>
                            </div>
                        )) : (
                            <div className="text-center text-textMuted text-sm py-10">No upcoming deadlines</div>
                        )}
                    </div>
                </div>
            </div>
            
            <div>
                <h2 className="text-xl font-semibold mb-4 text-text">Projects</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {visibleProjects.map(p => (
                        <ProjectCard key={p.id} project={p} tasks={state.tasks} onClick={() => onSelectProject(p.id)} />
                    ))}
                    {visibleProjects.length === 0 && (
                        <div className="col-span-full py-12 text-center text-textMuted border-2 border-dashed border-border rounded-xl">
                            No projects found. Create one or check archived.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};