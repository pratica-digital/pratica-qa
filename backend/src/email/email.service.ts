import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as net from 'node:net';
import * as tls from 'node:tls';

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

type SmtpSocket = net.Socket | tls.TLSSocket;

type SmtpResponse = {
  code: number;
  text: string;
};

@Injectable()
export class EmailService {
  constructor(private readonly configService: ConfigService) {}

  async send(message: EmailMessage) {
    const smtpHost = this.configService.get<string>('SMTP_HOST');

    if (!smtpHost) {
      throw new Error('SMTP_HOST is required to send email');
    }

    await this.sendWithSmtp(message, smtpHost);
  }

  private async sendWithSmtp(message: EmailMessage, smtpHost: string) {
    const smtpPort = this.getNumber('SMTP_PORT');
    const smtpSecure = this.getBoolean('SMTP_SECURE');
    const smtpRequireTls = this.getBoolean('SMTP_REQUIRE_TLS');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');
    const from = this.configService.getOrThrow<string>('MAIL_FROM');

    let socket = await this.connect(smtpHost, smtpPort, smtpSecure);

    try {
      await this.expect(socket, [220]);
      await this.command(socket, `EHLO ${this.getHostname()}`, [250]);

      if (!smtpSecure && smtpRequireTls) {
        await this.command(socket, 'STARTTLS', [220]);
        socket = await this.upgradeToTls(socket, smtpHost);
        await this.command(socket, `EHLO ${this.getHostname()}`, [250]);
      }

      if (smtpUser || smtpPassword) {
        if (!smtpUser || !smtpPassword) {
          throw new Error('SMTP_USER and SMTP_PASSWORD must be configured together');
        }

        await this.command(socket, 'AUTH LOGIN', [334]);
        await this.command(socket, Buffer.from(smtpUser).toString('base64'), [334]);
        await this.command(socket, Buffer.from(smtpPassword).toString('base64'), [235]);
      }

      await this.command(socket, `MAIL FROM:<${this.extractEmailAddress(from)}>`, [250]);
      await this.command(socket, `RCPT TO:<${message.to}>`, [250, 251]);
      await this.command(socket, 'DATA', [354]);
      await this.writeData(socket, this.buildMimeMessage(from, message));
      await this.command(socket, 'QUIT', [221]);
    } finally {
      socket.end();
    }
  }

  private connect(host: string, port: number, secure: boolean): Promise<SmtpSocket> {
    return new Promise((resolve, reject) => {
      const socket = secure ? tls.connect({ host, port, servername: host }) : net.connect({ host, port });

      socket.setEncoding('utf8');
      socket.setTimeout(this.getNumber('SMTP_TIMEOUT_MS'));
      socket.once(secure ? 'secureConnect' : 'connect', () => resolve(socket));
      socket.once('error', reject);
      socket.once('timeout', () => {
        socket.destroy();
        reject(new Error('SMTP connection timed out'));
      });
    });
  }

  private upgradeToTls(socket: SmtpSocket, host: string): Promise<tls.TLSSocket> {
    return new Promise((resolve, reject) => {
      const secureSocket = tls.connect({ socket, servername: host });

      secureSocket.setEncoding('utf8');
      secureSocket.setTimeout(this.getNumber('SMTP_TIMEOUT_MS'));
      secureSocket.once('secureConnect', () => resolve(secureSocket));
      secureSocket.once('error', reject);
      secureSocket.once('timeout', () => {
        secureSocket.destroy();
        reject(new Error('SMTP TLS handshake timed out'));
      });
    });
  }

  private async command(socket: SmtpSocket, command: string, expectedCodes: number[]) {
    const response = this.expect(socket, expectedCodes);
    socket.write(`${command}\r\n`);
    return response;
  }

  private async writeData(socket: SmtpSocket, message: string) {
    const safeMessage = message
      .replace(/\r?\n/g, '\r\n')
      .split('\r\n')
      .map((line) => (line.startsWith('.') ? `.${line}` : line))
      .join('\r\n');

    const response = this.expect(socket, [250]);
    socket.write(`${safeMessage}\r\n.\r\n`);
    await response;
  }

  private expect(socket: SmtpSocket, expectedCodes: number[]): Promise<SmtpResponse> {
    return new Promise((resolve, reject) => {
      let data = '';

      const cleanup = () => {
        socket.off('data', onData);
        socket.off('error', onError);
        socket.off('timeout', onTimeout);
      };

      const onData = (chunk: string | Buffer) => {
        data += chunk.toString();
        const lines = data.split(/\r?\n/).filter(Boolean);
        const lastLine = lines[lines.length - 1];

        if (!lastLine || !/^\d{3} /.test(lastLine)) {
          return;
        }

        cleanup();
        const code = Number(lastLine.slice(0, 3));

        if (!expectedCodes.includes(code)) {
          reject(new Error(`Unexpected SMTP response ${code}: ${data.trim()}`));
          return;
        }

        resolve({ code, text: data });
      };

      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const onTimeout = () => {
        cleanup();
        socket.destroy();
        reject(new Error('SMTP response timed out'));
      };

      socket.on('data', onData);
      socket.once('error', onError);
      socket.once('timeout', onTimeout);
    });
  }

  private buildMimeMessage(from: string, message: EmailMessage) {
    const headers = [
      `From: ${this.sanitizeHeader(from)}`,
      `To: ${this.sanitizeHeader(message.to)}`,
      `Subject: ${this.sanitizeHeader(message.subject)}`,
      `Date: ${new Date().toUTCString()}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
    ];

    return `${headers.join('\r\n')}\r\n\r\n${message.text}`;
  }

  private sanitizeHeader(value: string) {
    return value.replace(/[\r\n]+/g, ' ').trim();
  }

  private extractEmailAddress(value: string) {
    const match = value.match(/<([^>]+)>/);
    return (match?.[1] ?? value).trim();
  }

  private getHostname() {
    return this.configService.getOrThrow<string>('SMTP_HELO_NAME');
  }

  private getBoolean(key: string) {
    const value = this.configService.get<string | boolean>(key);

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return ['1', 'true', 'yes'].includes(value.toLowerCase());
    }

    throw new Error(`${key} is required`);
  }

  private getNumber(key: string) {
    const value = Number(this.configService.get<string | number>(key));

    if (!Number.isFinite(value)) {
      throw new Error(`${key} must be a number`);
    }

    return value;
  }
}
