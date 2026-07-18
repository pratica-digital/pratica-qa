import type { MailTemplate } from './shared';
import { paragraph, renderEmailShell } from './shared';

type FirstAccessTemplateParams = {
  actionUrl: string;
  expiresAt: Date;
  token: string;
  userName: string;
};

export function renderFirstAccessTemplate(
  params: FirstAccessTemplateParams,
): MailTemplate {
  const greeting = `Olá, ${params.userName}.`;
  const intro = 'Uma conta foi criada para você na QA Platform.';
  const instruction =
    'Use o token abaixo ou acesse o link seguro para criar sua senha e concluir o primeiro acesso.';

  return renderEmailShell({
    actionLabel: 'Criar senha',
    actionUrl: params.actionUrl,
    body: [
      paragraph(greeting),
      paragraph(intro),
      paragraph(instruction),
    ].join(''),
    expiresAt: params.expiresAt,
    footerNote:
      'Esta mensagem foi enviada automaticamente pela QA Platform.',
    preheader: 'Use seu token para criar a senha de acesso.',
    securityNotice:
      'Se você não esperava este convite, ignore este e-mail e avise o administrador.',
    subject: 'Token para criação de senha',
    textBody: [greeting, intro, instruction],
    title: 'Token para criação de senha',
    tokenBlock: {
      helperText:
        'Informe este token na tela de criação de senha caso prefira não usar o link.',
      label: 'Token de autenticação',
      value: params.token,
    },
  });
}