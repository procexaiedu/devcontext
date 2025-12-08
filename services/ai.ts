
import { ChatMessage, AppData, OpenRouterModel } from '../types';

export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

// --- GROQ AUDIO TRANSCRIPTION ---
export const transcribeAudio = async (audioBlob: Blob, apiKey: string): Promise<string> => {
    if (!apiKey) throw new Error("Groq API Key is missing");

    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', 'whisper-large-v3-turbo'); // Or 'whisper-large-v3'
    // Note: Groq Whisper supports multiple languages including PT
    
    try {
        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
            body: formData
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Transcription failed');
        }

        const data = await response.json();
        return data.text;
    } catch (error) {
        console.error("Transcription Error:", error);
        throw error;
    }
};

// Helper to fetch available models from OpenRouter
export const fetchOpenRouterModels = async (): Promise<OpenRouterModel[]> => {
  try {
    const response = await fetch(`${OPENROUTER_API_URL}/models`);
    if (!response.ok) throw new Error('Failed to fetch models');
    
    const data = await response.json();
    // Transform API response to our type
    return data.data.map((m: any) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      context_length: m.context_length,
      pricing: m.pricing
    })).sort((a: OpenRouterModel, b: OpenRouterModel) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Failed to fetch OpenRouter models:", error);
    return [];
  }
};

// Helper to format system prompt with current state
export const buildSystemPrompt = (data: AppData, currentProjectId: string | null, customInstructions: string): string => {
  const project = currentProjectId ? data.projects.find(p => p.id === currentProjectId) : null;
  const projectTasks = currentProjectId ? data.tasks.filter(t => t.projectId === currentProjectId) : [];
  
  // Provide a snapshot of ALL projects so AI knows what exists
  const allProjectsSummary = data.projects.map(p => ({
    id: p.id,
    name: p.name,
    status: p.status
  }));

  const currentProjectContext = project 
    ? {
        id: project.id,
        name: project.name,
        description: project.description,
        documentation_files: project.files.map(f => `[${f.path || '/'}${f.name}]:\n${f.content.substring(0, 1000)}...`).join('\n\n'), 
        tasks: projectTasks.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          tags: t.tags,
          dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : null
        }))
      }
    : null;

  const CORE_SYSTEM_PROMPT = `
You are DevContext PM, an expert Senior Technical Project Manager. Your goal is to help the user organize their work, manage projects, and turn unstructured thoughts or backlogs into actionable tasks and documentation.

### CAPABILITIES & TOOLS
You have direct access to the project database. You MUST use the following tools to perform actions. To use a tool, you MUST output a SINGLE JSON block at the end of your response.

**Available Tools:**

1.  **MANAGE_PROJECT**
    *   Action: 'CREATE'
    *   Args: { name: string, description?: string }
    *   *Usage:* Create a NEW project.

    *   Action: 'UPDATE'
    *   Args: { id: string, name?: string, description?: string, status?: 'ACTIVE' | 'ARCHIVED' | 'COMPLETED' }
    *   *Usage:* Update an EXISTING project.

2.  **MANAGE_TASK**
    *   Action: 'CREATE'
    *   Args: { projectId?: string, title: string, description?: string, status?: 'TODO' | 'IN_PROGRESS' | 'DONE', priority?: 'LOW' | 'MEDIUM' | 'HIGH', tags?: string[], subtasks?: string[], dueDate?: string (ISO) }
    *   *Usage:* Create a new task. If the user pastes a list/backlog, break it down and create multiple tasks.
    *   *Note:* If 'projectId' is omitted, it defaults to the current active project.

    *   Action: 'UPDATE'
    *   Args: { id: string, title?: string, status?: string, priority?: string, ... }
    *   *Usage:* Modify an existing task.

3.  **BATCH_CREATE_TASKS**
    *   Action: 'CREATE'
    *   Args: { tasks: [ { title: string, description?: string, priority?: string, ... } ] }
    *   *Usage:* Create MULTIPLE tasks at once. Use this for backlogs, lists, or breaking down big features.

4.  **MANAGE_FILE**
    *   Action: 'CREATE' | 'UPDATE'
    *   Args: { id?: string, name: string, content: string, path?: string }
    *   *Usage:* Create or update documentation (Markdown). Use this to save notes, requirements, or technical specs.

### INSTRUCTIONS
*   **Role:** Act as a proactive PM. If the user gives you a rough idea, suggest a project structure or task breakdown.
*   **Backlogs:** If the user provides a list of items (backlog), analyze them. Ask to convert to tasks. **ALWAYS use 'BATCH_CREATE_TASKS'** to create the whole list in one go.
*   **Context:** Always check the 'CURRENT ACTIVE VIEW CONTEXT' before acting. If the user is on the Dashboard, ask which project they want to work on or if they want to create a new one. Use 'MANAGE_PROJECT' (action: CREATE) if the user requests a new project.
*   **Tone:** Professional, organized, concise, yet helpful and encouraging.
*   **Format:** Use Markdown for text responses. For tool usage, strictly use the JSON format below.

### TOOL USE FORMAT
To execute a command, append this JSON block to your message:

\`\`\`json
{
  "tool": "TOOL_NAME",
  "args": { ...arguments }
}
\`\`\`
`;

  // Use user custom instructions if available, otherwise use core prompt
  const mainSystemPrompt = customInstructions && customInstructions.trim().length > 0 
    ? customInstructions 
    : CORE_SYSTEM_PROMPT;

  return `
${mainSystemPrompt}

---
**GLOBAL DATABASE CONTEXT:**
${JSON.stringify({ all_projects: allProjectsSummary }, null, 2)}

**CURRENT ACTIVE VIEW CONTEXT:**
${currentProjectContext ? JSON.stringify(currentProjectContext, null, 2) : "User is on Dashboard (No active project)."}

**DATE CONTEXT:**
Today is ${new Date().toLocaleString()}.
`;
};

export const sendMessageToOpenRouter = async (
  messages: ChatMessage[],
  apiKey: string,
  model: string,
  systemPrompt: string,
  onToolCall: (tool: string, args: any) => Promise<string>
): Promise<ChatMessage> => {
  
  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content }))
  ];

  try {
    const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
        // 'HTTP-Referer': window.location.origin, // Removed to avoid CORS issues
        // 'X-Title': 'DevContext' 
      },
      body: JSON.stringify({
        model: model,
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 4096, 
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'API Request Failed');
    }

    const data = await response.json();
    const assistantContent = data.choices[0].message.content || "";
    console.log("[AI RAW RESPONSE]:", assistantContent);

    // Robust JSON extraction for tool calls
    // 1. Try extracting from markdown code blocks first
    let jsonMatch = assistantContent.match(/```json\n([\s\S]*?)\n```/) || assistantContent.match(/```\n([\s\S]*?)\n```/);
    let toolData = null;

    if (jsonMatch) {
      try {
        toolData = JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.warn("Failed to parse tool JSON from code block", e);
      }
    } 
    
    // 2. Fallback: Look for the last JSON-like object in the text
    // This regex looks for { "tool": ... } pattern specifically
    if (!toolData) {
        const jsonFallbackMatch = assistantContent.match(/(\{[\s\S]*"tool"[\s\S]*\})/g);
        if (jsonFallbackMatch && jsonFallbackMatch.length > 0) {
            try {
                // Take the last match as it's likely the tool call
                const potentialJson = jsonFallbackMatch[jsonFallbackMatch.length - 1];
                toolData = JSON.parse(potentialJson);
            } catch (e) {
                console.warn("Failed to parse fallback JSON", e);
            }
        }
    }
    
    if (toolData && toolData.tool && toolData.args) {
        try {
            const result = await onToolCall(toolData.tool, toolData.args);
            return {
                id: Date.now().toString(),
                role: 'assistant',
                content: assistantContent + `\n\n> *System Action: ${toolData.tool} executed.* \n> Status: ${result}`,
                timestamp: Date.now()
            };
        } catch (e: any) {
             return {
                id: Date.now().toString(),
                role: 'assistant',
                content: assistantContent + `\n\n> *System Action Failed:* ${e.message}`,
                timestamp: Date.now()
            };
        }
    }

    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: assistantContent,
      timestamp: Date.now()
    };

  } catch (error: any) {
    console.error("AI Error:", error);
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: `**AI Error**: ${error.message}. Check your settings.`,
      timestamp: Date.now()
    };
  }
};
