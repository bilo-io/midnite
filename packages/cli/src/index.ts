#!/usr/bin/env node
import { Command } from 'commander';
import { createClient, parseStatus, resolveBaseUrl } from './client';

const program = new Command();

program
  .name('midnite')
  .description('Multitask coding agents — CLI client for the midnite gateway')
  .version('0.0.0')
  .option('--gateway <url>', 'gateway base URL (else $MIDNITE_GATEWAY_URL, else http://localhost:7777)');

function client(): ReturnType<typeof createClient> {
  return createClient(resolveBaseUrl(program.opts().gateway as string | undefined));
}

program
  .command('add <prompt>')
  .description('Add a task (the gateway triages it to todo or backlog)')
  .option('--repo <name>', 'assign the task to a registered repo (its session opens there)')
  .action(async (prompt: string, opts: { repo?: string }) => {
    const task = await client().createTask(prompt, { repo: opts.repo });
    console.log(`added ${task.id}  [${task.status}]  ${task.title}`);
  });

program
  .command('list')
  .description('List tasks')
  .option('-s, --status <status>', 'filter by status')
  .action(async (opts: { status?: string }) => {
    const status = opts.status ? parseStatus(opts.status) : undefined;
    const tasks = await client().listTasks(status);
    if (tasks.length === 0) {
      console.log('no tasks');
      return;
    }
    const idW = Math.max(...tasks.map((t) => t.id.length), 2);
    const stW = Math.max(...tasks.map((t) => t.status.length), 6);
    for (const t of tasks) {
      console.log(`${t.id.padEnd(idW)}  ${t.status.padEnd(stW)}  ${t.title}`);
    }
  });

program
  .command('move <id> <status>')
  .description('Move a task to a new status')
  .action(async (id: string, status: string) => {
    const task = await client().moveTask(id, parseStatus(status));
    console.log(`moved ${task.id} → ${task.status}`);
  });

program
  .command('serve')
  .description('Start the midnite gateway daemon in-process')
  .action(async () => {
    // Lazy, indirect import so the gateway (and its native deps) only load for
    // `serve` — `add`/`list`/`move` stay pure HTTP clients and keep working even
    // if the gateway build is unavailable. The variable specifier also keeps the
    // CLI's typecheck decoupled from the gateway build.
    const spec = '@midnite/gateway/bootstrap';
    const mod = (await import(spec)) as { startGateway: () => Promise<unknown> };
    await mod.startGateway();
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
