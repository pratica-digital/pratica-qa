import type { MailTemplate } from './shared';
import { paragraph, renderEmailShell } from './shared';

type FirstAccessTemplateParams = {
  actionUrl: string;
  expiresAt: Date;
  token: string;
  userName: string;
};

export function renderFirstAccessTemplate(params: FirstAccessTemplateParams): MailTemplate {
  const greeting = `Ola, ${params.userName}.`;
  const intro = 'Uma conta foi criada para voce na QA Platform.';
  const instruction =
    'Use o token abaixo ou acesse o link seguro para criar sua senha e concluir o primeiro acesso.';

  return renderEmailShell({
    actionLabel: 'Criar senha',
    actionUrl: params.actionUrl,
    body: [paragraph(greeting), paragraph(intro), paragraph(instruction)].join(''),
    expiresAt: params.expiresAt,
    footerNote: 'Esta mensagem foi enviada automaticamente pela QA Platform.',
    preheader: 'Use seu token para criar a senha de acesso.',
    securityNotice: 'Se voce nao esperava este convite, ignore este e-mail e avise o administrador.',
    subject: 'Token para criacao de senha',
    textBody: [greeting, intro, instruction],
    title: 'Token para criacao de senha',
    tokenBlock: {
      helperText: 'Informe este token na tela de criacao de senha caso prefira nao usar o link.',
      label: 'Token de autenticacao',
      value: params.token,
    },
  });
}
