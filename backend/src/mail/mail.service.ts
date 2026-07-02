import { Injectable, Logger } from '@nestjs/common';
import type { SentMessageInfo } from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';
import * as nodemailer from 'nodemailer';

const smtpUser = '';
const smtpPassword = '';

export const MAIL_SENDER_ADDRESS = smtpUser;

const params = {
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  tls: {
    rejectUnauthorized: true,
  },
  auth: {
    user: smtpUser,
    pass: smtpPassword,
  },
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter<SentMessageInfo>;

  constructor() {
    this.transporter = nodemailer.createTransport(params);
  }

  async sendMail(mailOptions: Mail.Options): Promise<SentMessageInfo> {
    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logSuccess(info, mailOptions);
      return info;
    } catch (error) {
      this.logFailure(error, mailOptions);
      throw error;
    }
  }

  private logSuccess(info: SentMessageInfo, mailOptions: Mail.Options) {
    const messageId = this.getInfoValue(info, 'messageId') ?? 'n/a';
    const accepted = this.getInfoList(info, 'accepted');
    const rejected = this.getInfoList(info, 'rejected');

    this.logger.log(
      `Email enviado com sucesso. transport=nodemailer to=${this.formatRecipients(
        mailOptions.to,
      )} subject="${this.sanitize(mailOptions.subject ?? '')}" messageId=${messageId}`,
    );

    if (rejected.length > 0) {
      this.logger.warn(
        `Destinatario invalido retornado pelo Nodemailer. transport=nodemailer rejected=${rejected.join(
          ', ',
        )} accepted=${accepted.join(', ') || 'n/a'} subject="${this.sanitize(mailOptions.subject ?? '')}"`,
      );
    }
  }

  private logFailure(error: unknown, mailOptions: Mail.Options) {
    const record = this.toRecord(error);
    const code = typeof record.code === 'string' ? record.code : undefined;
    const command = typeof record.command === 'string' ? record.command : undefined;
    const response = typeof record.response === 'string' ? record.response : undefined;
    const responseCode = typeof record.responseCode === 'number' ? record.responseCode : undefined;
    const category = this.classifyError(code, command, responseCode);
    const message = error instanceof Error ? error.message : 'Erro desconhecido do Nodemailer';
    const stack = error instanceof Error && error.stack ? this.sanitize(error.stack) : undefined;

    this.logger.error(
      [
        'Falha ao enviar email.',
        `transport=nodemailer`,
        `tipo="${category}"`,
        `to=${this.formatRecipients(mailOptions.to)}`,
        `subject="${this.sanitize(mailOptions.subject ?? '')}"`,
        code ? `code=${code}` : undefined,
        command ? `command="${command}"` : undefined,
        responseCode ? `responseCode=${responseCode}` : undefined,
        response ? `response="${this.sanitize(response)}"` : undefined,
        `error="${this.sanitize(message)}"`,
      ]
        .filter((part): part is string => Boolean(part))
        .join(' '),
      stack,
    );
  }

  private classifyError(code?: string, command?: string, responseCode?: number) {
    const normalizedCode = code?.toUpperCase();
    const normalizedCommand = command?.toUpperCase() ?? '';
    const connectionCodes = new Set([
      'ECONNECTION',
      'ECONNREFUSED',
      'ECONNRESET',
      'EHOSTUNREACH',
      'ENOTFOUND',
      'ESOCKET',
      'ETIMEDOUT',
    ]);

    if (
      normalizedCode === 'EAUTH' ||
      normalizedCommand.includes('AUTH') ||
      responseCode === 534 ||
      responseCode === 535
    ) {
      return 'falha de autenticacao SMTP';
    }

    if (normalizedCode && connectionCodes.has(normalizedCode)) {
      return 'falha de conexao SMTP';
    }

    if (normalizedCommand.includes('RCPT') || [501, 550, 551, 553, 554].includes(responseCode ?? 0)) {
      return 'destinatario invalido';
    }

    return 'erro retornado pelo Nodemailer';
  }

  private getInfoValue(info: SentMessageInfo, key: string) {
    const value = this.toRecord(info)[key];
    return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
  }

  private getInfoList(info: SentMessageInfo, key: string) {
    const value = this.toRecord(info)[key];

    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((item) => this.formatRecipient(item));
  }

  private formatRecipients(value: Mail.Options['to']) {
    if (!value) {
      return 'n/a';
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.formatRecipient(item)).join(', ');
    }

    return this.formatRecipient(value);
  }

  private formatRecipient(value: unknown) {
    if (typeof value === 'string') {
      return value;
    }

    const record = this.toRecord(value);
    const address = typeof record.address === 'string' ? record.address : undefined;
    const name = typeof record.name === 'string' ? record.name : undefined;

    if (address) {
      return name ? `${name} <${address}>` : address;
    }

    return String(value);
  }

  private sanitize(value: string) {
    return value.replace(/token=[^\s"'&]+/gi, 'token=[redacted]').replace(smtpPassword, '[smtp-password-redacted]');
  }

  private toRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }
}
