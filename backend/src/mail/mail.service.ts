import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type MailAddress = string | { address: string; name?: string };
type MailAddressInput = MailAddress | MailAddress[];

export type MailAttachment = {
  content?: Buffer | string;
  contentId?: string;
  contentType?: string;
  filename?: string | false;
  isInline?: boolean;
};

export type MailOptions = {
  attachments?: MailAttachment[];
  bcc?: MailAddressInput;
  cc?: MailAddressInput;
  from?: MailAddressInput;
  html?: Buffer | string;
  replyTo?: MailAddressInput;
  subject?: string;
  text?: Buffer | string;
  to?: MailAddressInput;
};

export type MailDeliveryInfo = {
  accepted: string[];
  messageId: string;
  rejected: string[];
  response: string;
};

type GraphMailConfig = {
  clientId: string;
  clientSecret: string;
  endpoint: string;
  saveToSentItems: boolean;
  scope: string;
  senderAddress: string;
  tenantId: string;
  tokenEndpoint: string;
};

type GraphToken = {
  accessToken: string;
  expiresAt: number;
};

type GraphTokenResponse = {
  access_token?: unknown;
  error?: unknown;
  error_description?: unknown;
  expires_in?: unknown;
};

type GraphEmailAddress = {
  emailAddress: {
    address: string;
    name?: string;
  };
};

type GraphSendMailMessage = {
  attachments?: Array<{
    '@odata.type': '#microsoft.graph.fileAttachment';
    contentBytes: string;
    contentId?: string;
    contentType?: string;
    isInline?: boolean;
    name: string;
  }>;
  bccRecipients?: GraphEmailAddress[];
  body: {
    content: string;
    contentType: 'HTML' | 'Text';
  };
  ccRecipients?: GraphEmailAddress[];
  replyTo?: GraphEmailAddress[];
  subject: string;
  toRecipients: GraphEmailAddress[];
};

export const MAIL_SENDER_ADDRESS = process.env.MAIL_SENDER_ADDRESS ?? process.env.MAIL_GRAPH_USER ?? '';

@Injectable()
export class MailService {
  private readonly graphConfig: GraphMailConfig;
  private readonly logger = new Logger(MailService.name);
  private readonly sensitiveValues: string[];
  private token?: GraphToken;

  constructor(private readonly configService: ConfigService) {
    this.graphConfig = this.getGraphConfig();
    this.sensitiveValues = this.getSensitiveValues();
  }

  get senderAddress() {
    return this.graphConfig.senderAddress;
  }

  async sendMail(mailOptions: MailOptions): Promise<MailDeliveryInfo> {
    const options = {
      ...mailOptions,
      from: mailOptions.from ?? this.senderAddress,
    };

    try {
      const token = await this.getAccessToken();
      const message = this.buildGraphMessage(options);
      const response = await fetch(this.getSendMailUrl(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          saveToSentItems: this.graphConfig.saveToSentItems,
        }),
      });

      if (response.status !== 202) {
        throw await this.toGraphError(response);
      }

      const info: MailDeliveryInfo = {
        accepted: message.toRecipients.map((recipient) => recipient.emailAddress.address),
        messageId: 'microsoft-graph-accepted',
        rejected: [],
        response: '202 Accepted',
      };

      this.logSuccess(info, options);
      return info;
    } catch (error) {
      this.logFailure(error, options);
      throw error;
    }
  }

  private async getAccessToken() {
    if (this.token && this.token.expiresAt > Date.now()) {
      return this.token.accessToken;
    }

    const body = new URLSearchParams({
      client_id: this.graphConfig.clientId,
      client_secret: this.graphConfig.clientSecret,
      grant_type: 'client_credentials',
      scope: this.graphConfig.scope,
    });
    const response = await fetch(this.graphConfig.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    const data = (await response.json()) as GraphTokenResponse;

    if (!response.ok || typeof data.access_token !== 'string') {
      const description = typeof data.error_description === 'string' ? data.error_description : undefined;
      const error = typeof data.error === 'string' ? data.error : `HTTP ${response.status}`;
      const tokenError = new Error(`Microsoft Graph token request failed: ${description ?? error}`);
      Object.assign(tokenError, { code: 'EGRAPH_TOKEN', responseCode: response.status });
      throw tokenError;
    }

    const expiresIn = Number(data.expires_in);
    const expiresAt = Number.isFinite(expiresIn)
      ? Date.now() + Math.max(expiresIn - 60, 1) * 1000
      : Date.now() + 55 * 60 * 1000;

    this.token = {
      accessToken: data.access_token,
      expiresAt,
    };
    this.logger.log(`Microsoft Graph access token renovado para envio de email. expires=${new Date(expiresAt).toISOString()}`);

    return this.token.accessToken;
  }

  private buildGraphMessage(mailOptions: MailOptions): GraphSendMailMessage {
    const toRecipients = this.toGraphRecipients(mailOptions.to);

    if (toRecipients.length === 0) {
      throw new Error('At least one email recipient is required.');
    }

    const html = this.toContent(mailOptions.html);
    const text = this.toContent(mailOptions.text);
    const message: GraphSendMailMessage = {
      body: {
        content: html || text,
        contentType: html ? 'HTML' : 'Text',
      },
      subject: mailOptions.subject ?? '',
      toRecipients,
    };
    const ccRecipients = this.toGraphRecipients(mailOptions.cc);
    const bccRecipients = this.toGraphRecipients(mailOptions.bcc);
    const replyTo = this.toGraphRecipients(mailOptions.replyTo);

    if (ccRecipients.length > 0) {
      message.ccRecipients = ccRecipients;
    }

    if (bccRecipients.length > 0) {
      message.bccRecipients = bccRecipients;
    }

    if (replyTo.length > 0) {
      message.replyTo = replyTo;
    }

    const attachments = this.toGraphAttachments(mailOptions.attachments);

    if (attachments.length > 0) {
      message.attachments = attachments;
    }

    return message;
  }

  private toGraphAttachments(attachments: MailAttachment[] = []) {
    return attachments.map((attachment) => {
      if (!attachment.content) {
        throw new Error('Microsoft Graph mail attachments require inline content.');
      }

      return {
        '@odata.type': '#microsoft.graph.fileAttachment' as const,
        contentBytes: Buffer.isBuffer(attachment.content)
          ? attachment.content.toString('base64')
          : Buffer.from(attachment.content).toString('base64'),
        contentId: attachment.contentId,
        contentType: attachment.contentType,
        isInline: attachment.isInline,
        name: typeof attachment.filename === 'string' && attachment.filename ? attachment.filename : 'attachment',
      };
    });
  }

  private toGraphRecipients(value: MailAddressInput | undefined): GraphEmailAddress[] {
    return this.toAddressList(value).map((address) => ({
      emailAddress: address,
    }));
  }

  private toAddressList(value: MailAddressInput | undefined) {
    if (!value) {
      return [];
    }

    const values = Array.isArray(value) ? value : [value];
    const addresses: MailAddress[] = [];

    for (const item of values) {
      if (typeof item === 'string') {
        addresses.push(...item.split(','));
      } else {
        addresses.push(item);
      }
    }

    return addresses
      .map((item) => this.toGraphEmailAddress(item))
      .filter((item): item is GraphEmailAddress['emailAddress'] => Boolean(item));
  }

  private toGraphEmailAddress(value: MailAddress) {
    if (typeof value !== 'string') {
      return value.address
        ? {
            address: value.address,
            name: value.name,
          }
        : undefined;
    }

    const normalized = value.trim();

    if (!normalized) {
      return undefined;
    }

    const match = normalized.match(/^(.*?)\s*<([^>]+)>$/);

    if (!match) {
      return {
        address: normalized,
      };
    }

    const name = match[1].trim().replace(/^"|"$/g, '');

    return {
      address: match[2].trim(),
      name: name || undefined,
    };
  }

  private async toGraphError(response: Response) {
    const contentType = response.headers.get('content-type') ?? '';
    const body = contentType.includes('application/json') ? await response.json() : await response.text();
    const record = this.toRecord(body);
    const nestedError = this.toRecord(record.error);
    const message =
      typeof nestedError.message === 'string'
        ? nestedError.message
        : typeof body === 'string' && body
          ? body
          : `HTTP ${response.status}`;
    const error = new Error(`Microsoft Graph sendMail failed: ${message}`);
    Object.assign(error, {
      code: typeof nestedError.code === 'string' ? nestedError.code : 'EGRAPH_SEND_MAIL',
      response: typeof body === 'string' ? body : JSON.stringify(body),
      responseCode: response.status,
    });
    return error;
  }

  private getSendMailUrl() {
    const endpoint = this.graphConfig.endpoint.replace(/\/$/, '');
    const user = encodeURIComponent(this.graphConfig.senderAddress);
    return `${endpoint}/v1.0/users/${user}/sendMail`;
  }

  private getGraphConfig(): GraphMailConfig {
    const tenantId = this.getRequiredString('MAIL_GRAPH_TENANT_ID', 'TENANT_ID');
    const endpoint = this.getString('MAIL_GRAPH_ENDPOINT') ?? 'https://graph.microsoft.com';
    const senderAddress = this.getRequiredString(
      'MAIL_GRAPH_USER',
      'MAIL_SENDER_ADDRESS',
    );

    return {
      clientId: this.getRequiredString('MAIL_GRAPH_CLIENT_ID', 'CLIENT_ID'),
      clientSecret: this.getRequiredString('MAIL_GRAPH_CLIENT_SECRET', 'CLIENT_SECRET'),
      endpoint,
      saveToSentItems: this.getBoolean('MAIL_GRAPH_SAVE_TO_SENT_ITEMS', false),
      scope: this.getString('MAIL_GRAPH_SCOPE') ?? `${endpoint.replace(/\/$/, '')}/.default`,
      senderAddress,
      tenantId,
      tokenEndpoint:
        this.getString('MAIL_GRAPH_TOKEN_ENDPOINT') ??
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    };
  }

  private logSuccess(info: MailDeliveryInfo, mailOptions: MailOptions) {
    this.logger.log(
      `Email enviado com sucesso. transport=microsoft-graph to=${this.formatRecipients(
        mailOptions.to,
      )} subject="${this.sanitize(mailOptions.subject ?? '')}" response="${info.response}"`,
    );
  }

  private logFailure(error: unknown, mailOptions: MailOptions) {
    const record = this.toRecord(error);
    const code = typeof record.code === 'string' ? record.code : undefined;
    const response = typeof record.response === 'string' ? record.response : undefined;
    const responseCode = typeof record.responseCode === 'number' ? record.responseCode : undefined;
    const message = error instanceof Error ? error.message : 'Erro desconhecido do Microsoft Graph';
    const stack = error instanceof Error && error.stack ? this.sanitize(error.stack) : undefined;

    this.logger.error(
      [
        'Falha ao enviar email.',
        `transport=microsoft-graph`,
        `tipo="${this.classifyError(code, responseCode)}"`,
        `to=${this.formatRecipients(mailOptions.to)}`,
        `subject="${this.sanitize(mailOptions.subject ?? '')}"`,
        code ? `code=${code}` : undefined,
        responseCode ? `responseCode=${responseCode}` : undefined,
        response ? `response="${this.sanitize(response)}"` : undefined,
        `error="${this.sanitize(message)}"`,
      ]
        .filter((part): part is string => Boolean(part))
        .join(' '),
      stack,
    );
  }

  private classifyError(code?: string, responseCode?: number) {
    if (code === 'EGRAPH_TOKEN' || responseCode === 401 || responseCode === 403) {
      return 'falha de autenticacao/autorizacao Microsoft Graph';
    }

    if (responseCode === 404) {
      return 'mailbox remetente nao encontrada no Microsoft Graph';
    }

    if (responseCode === 429 || (responseCode && responseCode >= 500)) {
      return 'falha temporaria do Microsoft Graph';
    }

    return 'erro retornado pelo Microsoft Graph';
  }

  private getSensitiveValues() {
    return [
      this.getString('MAIL_GRAPH_CLIENT_SECRET'),
      this.getString('CLIENT_SECRET'),
    ].filter((value): value is string => Boolean(value && value.length >= 4));
  }

  private formatRecipients(value: MailAddressInput | undefined) {
    const recipients = this.toAddressList(value).map((address) =>
      address.name ? `${address.name} <${address.address}>` : address.address,
    );

    return recipients.length > 0 ? recipients.join(', ') : 'n/a';
  }

  private sanitize(value: string) {
    return this.sensitiveValues.reduce(
      (sanitized, secret) => sanitized.split(secret).join('[redacted]'),
      value.replace(/(access_token|refresh_token|client_secret|token)=[^\s"'&]+/gi, '$1=[redacted]'),
    );
  }

  private toContent(value: Buffer | string | undefined) {
    if (value === undefined) {
      return '';
    }

    return Buffer.isBuffer(value) ? value.toString('utf8') : value;
  }

  private getRequiredString(...keys: string[]) {
    const key = keys.find((item) => this.getString(item));
    const value = key ? this.getString(key) : undefined;

    if (!value) {
      throw new Error(`${keys.join(' or ')} is required for Microsoft Graph email sending.`);
    }

    return value;
  }

  private getString(key: string) {
    const value = this.configService.get<string>(key);
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private getBoolean(key: string, fallback: boolean) {
    const value = this.configService.get<string | boolean | undefined>(key);

    if (value === undefined || value === null || value === '') {
      return fallback;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    return ['1', 'true', 'yes', 'y'].includes(value.toLowerCase());
  }

  private toRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }
}
