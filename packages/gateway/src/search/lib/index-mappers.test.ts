import type { Council, Memory, Note, Project, Task, Workflow } from '@midnite/shared';
import { describe, expect, it } from 'vitest';
import {
  councilToIndexDoc,
  memoryToIndexDoc,
  noteToIndexDoc,
  projectToIndexDoc,
  routeFor,
  taskToIndexDoc,
  workflowToIndexDoc,
} from './index-mappers';

describe('index mappers', () => {
  it('maps a task to title + prompt body', () => {
    const task = { id: 't1', title: 'Fix login', prompt: 'OAuth broken' } as Task;
    expect(taskToIndexDoc(task)).toEqual({
      type: 'task',
      entityId: 't1',
      title: 'Fix login',
      body: 'OAuth broken',
    });
  });

  it('folds a project description + plan into the body', () => {
    const project = { id: 'p1', name: 'Apollo', description: 'rocket', plan: '## step' } as Project;
    const doc = projectToIndexDoc(project);
    expect(doc.title).toBe('Apollo');
    expect(doc.body).toContain('rocket');
    expect(doc.body).toContain('## step');
  });

  it('uses a note first line (capped) as its title', () => {
    const note = { id: 'n1', content: 'buy milk\nand eggs' } as Note;
    expect(noteToIndexDoc(note)).toMatchObject({ type: 'note', title: 'buy milk' });
  });

  it('clips an oversized body', () => {
    const memory = { id: 'm1', title: 'big', content: 'x'.repeat(10_000) } as Memory;
    expect(memoryToIndexDoc(memory).body.length).toBeLessThanOrEqual(4_000);
  });

  it('maps councils and workflows by name + description', () => {
    const council = { id: 'c1', name: 'Arch', description: 'design', customPrompt: 'be terse' } as Council;
    expect(councilToIndexDoc(council)).toMatchObject({ type: 'council', title: 'Arch' });
    expect(councilToIndexDoc(council).body).toContain('be terse');

    const workflow = { id: 'w1', name: 'Deploy', description: 'ship it' } as Workflow;
    expect(workflowToIndexDoc(workflow)).toEqual({
      type: 'workflow',
      entityId: 'w1',
      title: 'Deploy',
      body: 'ship it',
    });
  });

  it('routes each type to a navigable path', () => {
    expect(routeFor('task', 't1')).toBe('/tasks');
    expect(routeFor('project', 'p1')).toBe('/projects');
    expect(routeFor('memory', 'm1')).toBe('/memory');
    expect(routeFor('note', 'n1')).toBe('/dashboard');
    expect(routeFor('council', 'c1')).toBe('/councils/c1');
    expect(routeFor('workflow', 'w 1')).toBe('/workflows/edit?id=w%201');
  });
});
