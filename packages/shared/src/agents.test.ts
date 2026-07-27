import { describe, expect, it } from 'vitest';
import {
  AGENT_CLIS,
  AGENT_CLI_BY_KEY,
  AGENT_CLI_CATALOG,
  AGENT_CLI_COMMAND,
  AGENT_CLI_DEFAULT,
  AGENT_CLI_INSTALL_COMMAND,
  AGENT_CLI_LABEL,
  AGENT_CLI_UNINSTALL_COMMAND,
  coerceAgentCli,
} from './agents.js';

describe('agent CLI command maps', () => {
  it('defines a launch, label, install and uninstall entry for every CLI', () => {
    for (const cli of AGENT_CLIS) {
      expect(AGENT_CLI_COMMAND[cli]).toBeTruthy();
      expect(AGENT_CLI_LABEL[cli]).toBeTruthy();
      expect(AGENT_CLI_INSTALL_COMMAND[cli]).toBeTruthy();
      expect(AGENT_CLI_UNINSTALL_COMMAND[cli]).toBeTruthy();
    }
  });

  it('includes the newly-added CLIs', () => {
    expect(AGENT_CLIS).toEqual(expect.arrayContaining(['hermes', 'opencode']));
  });
});

describe('AGENT_CLI_CATALOG', () => {
  it('has exactly one fully-populated entry per supported CLI', () => {
    expect(AGENT_CLI_CATALOG.map((e) => e.key).sort()).toEqual([...AGENT_CLIS].sort());
    for (const entry of AGENT_CLI_CATALOG) {
      expect(entry.name).toBeTruthy();
      expect(entry.homepageUrl).toMatch(/^https?:\/\//);
      expect(entry.command).toBeTruthy();
      expect(entry.setupCommand).toBeTruthy();
      expect(entry.uninstallCommand).toBeTruthy();
    }
  });

  it('keys the by-key lookup off the catalog', () => {
    for (const entry of AGENT_CLI_CATALOG) {
      expect(AGENT_CLI_BY_KEY[entry.key]).toBe(entry);
    }
  });

  it('derives the lookup maps from the catalog', () => {
    for (const entry of AGENT_CLI_CATALOG) {
      expect(AGENT_CLI_LABEL[entry.key]).toBe(entry.name);
      expect(AGENT_CLI_COMMAND[entry.key]).toBe(entry.command);
      expect(AGENT_CLI_INSTALL_COMMAND[entry.key]).toBe(entry.setupCommand);
      expect(AGENT_CLI_UNINSTALL_COMMAND[entry.key]).toBe(entry.uninstallCommand);
    }
  });

  it('prefers Homebrew for CLIs without a vendor-specific installer', () => {
    // claude + antigravity + hermes carry vendor-recommended installers; the rest default to brew.
    expect(AGENT_CLI_INSTALL_COMMAND.codex).toContain('brew install');
    expect(AGENT_CLI_INSTALL_COMMAND.opencode).toContain('brew install');
    expect(AGENT_CLI_INSTALL_COMMAND.claude).toContain('claude.ai/install.sh');
    expect(AGENT_CLI_INSTALL_COMMAND.antigravity).toContain('antigravity.google/cli/install.sh');
    expect(AGENT_CLI_INSTALL_COMMAND.hermes).toContain(
      'hermes-agent.nousresearch.com/install.sh',
    );
  });
});

describe('coerceAgentCli', () => {
  it('passes a current CLI through unchanged', () => {
    for (const cli of AGENT_CLIS) {
      expect(coerceAgentCli(cli)).toBe(cli);
    }
  });

  it('maps retired CLIs to their successor', () => {
    expect(coerceAgentCli('gemini')).toBe('antigravity');
    expect(coerceAgentCli('aider')).toBe('hermes');
  });

  it('falls back to the default for unknown or missing values', () => {
    expect(coerceAgentCli('nonesuch')).toBe(AGENT_CLI_DEFAULT);
    expect(coerceAgentCli(undefined)).toBe(AGENT_CLI_DEFAULT);
    expect(coerceAgentCli(null)).toBe(AGENT_CLI_DEFAULT);
  });
});
