import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

describe('MailService', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('sends email through Microsoft Graph sendMail', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'graph-token',
            expires_in: 3600,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 202 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const service = new MailService(createConfigService());
    const result = await service.sendMail({
      attachments: [
        {
          content: Buffer.from('logo'),
          contentId: 'brand-logo',
          contentType: 'image/png',
          filename: 'logo.png',
          isInline: true,
        },
      ],
      html: '<strong>hello</strong>',
      subject: 'Password reset',
      to: 'User One <one@example.com>, two@example.com',
    });

    expect(result).toMatchObject({
      accepted: ['one@example.com', 'two@example.com'],
      response: '202 Accepted',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://graph.microsoft.com/v1.0/users/sender%40example.com/sendMail',
      expect.objectContaining({
        method: 'POST',
      }),
    );

    const tokenBody = fetchMock.mock.calls[0][1].body as URLSearchParams;
    expect(tokenBody.get('client_id')).toBe('client-id');
    expect(tokenBody.get('grant_type')).toBe('client_credentials');
    expect(tokenBody.get('scope')).toBe('https://graph.microsoft.com/.default');

    const sendBody = JSON.parse(fetchMock.mock.calls[1][1].body as string) as Record<string, any>;
    expect(sendBody).toMatchObject({
      saveToSentItems: false,
      message: {
        body: {
          content: '<strong>hello</strong>',
          contentType: 'HTML',
        },
        subject: 'Password reset',
        attachments: [
          expect.objectContaining({
            contentBytes: Buffer.from('logo').toString('base64'),
            contentId: 'brand-logo',
            contentType: 'image/png',
            isInline: true,
            name: 'logo.png',
          }),
        ],
        toRecipients: [
          {
            emailAddress: {
              address: 'one@example.com',
              name: 'User One',
            },
          },
          {
            emailAddress: {
              address: 'two@example.com',
            },
          },
        ],
      },
    });
  });

  it('raises Microsoft Graph errors with status details', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'graph-token',
            expires_in: 3600,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: 'ErrorAccessDenied',
              message: 'Access is denied.',
            },
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 403,
          },
        ),
      );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const service = new MailService(createConfigService());

    await expect(
      service.sendMail({
        subject: 'Password reset',
        text: 'hello',
        to: 'one@example.com',
      }),
    ).rejects.toMatchObject({
      code: 'ErrorAccessDenied',
      responseCode: 403,
    });
  });

  function createConfigService(overrides: Record<string, string> = {}) {
    const values = {
      MAIL_GRAPH_CLIENT_ID: 'client-id',
      MAIL_GRAPH_CLIENT_SECRET: 'client-secret',
      MAIL_GRAPH_TENANT_ID: 'tenant-id',
      MAIL_GRAPH_USER: 'sender@example.com',
      ...overrides,
    };

    return {
      get: jest.fn((key: string) => values[key as keyof typeof values]),
    } as unknown as ConfigService;
  }
});
