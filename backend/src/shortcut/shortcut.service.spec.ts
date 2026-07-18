import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ShortcutService } from './shortcut.service';

const SHORTCUT_API_URL = 'https://shortcut.example.test/api/v3';

function createConfig(values: Record<string, string>) {
  const config: Record<string, string> = { SHORTCUT_API_URL, ...values };

  return {
    get: jest.fn((key: string, fallback?: string) => config[key] ?? fallback),
  } as unknown as ConfigService;
}

function response(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response;
}

describe('ShortcutService', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('creates a Shortcut story with explicit workflow state and team destination', async () => {
    const service = new ShortcutService(
      createConfig({
        SHORTCUT_API_TOKEN: 'shortcut-token',
        SHORTCUT_WORKFLOW_STATE_ID: '2001',
        SHORTCUT_TEAM_ID: 'team-uuid',
      }),
    );
    global.fetch = jest.fn().mockResolvedValue(
      response({ id: 123, app_url: 'https://story.url', name: '[FAIL] Case' }, 201),
    );

    await expect(
      service.createStory({
        name: '[BUG]',
        description: 'description',
      }),
    ).resolves.toEqual({ id: '123', appUrl: 'https://story.url', name: '[BUG]' });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      `${SHORTCUT_API_URL}/stories`,
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Shortcut-Token': 'shortcut-token',
        },
        body: JSON.stringify({
          description: 'description',
          name: '[BUG]',
          story_type: 'bug',
          workflow_state_id: 2001,
          group_id: 'team-uuid',
        }),
      }),
    );
  });

  it('discovers a workflow state and single team with only SHORTCUT_API_TOKEN', async () => {
    const service = new ShortcutService(createConfig({ SHORTCUT_API_TOKEN: 'shortcut-token' }));
    global.fetch = jest.fn((input: URL | RequestInfo) => {
      const url = String(input);

      if (url.endsWith('/workflows')) {
        return Promise.resolve(
          response([{ id: 10, states: [{ id: 2001, name: 'To Do', type: 'unstarted' }] }]),
        );
      }

      if (url.endsWith('/projects')) {
        return Promise.resolve(response([]));
      }

      if (url.endsWith('/groups')) {
        return Promise.resolve(response([{ id: 'team-uuid', name: 'QA' }]));
      }

      return Promise.resolve(response({ id: 123, app_url: 'https://story.url' }, 201));
    }) as jest.Mock;

    await service.createStory({ name: 'Story', description: 'Description' });

    expect(global.fetch).toHaveBeenCalledWith(
      `${SHORTCUT_API_URL}/stories`,
      expect.objectContaining({
        body: JSON.stringify({
          description: 'Description',
          name: 'Story',
          story_type: 'bug',
          workflow_state_id: 2001,
          group_id: 'team-uuid',
        }),
      }),
    );
  });

  it('uses SHORTCUT_SPACE_ID to select a workflow before falling back to automatic discovery', async () => {
    const service = new ShortcutService(
      createConfig({
        SHORTCUT_API_TOKEN: 'shortcut-token',
        SHORTCUT_SPACE_ID: '13398',
      }),
    );
    global.fetch = jest.fn((input: URL | RequestInfo) => {
      const url = String(input);

      if (url.endsWith('/workflows')) {
        return Promise.resolve(
          response([
            { id: 1, states: [{ id: 100, name: 'Wrong', type: 'unstarted' }] },
            { id: 13398, states: [{ id: 2001, name: 'Ready', type: 'unstarted' }] },
          ]),
        );
      }

      if (url.endsWith('/projects') || url.endsWith('/groups')) {
        return Promise.resolve(response([]));
      }

      return Promise.resolve(response({ id: 123 }, 201));
    }) as jest.Mock;

    await service.createStory({ name: 'Story', description: 'Description' });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"workflow_state_id":2001'),
      }),
    );
  });

  it('skips story creation when token is missing', async () => {
    const service = new ShortcutService(createConfig({ SHORTCUT_SPACE_ID: '13398' }));
    global.fetch = jest.fn();

    await expect(service.createStory({ name: 'Story', description: 'Description' })).resolves.toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
