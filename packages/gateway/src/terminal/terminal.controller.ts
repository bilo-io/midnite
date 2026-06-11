import { BadRequestException, Controller, Inject, Param, Post } from '@nestjs/common';
import {
  AGENT_CLI_COMMAND,
  AGENT_CLI_INSTALL_COMMAND,
  AGENT_CLI_UNINSTALL_COMMAND,
  AgentCliSchema,
  CliTerminalActionSchema,
  type InstallTerminalResponse,
} from '@midnite/shared';
import { TerminalService, buildInstallInitCommand } from './terminal.service';

@Controller('terminal')
export class TerminalController {
  constructor(@Inject(TerminalService) private readonly terminal: TerminalService) {}

  /**
   * Register a standalone terminal that pastes the install or uninstall command for
   * a CLI and returns its id. The server builds the command — the client never sends
   * shell strings. Install also verifies and launches the agent; uninstall pastes
   * just the removal command. Either way it waits at the prompt for the user's Enter.
   */
  @Post(':action/:cli')
  createCliTerminal(
    @Param('action') action: string,
    @Param('cli') cli: string,
  ): InstallTerminalResponse {
    const parsedAction = CliTerminalActionSchema.safeParse(action);
    if (!parsedAction.success) throw new BadRequestException(parsedAction.error.message);
    const parsedCli = AgentCliSchema.safeParse(cli);
    if (!parsedCli.success) throw new BadRequestException(parsedCli.error.message);

    const cmd = AGENT_CLI_COMMAND[parsedCli.data];
    const chain =
      parsedAction.data === 'install'
        ? `${AGENT_CLI_INSTALL_COMMAND[parsedCli.data]} && ${cmd} --version && ${cmd}`
        : // Show where the binary lives first, then run the uninstall command.
          `which ${cmd} && ${AGENT_CLI_UNINSTALL_COMMAND[parsedCli.data]}`;
    const terminalId = this.terminal.createAdHocTerminal(buildInstallInitCommand(chain));
    return { terminalId };
  }
}
