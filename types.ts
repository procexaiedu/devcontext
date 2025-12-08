
export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export const DefaultStatus = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE'
} as const;

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface DocFile {
  id: string;
  name: string;
  type: string;                // Content type (extension)
  kind: 'file' | 'folder';     // New: Distinguish files vs folders
  content: string;
  path: string;                // Folder path (e.g. "/docs/api")
  source?: 'local' | 'github'; // New: Origin of the file
  sha?: string;                // New: GitHub SHA for sync
}

export interface KanbanColumn {
  id: string;
  title: string;
  color: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: string;
  priority: Priority;
  tags: string[];
  subtasks: Subtask[];
  startDate?: number;
  dueDate?: number;
  timeSpent: number;
  isTimerRunning: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ChatThread {
  id: string;
  title: string;
  date: number;
  messages: ChatMessage[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
  files: DocFile[];
  columns: KanbanColumn[];
  tags: string[];
  relatedProjectIds: string[];
  threads: ChatThread[];
  githubRepo?: string;   // New: "username/repo"
  githubBranch?: string; // New: "main" or "master"
  githubToken?: string;  // New: Optional project-specific token (if user overrides global)
  createdAt: number;
  updatedAt: number;
}

export interface ChatLog {
  id: string;
  projectId?: string; 
  title: string;
  content: string; 
  tags: string[];
  date: number;
  source: 'IMPORT' | 'INTERNAL_CHAT';
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: string;
    completion: string;
  }
}

export type Language = 'en' | 'pt';

export interface AppSettings {
  openRouterKey: string;
  groqApiKey: string; // New: Audio Transcription
  defaultModel: string;
  userName: string;
  availableModels: OpenRouterModel[];
  customSystemPrompt: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  supabaseSchema?: string;
  language: Language;
}

export interface AppData {
  projects: Project[];
  tasks: Task[];
  chatLogs: ChatLog[];
  settings: AppSettings;
}

export type ViewState = 'DASHBOARD' | 'PROJECTS_LIST' | 'PROJECT_DETAIL' | 'LIBRARY' | 'SETTINGS' | 'CALENDAR';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolCalls?: any[];
}

export interface Toast {
  id: string;
  type: 'SUCCESS' | 'ERROR' | 'INFO';
  message: string;
}
