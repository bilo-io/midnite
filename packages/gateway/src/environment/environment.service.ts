import { Injectable } from '@nestjs/common';
import {
  ENV_TOOLS_BY_OS,
  type EnvHostOs,
  type EnvToolStatus,
  type EnvironmentResponse,
} from '@midnite/shared';
import { detectCli } from '../agents/cli-detect';

/** Map Node's `process.platform` onto the OS targets the checker tabs for. */
function hostOs(): EnvHostOs {
  switch (process.platform) {
    case 'darwin':
      return 'mac';
    case 'win32':
      return 'windows';
    case 'linux':
      return 'linux';
    default:
      return 'other';
  }
}

@Injectable()
export class EnvironmentService {
  /**
   * The gateway host OS plus the live install-state of every tool defined for
   * that OS. Probes run through the same login-shell detector the agent CLI
   * checker uses, so they see the user's real PATH.
   */
  async getEnvironment(): Promise<EnvironmentResponse> {
    const os = hostOs();
    const tools = os === 'other' ? [] : ENV_TOOLS_BY_OS[os];
    const statuses: EnvToolStatus[] = await Promise.all(
      tools.map(async (tool) => ({ id: tool.id, ...(await detectCli(tool.command)) })),
    );
    return { os, tools: statuses };
  }
}
