
import { Project, Task, ChatLog, DefaultStatus, Subtask } from '../types';

export enum ContextFormat {
  MARKDOWN = 'MARKDOWN',
  PROMPT = 'PROMPT',
  SUMMARY = 'SUMMARY',
  TECHNICAL = 'TECHNICAL'
}

export const generateProjectContext = (
  project: Project,
  tasks: Task[],
  logs: ChatLog[],
  format: ContextFormat
): string => {
  const activeTasks = tasks.filter(t => t.status === DefaultStatus.IN_PROGRESS); // Note: Simple filter, might need column check if custom
  const todoTasks = tasks.filter(t => t.status === DefaultStatus.TODO);
  const doneTasks = tasks.filter(t => t.status === DefaultStatus.DONE);

  const formatSubtasks = (subtasks: Subtask[]) => {
    if (!subtasks.length) return '';
    return subtasks.map(s => `    - [${s.completed ? 'x' : ' '}] ${s.title}`).join('\n');
  }

  const taskListToString = (list: Task[]) => 
    list.map(t => `- [${t.priority}] **${t.title}** (Status: ${t.status}) ${t.description ? `: ${t.description}` : ''}\n${formatSubtasks(t.subtasks)}`).join('\n');

  const progress = Math.round((doneTasks.length / (tasks.length || 1)) * 100);
  
  // Format all documentation files
  const docsContent = project.files.map(f => `\n=== FILE: ${f.name} ===\n${f.content}\n`).join('\n');

  switch (format) {
    case ContextFormat.PROMPT:
      return `
# CONTEXT FOR AI ASSISTANT

**Role**: You are a Senior Software Architect and Developer working on "${project.name}".
**Goal**: Help complete the active tasks and provide technical guidance based on the documentation.

## Project Snapshot
- **Description**: ${project.description}
- **Progress**: ${progress}% Complete
- **Stack/Tags**: ${project.tags.join(', ')}
${project.githubRepo ? `- **Repository**: https://github.com/${project.githubRepo} (Branch: ${project.githubBranch || 'main'})` : ''}

## Current Focus (Active Tasks)
${taskListToString(activeTasks)}

## Pending Tasks (Backlog)
${taskListToString(todoTasks)}

## Technical Documentation
${docsContent}

---
*Please use the context above to answer my next question. Assume I have this codebase open.*
      `.trim();

    case ContextFormat.TECHNICAL:
      return `
# Technical Specification: ${project.name}

## Overview
${project.description}

## Documentation Files
${docsContent}

## Work Breakdown Structure
### In Progress (${activeTasks.length})
${taskListToString(activeTasks)}

### To Do (${todoTasks.length})
${taskListToString(todoTasks)}

### Completed (${doneTasks.length})
${taskListToString(doneTasks)}
      `.trim();

    case ContextFormat.SUMMARY:
    default:
      return `
# ${project.name}
> ${project.description}

**Status**: ${project.status} | **Progress**: ${progress}%

## Documentation
${docsContent}

## Tasks
### Doing
${taskListToString(activeTasks)}
### Todo
${taskListToString(todoTasks)}

## Relevant History
${logs.map(l => `### ${l.title}\n${l.content.substring(0, 300)}...`).join('\n')}
      `.trim();
  }
};
