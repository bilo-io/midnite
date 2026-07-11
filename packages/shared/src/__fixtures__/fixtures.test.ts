import { describe, expect, it } from 'vitest';
import type { ZodTypeAny } from 'zod';
import { MediaSchema } from '../media.js';
import { MemorySchema } from '../memory.js';
import { NoteSchema } from '../note.js';
import { ProjectSchema } from '../project.js';
import { RoutineSchema } from '../routine.js';
import { NodeRunSchema, WorkflowRunSchema } from '../run.js';
import { SessionSummarySchema, SessionTranscriptSchema } from '../session.js';
import { TaskSchema } from '../task.js';
import { TriggerSchema } from '../trigger.js';
import { UsageRecordSchema } from '../usage.js';
import { WorkflowEdgeSchema, WorkflowNodeSchema } from '../node.js';
import { WorkflowSchema } from '../workflow.js';
import { TaskBoardEventSchema } from '../events/task.js';
import { ClientTerminalMessageSchema, ServerTerminalMessageSchema } from '../events/terminal.js';
import { WorkflowEventSchema } from '../events/workflow.js';
import * as fixtures from './index.js';

// A fixture is *canonical* when parsing it returns exactly itself: every
// defaulted field is already present, so there is no silent coercion. This is
// the contract gateway/web tests rely on when they reuse these as fakes.
const cases: ReadonlyArray<[string, ZodTypeAny, unknown]> = [
  ['task', TaskSchema, fixtures.taskFixture],
  ['sessionSummary', SessionSummarySchema, fixtures.sessionSummaryFixture],
  ['sessionTranscript', SessionTranscriptSchema, fixtures.sessionTranscriptFixture],
  ['project', ProjectSchema, fixtures.projectFixture],
  ['memory', MemorySchema, fixtures.memoryFixture],
  ['note', NoteSchema, fixtures.noteFixture],
  ['media', MediaSchema, fixtures.mediaFixture],
  ['routine', RoutineSchema, fixtures.routineFixture],
  ['workflowNode', WorkflowNodeSchema, fixtures.workflowNodeFixture],
  ['workflowEdge', WorkflowEdgeSchema, fixtures.workflowEdgeFixture],
  ['workflow', WorkflowSchema, fixtures.workflowFixture],
  ['nodeRun', NodeRunSchema, fixtures.nodeRunFixture],
  ['workflowRun', WorkflowRunSchema, fixtures.workflowRunFixture],
  ['usageRecord', UsageRecordSchema, fixtures.usageRecordFixture],
  ['manualTrigger', TriggerSchema, fixtures.manualTriggerFixture],
  ['webhookTrigger', TriggerSchema, fixtures.webhookTriggerFixture],
];

describe('canonical fixtures parse to identity', () => {
  it.each(cases)('%s round-trips through its schema unchanged', (_name, schema, fixture) => {
    expect(schema.parse(fixture)).toEqual(fixture);
  });
});

// For each WS event union, every discriminant must have at least one fixture and
// JSON encode → decode must be identity (the wire contract clients depend on).
const unions: ReadonlyArray<[string, ZodTypeAny, readonly { type: string }[]]> = [
  ['TaskBoardEvent', TaskBoardEventSchema, fixtures.taskBoardEventFixtures],
  ['WorkflowEvent', WorkflowEventSchema, fixtures.workflowEventFixtures],
  ['ClientTerminalMessage', ClientTerminalMessageSchema, fixtures.clientTerminalMessageFixtures],
  ['ServerTerminalMessage', ServerTerminalMessageSchema, fixtures.serverTerminalMessageFixtures],
];

describe('WS event unions: every discriminant has a fixture and survives encode→decode', () => {
  it.each(unions)('%s', (_name, schema, members) => {
    // discriminant coverage: the schema's options each appear at least once.
    const optionTypes = (
      schema as unknown as { options: { shape: { type: { value: string } } }[] }
    ).options.map((o) => o.shape.type.value);
    const fixtureTypes = members.map((m) => m.type);
    for (const t of optionTypes) expect(fixtureTypes).toContain(t);

    // encode → decode identity for every member.
    for (const member of members) {
      const decoded = schema.parse(JSON.parse(JSON.stringify(member)));
      expect(decoded).toEqual(member);
    }
  });
});
