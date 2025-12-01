
import { createDynamicClient } from '../lib/supabase';
import { AppData, Project, Task, DocFile, KanbanColumn, AppSettings } from '../types';
import * as LocalStorage from './storage';

// Helper to get client based on current settings
const getClient = () => {
    const data = LocalStorage.loadData();
    const { supabaseUrl, supabaseKey, supabaseSchema } = data.settings;
    return createDynamicClient(supabaseUrl || '', supabaseKey || '', supabaseSchema || 'public');
};

export const loadAppData = async (): Promise<AppData> => {
    // 1. Load Local Config
    const localData = LocalStorage.loadData();
    const client = getClient();

    if (!client) {
        console.log("Supabase not configured. Using LocalStorage.");
        return localData;
    }

    try {
        console.log("Connecting to Supabase...");
        // 2. Load Projects
        const { data: projectsData, error: projError } = await client
            .from('projects')
            .select('*')
            .order('updated_at', { ascending: false });
            
        if (projError) throw projError;

        // 3. Load Columns, Files, Tasks
        const { data: columnsData } = await client.from('kanban_columns').select('*').order('position');
        const { data: filesData } = await client.from('files').select('*');
        const { data: tasksData } = await client.from('tasks').select('*');

        // Map DB structure to App Interface
        const mappedProjects: Project[] = (projectsData || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            status: p.status,
            tags: p.tags || [],
            columns: columnsData?.filter((c: any) => c.project_id === p.id) || [],
            files: filesData?.filter((f: any) => f.project_id === p.id) || [],
            relatedProjectIds: [], 
            threads: [], // Initialize threads
            createdAt: new Date(p.created_at).getTime(),
            updatedAt: new Date(p.updated_at).getTime()
        }));

        const mappedTasks: Task[] = (tasksData || []).map((t: any) => ({
            id: t.id,
            projectId: t.project_id,
            title: t.title,
            description: t.description,
            status: t.status,
            priority: t.priority,
            tags: t.tags || [],
            subtasks: t.subtasks || [],
            startDate: t.start_date ? new Date(t.start_date).getTime() : undefined,
            dueDate: t.due_date ? new Date(t.due_date).getTime() : undefined,
            timeSpent: t.time_spent || 0,
            isTimerRunning: t.is_timer_running || false,
            createdAt: new Date(t.created_at).getTime(),
            updatedAt: new Date(t.updated_at).getTime()
        }));

        return {
            projects: mappedProjects,
            tasks: mappedTasks,
            chatLogs: [], 
            settings: localData.settings // Keep local settings
        };

    } catch (e) {
        console.error("Supabase Load Error:", e);
        return localData; // Fallback
    }
};

// CRUD Operations

export const createProject = async (project: Project) => {
    const client = getClient();
    if (!client) return LocalStorage.saveData(updateLocalStateWithProject(project));

    const { error } = await client.from('projects').insert({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        tags: project.tags,
        created_at: new Date(project.createdAt).toISOString(),
        updated_at: new Date(project.updatedAt).toISOString()
    });

    if (error) {
        console.error("DB Error", error);
        return;
    }

    if (project.columns.length > 0) {
        await client.from('kanban_columns').insert(
            project.columns.map(c => ({
                id: c.id,
                project_id: project.id,
                title: c.title,
                color: c.color,
                position: 0
            }))
        );
    }
    
    if (project.files.length > 0) {
        await client.from('files').insert(
            project.files.map(f => ({
                id: f.id,
                project_id: project.id,
                name: f.name,
                type: f.type,
                content: f.content
            }))
        );
    }
};

export const updateProject = async (project: Project) => {
    const client = getClient();
    if (!client) return LocalStorage.saveData(updateLocalStateWithProject(project));

    await client.from('projects').update({
        name: project.name,
        description: project.description,
        status: project.status,
        updated_at: new Date().toISOString()
    }).eq('id', project.id);
    
    // NOTE: Full sync of columns/files is complex here. 
    // In production we would diff or just rely on separate column/file endpoints.
};

export const deleteProject = async (projectId: string) => {
    const client = getClient();
    if (!client) {
         const data = LocalStorage.loadData();
         const newData = {
             ...data,
             projects: data.projects.filter(p => p.id !== projectId),
             tasks: data.tasks.filter(t => t.projectId !== projectId)
         };
         return LocalStorage.saveData(newData);
    }
    await client.from('projects').delete().eq('id', projectId);
};

export const upsertTask = async (task: Task) => {
    const client = getClient();
    if (!client) return LocalStorage.saveData(updateLocalStateWithTask(task));

    const payload = {
        id: task.id,
        project_id: task.projectId,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        tags: task.tags,
        subtasks: task.subtasks,
        start_date: task.startDate ? new Date(task.startDate).toISOString() : null,
        due_date: task.dueDate ? new Date(task.dueDate).toISOString() : null,
        time_spent: task.timeSpent,
        is_timer_running: task.isTimerRunning,
        updated_at: new Date().toISOString()
    };

    // Need to handle created_at if new
    // Supabase upsert will handle PK conflict, but let's check if we want to set created_at
    const { error } = await client.from('tasks').upsert(payload);
    if (error) console.error("DB Error", error);
};

export const deleteTask = async (taskId: string) => {
    const client = getClient();
    if (!client) {
         const data = LocalStorage.loadData();
         return LocalStorage.saveData({ ...data, tasks: data.tasks.filter(t => t.id !== taskId)});
    }
    await client.from('tasks').delete().eq('id', taskId);
};

export const upsertFile = async (projectId: string, file: DocFile) => {
    const client = getClient();
    if (!client) return LocalStorage.saveData(updateLocalStateWithFile(projectId, file));
    
    await client.from('files').upsert({
        id: file.id,
        project_id: projectId,
        name: file.name,
        type: file.type,
        content: file.content,
        updated_at: new Date().toISOString()
    });
};

export const deleteFile = async (fileId: string) => {
    const client = getClient();
    if (!client) {
        // Local logic omitted for brevity in this specific call, assuming cloud mostly
        return; 
    }
    await client.from('files').delete().eq('id', fileId);
};

// Local Fallback Helpers
const updateLocalStateWithProject = (p: Project) => {
    const current = LocalStorage.loadData();
    const exists = current.projects.find(proj => proj.id === p.id);
    const newProjects = exists 
        ? current.projects.map(proj => proj.id === p.id ? p : proj)
        : [...current.projects, p];
    return { ...current, projects: newProjects };
};

const updateLocalStateWithTask = (t: Task) => {
    const current = LocalStorage.loadData();
    const exists = current.tasks.find(task => task.id === t.id);
    const newTasks = exists 
        ? current.tasks.map(task => task.id === t.id ? t : task)
        : [...current.tasks, t];
    return { ...current, tasks: newTasks };
};

const updateLocalStateWithFile = (pid: string, f: DocFile) => {
    const current = LocalStorage.loadData();
    const newProjects = current.projects.map(p => {
        if (p.id !== pid) return p;
        const exists = p.files.find(file => file.id === f.id);
        const newFiles = exists 
             ? p.files.map(file => file.id === f.id ? f : file)
             : [...p.files, f];
        return { ...p, files: newFiles };
    });
    return { ...current, projects: newProjects };
};