import { Inject, Injectable } from '@nestjs/common';
import { EmailSendParamsSchema } from '@midnite/shared';
import nodemailer from 'nodemailer';
import { WorkflowCredentialsService } from '../../credentials/workflow-credentials.service';
import type { NodeExecutor, NodeRunContext } from '../node-executor';

/** Send an email via SMTP using a saved `smtp` credential (nodemailer). */
@Injectable()
export class EmailSendExecutor implements NodeExecutor {
  readonly typeId = 'email.send';

  constructor(
    @Inject(WorkflowCredentialsService)
    private readonly credentials: WorkflowCredentialsService,
  ) {}

  async execute(ctx: NodeRunContext): Promise<unknown> {
    const params = EmailSendParamsSchema.parse(ctx.params);

    const cred = await this.credentials.resolve(params.credentialId);
    if (!cred) {
      throw new Error(`credential ${params.credentialId} not found or could not be decrypted`);
    }
    if (cred.type !== 'smtp') {
      throw new Error(`expected an 'smtp' credential, got '${cred.type}'`);
    }

    const from = cred.from ?? cred.username;
    ctx.log('info', `sending email to ${params.to} via ${cred.host}:${cred.port}`);

    const transporter = nodemailer.createTransport({
      host: cred.host,
      port: cred.port,
      secure: cred.secure ?? cred.port === 465,
      auth: { user: cred.username, pass: cred.password },
    });

    const info = await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });

    ctx.log('info', `email sent (messageId: ${info.messageId})`);
    return { ok: true, messageId: info.messageId, accepted: info.accepted };
  }
}
