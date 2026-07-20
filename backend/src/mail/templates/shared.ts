import { brandLogoBase64 } from './brand-logo';
import { qualityImageBase64 } from './quality-image';
import type { MailAttachment } from '../mail.service';

export type MailTemplate = {
  attachments: MailAttachment[];
  html: string;
  subject: string;
  text: string;
};

type TokenBlock = {
  helperText: string;
  label: string;
  value: string;
};

type TemplateShellParams = {
  actionLabel: string;
  actionUrl: string;
  body: string;
  expiresAt: Date;
  footerNote: string;
  preheader: string;
  securityNotice: string;
  subject: string;
  textBody: string[];
  title: string;
  tokenBlock?: TokenBlock;
};

const brandName = 'QA Platform';
const brandLogoContentId = 'qa-platform-brand-logo';
const qualityImageContentId = 'qa-platform-quality-image';
const brandBlue = '#1c4484';
const brandGreen = '#adff2f';

export function renderEmailShell(params: TemplateShellParams): MailTemplate {
  const expiration = formatExpiration(params.expiresAt);
  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(params.subject)}</title>
  </head>
  <body style="margin:0;background:#f4f7fb;color:#172033;font-family:Arial,Helvetica,sans-serif;">
    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">
      ${escapeHtml(params.preheader)}
    </span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #dce5f2;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:${brandBlue};padding:24px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <img src="cid:${brandLogoContentId}" width="160" alt="${brandName}" style="display:block;width:160px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;">
                      <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:10px;">
                        <tr>
                          <td style="width:24px;vertical-align:middle;">
                            <img src="cid:${qualityImageContentId}" width="12" height="12" alt="" style="display:block;width:24px;height:24px;border:0;outline:none;text-decoration:none;">
                          </td>
                          <td style="padding-left:8px;vertical-align:middle;font-size:16px;color:#c9d7ef;text-transform:uppercase;letter-spacing:1.4px;white-space:nowrap;">
                            QA Workspace
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td align="right">
                      <span style="display:inline-block;width:14px;height:14px;border-radius:999px;background:${brandGreen};"></span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px;">
                <h1 style="margin:0 0 16px;color:#172033;font-size:24px;line-height:1.25;">${escapeHtml(params.title)}</h1>
                <div style="color:#435169;font-size:15px;line-height:1.65;">${params.body}</div>
                ${params.tokenBlock ? renderTokenBlock(params.tokenBlock) : ''}
                <div style="padding:24px 0 18px;text-align:center;">
                  <a href="${escapeAttribute(params.actionUrl)}" style="display:inline-block;border-radius:8px;background:${brandBlue};color:#ffffff;font-size:15px;font-weight:700;line-height:1;padding:15px 22px;text-decoration:none;">
                    ${escapeHtml(params.actionLabel)}
                  </a>
                </div>
                <p style="margin:0 0 8px;color:#435169;font-size:13px;line-height:1.5;">
                  Se o botao nao funcionar, copie e cole este link no navegador:
                </p>
                <p style="margin:0 0 20px;word-break:break-all;color:${brandBlue};font-size:13px;line-height:1.5;">
                  <a href="${escapeAttribute(params.actionUrl)}" style="color:${brandBlue};">${escapeHtml(params.actionUrl)}</a>
                </p>
                <div style="border-radius:10px;background:#f7f9fc;border:1px solid #e5ecf6;padding:16px;color:#435169;font-size:13px;line-height:1.55;">
                  <strong style="color:#172033;">Validade:</strong> este link expira em ${escapeHtml(expiration)}.<br>
                  ${escapeHtml(params.securityNotice)}
                </div>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #e5ecf6;padding:18px 28px;color:#68758a;font-size:12px;line-height:1.5;">
                ${escapeHtml(params.footerNote)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    params.title,
    '',
    ...params.textBody,
    ...(params.tokenBlock
      ? ['', `${params.tokenBlock.label}:`, params.tokenBlock.value, params.tokenBlock.helperText]
      : []),
    '',
    `${params.actionLabel}:`,
    params.actionUrl,
    '',
    `Validade: ${expiration}.`,
    params.securityNotice,
    '',
    params.footerNote,
  ].join('\n');

  return {
    attachments: [
      {
        content: Buffer.from(brandLogoBase64, 'base64'),
        contentId: brandLogoContentId,
        contentType: 'image/png',
        filename: 'pratica-logo.png',
        isInline: true,
      },
      {
        content: Buffer.from(qualityImageBase64, 'base64'),
        contentId: qualityImageContentId,
        contentType: 'image/png',
        filename: 'quality-image.png',
        isInline: true,
      },
    ],
    html,
    subject: params.subject,
    text,
  };
}

export function paragraph(value: string) {
  return `<p style="margin:0 0 14px;">${escapeHtml(value)}</p>`;
}

function renderTokenBlock(params: TokenBlock) {
  return `
                <div style="margin:22px 0 4px;border:1px solid #c7d7ee;border-radius:10px;background:#f7fbff;padding:16px;">
                  <div style="color:#435169;font-size:12px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;">${escapeHtml(params.label)}</div>
                  <div style="margin-top:10px;font-family:'Courier New',Courier,monospace;color:#172033;font-size:18px;font-weight:700;line-height:1.45;word-break:break-all;">${escapeHtml(params.value)}</div>
                  <p style="margin:10px 0 0;color:#435169;font-size:13px;line-height:1.5;">${escapeHtml(params.helperText)}</p>
                </div>`;
}

function formatExpiration(value: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}
