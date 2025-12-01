import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { Project, Task, Priority } from '../types';

// NOTE: In a real production app, this key should come from a secure backend or strict env var.
// For this client-side demo, we rely on the process.env injection as per instructions.
const apiKey = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

// Tool Definitions
const addTaskTool: FunctionDeclaration = {
  name: 'addTask',
  description: 'Add a new task to the current project',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'The title of the task' },
      priority: { type: Type.STRING, description: 'Priority: LOW, MEDIUM, or HIGH' },
    },
    required: ['title']
  }
};

const queryTasksTool: FunctionDeclaration = {
  name: 'queryTasks',
  description: 'Get a list of tasks filtered by status',
  parameters: {
    type: Type.OBJECT,
    properties: {
      status: { type: Type.STRING, description: 'Status: TODO, IN_PROGRESS, or DONE' }
    }
  }
};

export const sendMessageToGemini = async (
  message: string,
  projectContext: Project | null,
  tasks: Task[],
  history: any[],
  onToolCall: (name: string, args: any) => Promise<any>
) => {
  if (!apiKey) {
    return "Error: API Key is missing. Please check your environment configuration.";
  }

  const model = "gemini-2.5-flash"; // Using 2.5 Flash as requested for efficiency
  
  const systemInstruction = `
    You are a helpful project management assistant named "DevBot".
    Current Project Context: ${projectContext ? projectContext.name : 'No specific project selected (Dashboard view)'}.
    Project Description: ${projectContext ? projectContext.description : 'N/A'}.
    
    You can help manage tasks using the provided tools.
    If the user asks to add a task, call the addTask tool.
    If the user asks what is left to do, call queryTasks tool.
    Keep responses concise and developer-friendly.
  `;

  try {
    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: systemInstruction,
        tools: [{ functionDeclarations: [addTaskTool, queryTasksTool] }],
      },
      history: history // Pass previous chat history
    });

    const response = await chat.sendMessage({ message });
    
    // Handle Function Calling
    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      const toolResult = await onToolCall(call.name, call.args);
      
      // Send tool result back to model to get final text response
      const toolResponse = await chat.sendMessage({
          message: [
              {
                  functionResponse: {
                      id: call.id,
                      name: call.name,
                      response: { result: toolResult }
                  }
              }
          ]
      });
      return toolResponse.text;
    }

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I encountered an error communicating with the AI. Please try again.";
  }
};