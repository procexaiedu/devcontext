
import { AppData, Project, Task, DocFile, KanbanColumn, Priority, DefaultStatus } from '../types';

const STORAGE_KEY = 'devcontext_pro_db_v6'; // Version bump

const DEFAULT_SYSTEM_PROMPT = `You are the Senior Technical Project Manager & Architect for the "DevContext" system.
Your goal is to maintain the state of the project based on the developer's inputs, conversations, and "brain dumps".

### YOUR ROLE:
1.  **Context Guardian**: You ensure the database (Tasks, Docs) exactly reflects reality.
2.  **Proactive Assistant**: If the user says "I finished auth", you find the auth task and mark it DONE. If it doesn't exist, you create it first, then mark it DONE.
3.  **Documentation Librarian**: You organize knowledge into files. If the user explains a complex logic, you suggest: "Should I save this to 'docs/logic.md'?" or just do it via MANAGE_FILE.

### TOOLS USAGE RULES (STRICT JSON):

#### 1. MANAGE_PROJECT
Action: "CREATE" | "UPDATE" | "DELETE"
- Use "UPDATE" to change status, description, or add columns.
\`\`\`json
{
  "tool": "MANAGE_PROJECT",
  "args": {
    "action": "UPDATE",
    "id": "current_project_id",
    "columns": [{"id": "qa", "title": "QA Testing", "color": "border-purple-500"}]
  }
}
\`\`\`

#### 2. MANAGE_TASK
Action: "CREATE" | "UPDATE" | "DELETE"
- **CRITICAL**: When the user dumps a list of things they did, create multiple tasks or update existing ones.
- Use 'subtasks' array for checklists.
- **Smart Dates**: If user says "finish by friday", calculate the timestamp for 'dueDate'.
\`\`\`json
{
  "tool": "MANAGE_TASK",
  "args": {
    "action": "CREATE",
    "projectId": "p-123",
    "title": "Implement Login",
    "status": "DONE",
    "priority": "HIGH",
    "subtasks": ["UI Layout", "API Integration"],
    "dueDate": 1715420000000
  }
}
\`\`\`

#### 3. MANAGE_FILE (Knowledge Base)
Action: "CREATE" | "UPDATE" | "DELETE"
- **Folder Support**: Use forward slashes in name (e.g., "backend/auth_flow.md").
- Capture architectural decisions here.
\`\`\`json
{
  "tool": "MANAGE_FILE",
  "args": {
    "action": "CREATE",
    "name": "specs/database_schema.md",
    "content": "# Database Schema\n\n..."
  }
}
\`\`\`
`;

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: DefaultStatus.TODO, title: 'To Do', color: 'border-slate-500' },
  { id: DefaultStatus.IN_PROGRESS, title: 'In Progress', color: 'border-blue-500' },
  { id: DefaultStatus.DONE, title: 'Done', color: 'border-green-500' }
];

const INITIAL_DATA: AppData = {
  projects: [
    {
      id: 'p-demo',
      name: 'DevContext Architecture',
      description: 'Self-hosting project management for AI context generation.',
      status: 'ACTIVE',
      columns: DEFAULT_COLUMNS,
      files: [
        {
          id: 'f-1',
          name: 'README.md',
          type: 'md',
          content: '# Architecture\n\n- **Frontend**: React + Tailwind\n- **State**: Context API\n- **AI**: OpenRouter Integration\n- **DB**: Supabase (Optional)',
          path: '/'
        },
        {
            id: 'f-2',
            name: 'features.md',
            type: 'md',
            content: '# Features\n\n1. AI Chat\n2. Kanban\n3. Docs',
            path: '/docs'
        }
      ],
      tags: ['meta', 'react'],
      relatedProjectIds: [],
      threads: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ],
  tasks: [
    {
      id: 't-1',
      projectId: 'p-demo',
      title: 'Implement OpenRouter API',
      description: 'Create a generic service to handle chat completions.',
      status: DefaultStatus.DONE,
      priority: Priority.HIGH,
      tags: ['backend', 'ai'],
      subtasks: [
        { id: 'st-1', title: 'Setup Fetch wrapper', completed: true },
        { id: 'st-2', title: 'Handle streaming', completed: false }
      ],
      timeSpent: 3600, // 1 hour example
      isTimerRunning: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ],
  chatLogs: [],
  settings: {
    openRouterKey: '', 
    groqApiKey: '',
    defaultModel: 'google/gemini-2.0-flash-001',
    userName: 'Developer',
    availableModels: [],
    customSystemPrompt: DEFAULT_SYSTEM_PROMPT,
    supabaseUrl: '',
    supabaseKey: '',
    supabaseSchema: 'public',
    language: 'en'
  }
};

export const loadData = (): AppData => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    saveData(INITIAL_DATA);
    return INITIAL_DATA;
  }
  try {
    const parsed = JSON.parse(stored);
    
    // MIGRATION: projects
    const migratedProjects = (parsed.projects || []).map((p: any) => ({
      ...p,
      files: (p.files || []).map((f: any) => ({...f, path: f.path || '/'})),
      columns: p.columns || DEFAULT_COLUMNS,
      threads: p.threads || []
    }));

    return { 
        ...INITIAL_DATA, 
        ...parsed, 
        projects: migratedProjects,
        settings: { 
            ...INITIAL_DATA.settings, 
            ...(parsed.settings || {}),
            groqApiKey: parsed.settings?.groqApiKey || '', // Ensure new key exists
        } 
    };
  } catch (e) {
    console.error("Failed to parse storage", e);
    return INITIAL_DATA;
  }
};

export const saveData = (data: AppData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const importData = (jsonString: string): AppData | null => {
    try {
        const parsed = JSON.parse(jsonString);
        if (parsed.projects && parsed.tasks) {
            saveData(parsed);
            return parsed;
        }
        return null;
    } catch (e) {
        return null;
    }
};
