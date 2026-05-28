#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

program
  .name('midnite')
  .description('Multitask Claude Code — CLI client for the midnite gateway')
  .version('0.0.0');

program
  .command('add <title>')
  .description('Add a task to the backlog (or todo if classified as ready)')
  .action((_title: string) => {
    console.log('not implemented yet');
  });

program
  .command('list')
  .description('List tasks')
  .option('-s, --status <status>', 'filter by status')
  .action((_opts) => {
    console.log('not implemented yet');
  });

program
  .command('move <id> <status>')
  .description('Move a task to a new status')
  .action((_id: string, _status: string) => {
    console.log('not implemented yet');
  });

program
  .command('serve')
  .description('Start the midnite gateway daemon')
  .action(() => {
    console.log('not implemented yet');
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
