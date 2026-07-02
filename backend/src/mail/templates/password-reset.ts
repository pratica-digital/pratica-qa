import type { MailTemplate } from './shared';
import { paragraph, renderEmailShell } from './shared';

type PasswordResetTemplateParams = {
  actionUrl: string;
  expiresAt: Date;
  token: string;
  userName: string;
};

export function renderPasswordResetTemplate(params: PasswordResetTemplateParams): MailTemplate {
  const greeting = `Ola, ${params.userName}.`;
  const intro = 'Recebemos uma solicitacao de recuperacao de senha para sua conta na QA Platform.';
  const instruction = 'Use o token abaixo ou acesse o link seguro para criar uma nova senha.';

  return renderEmailShell({
    actionLabel: 'Redefinir senha',
    actionUrl: params.actionUrl,
    body: [paragraph(greeting), paragraph(intro), paragraph(instruction)].join(''),
    expiresAt: params.expiresAt,
    footerNote: 'Apos a criacao da nova senha, este link sera invalidado automaticamente.',
    preheader: 'Redefina sua senha da QA Platform com seguranca.',
    securityNotice: 'Se voce nao solicitou essa recuperacao, ignore este e-mail. Sua senha atual continuara valida.',
    subject: 'Token para redefinicao de senha',
    textBody: [greeting, intro, instruction],
    title: 'Recuperacao de senha',
    tokenBlock: {
      helperText: 'Informe este token na tela de redefinicao caso prefira nao usar o link.',
      label: 'Token de redefinicao',
      value: params.token,
    },
  });
}
