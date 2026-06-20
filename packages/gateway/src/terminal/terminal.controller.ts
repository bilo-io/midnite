import { BadRequestException, Controller, Inject, Param, Post } from '@nestjs/common';
import {
  AGENT_CLI_COMMAND,
  AGENT_CLI_INSTALL_COMMAND,
  AGENT_CLI_UNINSTALL_COMMAND,
  AgentCliSchema,
  CliTerminalActionSchema,
  EnvToolActionSchema,
  EnvToolIdSchema,
  envToolMeta,
  type InstallTerminalResponse,
} from '@midnite/shared';
import { TerminalService, buildInstallInitCommand } from './terminal.service';

@Controller('terminal')
export class TerminalController {
  constructor(@Inject(TerminalService) private readonly terminal: TerminalService) {}

  /**
   * Register a standalone terminal for a CLI and return its id. The server builds
   * the command — the client never sends shell strings.
   * - `install`: paste the install + verify + launch chain (waits for Enter).
   * - `uninstall`: show the binary path, then the removal command (waits for Enter).
   * - `launch`: run the agent CLI immediately — a live ad-hoc session.
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
    let initCommand: string;
    if (parsedAction.data === 'launch') {
      // Auto-run the agent (trailing \r) so the modal opens straight into a session.
      initCommand = `clear\r${cmd}\r`;
    } else {
      const chain =
        parsedAction.data === 'install'
          ? `${AGENT_CLI_INSTALL_COMMAND[parsedCli.data]} && ${cmd} --version && ${cmd}`
          : // Show where the binary lives first, then run the uninstall command.
            `which ${cmd} && ${AGENT_CLI_UNINSTALL_COMMAND[parsedCli.data]}`;
      initCommand = buildInstallInitCommand(chain);
    }
    const terminalId = this.terminal.createAdHocTerminal(initCommand);
    return { terminalId };
  }

  /**
   * Register a standalone terminal for a system tool (Homebrew, Node, proto,
   * moon) and return its id. Like the CLI route, the server builds the command
   * and the user presses Enter to run it.
   * - `install` / `update`: run the command, then re-probe the version.
   * - `uninstall`: run the removal command.
   */
  @Post('env/:action/:tool')
  createEnvTerminal(
    @Param('action') action: string,
    @Param('tool') tool: string,
  ): InstallTerminalResponse {
    const parsedAction = EnvToolActionSchema.safeParse(action);
    if (!parsedAction.success) throw new BadRequestException(parsedAction.error.message);
    const parsedTool = EnvToolIdSchema.safeParse(tool);
    if (!parsedTool.success) throw new BadRequestException(parsedTool.error.message);

    const meta = envToolMeta(parsedTool.data);
    if (!meta) throw new BadRequestException(`Unknown tool: ${parsedTool.data}`);

    const cmd =
      parsedAction.data === 'install'
        ? meta.installCommand
        : parsedAction.data === 'update'
          ? meta.updateCommand
          : meta.uninstallCommand;
    // install/update confirm the result by re-printing the version; uninstall
    // just runs.
    const chain =
      parsedAction.data === 'uninstall' ? cmd : `${cmd} && ${meta.command} --version`;
    const terminalId = this.terminal.createAdHocTerminal(buildInstallInitCommand(chain));
    return { terminalId };
  }
}
