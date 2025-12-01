
import { ChatMessage, AppData, OpenRouterModel } from '../types';

export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

// --- GROQ AUDIO TRANSCRIPTION ---
export const transcribeAudio = async (audioBlob: Blob, apiKey: string): Promise<string> => {
    if (!apiKey) throw new Error("Groq API Key is missing");

    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', 'distil-whisper-large-v3-en'); // Or 'whisper-large-v3'
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
        // Limit docs to avoid huge context usage. Group by folder structure could be added here.
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

  return `
${customInstructions}

GLOBAL DATABASE CONTEXT:
${JSON.stringify({ all_projects: allProjectsSummary }, null, 2)}

CURRENT ACTIVE VIEW CONTEXT:
${currentProjectContext ? JSON.stringify(currentProjectContext, null, 2) : "User is on Dashboard (No active project)."}

DATE CONTEXT:
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

    // Robust JSON extraction for tool calls
    const jsonMatch = assistantContent.match(/```json\n([\s\S]*?)\n```/) || assistantContent.match(/```\n([\s\S]*?)\n```/);
    
    if (jsonMatch) {
      try {
        const toolData = JSON.parse(jsonMatch[1]);
        if (toolData.tool && toolData.args) {
            const result = await onToolCall(toolData.tool, toolData.args);
            
            return {
                id: Date.now().toString(),
                role: 'assistant',
                content: assistantContent + `\n\n> *System Action: ${toolData.tool} executed.* \n> Status: ${result}`,
                timestamp: Date.now()
            };
        }
      } catch (e) {
        console.warn("Failed to parse tool JSON", e);
      }
    } 
    // Fallback: try parsing the entire content if it looks like JSON
    else if (assistantContent.trim().startsWith('{') && assistantContent.includes('"tool"')) {
        try {
            const toolData = JSON.parse(assistantContent);
            if (toolData.tool && toolData.args) {
                const result = await onToolCall(toolData.tool, toolData.args);
                return {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `> *System Action: ${toolData.tool} executed.*\n> Status: ${result}`,
                    timestamp: Date.now()
                };
            }
        } catch (e) {
            // Not JSON
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
