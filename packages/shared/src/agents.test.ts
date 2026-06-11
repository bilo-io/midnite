import { describe, expect, it } from 'vitest';
import {
  AGENT_CLIS,
  AGENT_CLI_COMMAND,
  AGENT_CLI_INSTALL_COMMAND,
  AGENT_CLI_LABEL,
  AGENT_CLI_UNINSTALL_COMMAND,
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
    expect(AGENT_CLIS).toEqual(expect.arrayContaining(['aider', 'opencode']));
  });
});
