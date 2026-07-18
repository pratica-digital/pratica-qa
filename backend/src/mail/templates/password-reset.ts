import type { MailTemplate } from './shared';
import { paragraph, renderEmailShell } from './shared';

type PasswordResetTemplateParams = {
  actionUrl: string;
  expiresAt: Date;
  token: string;
  userName: string;
};

export function renderPasswordResetTemplate(
  params: PasswordResetTemplateParams,
): MailTemplate {
  const greeting = `Olá, ${params.userName}.`;
  const intro =
    'Recebemos uma solicitação de recuperação de senha para sua conta na QA Platform.';
  const instruction =
    'Use o token abaixo ou acesse o link seguro para criar uma nova senha.';

  return renderEmailShell({
    actionLabel: 'Redefinir senha',
    actionUrl: params.actionUrl,
    body: [
      paragraph(greeting),
      paragraph(intro),
      paragraph(instruction),
    ].join(''),
    expiresAt: params.expiresAt,
    footerNote:
      'Após a criação da nova senha, este link será invalidado automaticamente.',
    preheader: 'Redefina sua senha da QA Platform com segurança.',
    securityNotice:
      'Se você não solicitou essa recuperação, ignore este e-mail. Sua senha atual continuará válida.',
    subject: 'Token para redefinição de senha',
    textBody: [greeting, intro, instruction],
    title: 'Recuperação de senha',
    tokenBlock: {
      helperText:
        'Informe este token na tela de redefinição caso prefira não usar o link.',
      label: 'Token de redefinição',
      value: params.token,
    },
  });
}