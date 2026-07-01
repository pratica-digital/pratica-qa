import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ShortcutStoryRequest, ShortcutStoryResponse } from './shortcut.types';

type ShortcutCreateStoryResponse = {
  app_url?: string;
  id?: number | string;
  name?: string;
};

type ShortcutWorkflowState = {
  id?: number;
  name?: string;
  type?: string;
};

type ShortcutWorkflow = {
  id?: number;
  name?: string;
  states?: ShortcutWorkflowState[];
};

type ShortcutProject = {
  id?: number;
  name?: string;
};

type ShortcutGroup = {
  id?: string;
  name?: string;
};

type ShortcutConfig = {
  endpoint?: string;
  groupId?: string;
  projectId?: number;
  spaceId?: number;
  token: string;
  workflowStateId?: number;
};

type ShortcutDestination = {
  groupId?: string;
  projectId?: number;
  workflowStateId?: number;
};

function asOptionalNumber(value: string | undefined) {
  if (!value?.trim()) {
    return undefined;
  }

  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : undefined;
}

function asOptionalString(value: string | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}

@Injectable()
export class ShortcutService {
  private readonly logger = new Logger(ShortcutService.name);
  private discoveryPromise?: Promise<ShortcutDestination | null>;

  constructor(private readonly configService: ConfigService) {}

  isConfigured() {
    return Boolean(this.getConfig().token);
  }

  async createStory(story: ShortcutStoryRequest): Promise<ShortcutStoryResponse | null> {
    const config = this.getConfig();

    if (!config.token) {
      this.logger.warn('Shortcut integration skipped: SHORTCUT_API_TOKEN is not configured.');
      return null;
    }

    if (!config.endpoint) {
      this.logger.warn('Shortcut integration skipped: SHORTCUT_API_URL is not configured.');
      return null;
    }

    const destination = await this.resolveDestination(config);

    if (!destination?.workflowStateId && !destination?.projectId) {
      this.logger.warn(
        'Shortcut integration skipped: no workflow state or project could be resolved.',
      );
      return null;
    }

    const body = this.buildCreateStoryBody(story, destination);
    const response = await fetch(`${config.endpoint}/stories`, {
      method: 'POST',
      headers: this.buildHeaders(config.token),
      body: JSON.stringify(body),
    });
    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(
        `Shortcut story creation failed with status ${response.status}: ${responseText.slice(0, 500)}`,
      );
    }

    const responseBody = this.parseCreateStoryResponse(responseText);
    const storyId = responseBody.id === undefined ? '' : String(responseBody.id);

    if (!storyId) {
      throw new Error('Shortcut story creation returned no story id.');
    }

    return {
      id: storyId,
      appUrl: responseBody.app_url ?? '',
      name: responseBody.name ?? story.name,
    };
  }

  private async resolveDestination(config: ShortcutConfig): Promise<ShortcutDestination | null> {
    if (config.workflowStateId) {
      return {
        groupId: config.groupId ?? (await this.discoverGroupId(config)),
        workflowStateId: config.workflowStateId,
      };
    }

    if (config.projectId) {
      return {
        groupId: config.groupId ?? (await this.discoverGroupId(config)),
        projectId: config.projectId,
      };
    }

    this.discoveryPromise ??= this.discoverDestination(config);
    return this.discoveryPromise;
  }

  private async discoverDestination(config: ShortcutConfig): Promise<ShortcutDestination | null> {
    const [workflows, projects] = await Promise.all([
      this.fetchShortcut<ShortcutWorkflow[]>(config, '/workflows').catch((error: unknown) => {
        this.logDiscoveryFailure('workflows', error);
        return [];
      }),
      this.fetchShortcut<ShortcutProject[]>(config, '/projects').catch((error: unknown) => {
        this.logDiscoveryFailure('projects', error);
        return [];
      }),
    ]);
    const workflowStateId =
      this.findStateBySpaceId(workflows, config.spaceId) ??
      this.findStateInWorkflowBySpaceId(workflows, config.spaceId) ??
      this.findPreferredWorkflowState(workflows);
    const projectId =
      workflowStateId === undefined
        ? this.findProjectBySpaceId(projects, config.spaceId) ?? this.findSingleProject(projects)
        : undefined;
    const groupId = config.groupId ?? (await this.discoverGroupId(config));

    if (workflowStateId !== undefined) {
      this.logger.log(
        JSON.stringify({
          event: 'shortcut.destination.discovered',
          workflowStateId,
          groupId: groupId ?? null,
        }),
      );
      return { groupId, workflowStateId };
    }

    if (projectId !== undefined) {
      this.logger.log(
        JSON.stringify({
          event: 'shortcut.destination.discovered',
          projectId,
          groupId: groupId ?? null,
        }),
      );
      return { groupId, projectId };
    }

    return null;
  }

  private async discoverGroupId(config: ShortcutConfig) {
    try {
      const groups = await this.fetchShortcut<ShortcutGroup[]>(config, '/groups');

      if (groups.length === 1) {
        return groups[0]?.id;
      }
    } catch (error) {
      this.logDiscoveryFailure('groups', error);
    }

    return undefined;
  }

  private findStateBySpaceId(workflows: ShortcutWorkflow[], spaceId?: number) {
    if (spaceId === undefined) {
      return undefined;
    }

    for (const workflow of workflows) {
      const state = workflow.states?.find((item) => item.id === spaceId);

      if (state?.id !== undefined) {
        return state.id;
      }
    }

    return undefined;
  }

  private findStateInWorkflowBySpaceId(workflows: ShortcutWorkflow[], spaceId?: number) {
    if (spaceId === undefined) {
      return undefined;
    }

    const workflow = workflows.find((item) => item.id === spaceId);
    return workflow ? this.findPreferredState(workflow.states ?? []) : undefined;
  }

  private findPreferredWorkflowState(workflows: ShortcutWorkflow[]) {
    for (const workflow of workflows) {
      const stateId = this.findPreferredState(workflow.states ?? []);

      if (stateId !== undefined) {
        return stateId;
      }
    }

    return undefined;
  }

  private findPreferredState(states: ShortcutWorkflowState[]) {
    const preferred =
      states.find((state) => state.type === 'unstarted') ??
      states.find((state) => /todo|to do|backlog|ready|novo|triagem/i.test(state.name ?? '')) ??
      states.find((state) => state.type !== 'done') ??
      states[0];

    return preferred?.id;
  }

  private findProjectBySpaceId(projects: ShortcutProject[], spaceId?: number) {
    return spaceId === undefined ? undefined : projects.find((project) => project.id === spaceId)?.id;
  }

  private findSingleProject(projects: ShortcutProject[]) {
    return projects.length === 1 ? projects[0]?.id : undefined;
  }

  private buildCreateStoryBody(story: ShortcutStoryRequest, destination: ShortcutDestination) {
    const body: Record<string, unknown> = {
      description: story.description,
      name: story.name,
      story_type: story.storyType ?? 'bug',
    };

    if (destination.workflowStateId) {
      body.workflow_state_id = destination.workflowStateId;
    } else if (destination.projectId) {
      body.project_id = destination.projectId;
    }

    if (destination.groupId) {
      body.group_id = destination.groupId;
    }

    return body;
  }

  private async fetchShortcut<T>(config: ShortcutConfig, path: string) {
    if (!config.endpoint) {
      throw new Error('SHORTCUT_API_URL is required');
    }

    const response = await fetch(`${config.endpoint}${path}`, {
      method: 'GET',
      headers: this.buildHeaders(config.token),
    });
    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Shortcut ${path} failed with status ${response.status}: ${responseText.slice(0, 500)}`);
    }

    return this.parseJson<T>(responseText, `Shortcut ${path} returned invalid JSON.`);
  }

  private buildHeaders(token: string) {
    return {
      'Content-Type': 'application/json',
      'Shortcut-Token': token,
    };
  }

  private getConfig(): ShortcutConfig {
    return {
      endpoint: asOptionalString(this.configService.get<string>('SHORTCUT_API_URL')),
      groupId: asOptionalString(this.configService.get<string>('SHORTCUT_TEAM_ID')),
      projectId: asOptionalNumber(this.configService.get<string>('SHORTCUT_PROJECT_ID')),
      spaceId: asOptionalNumber(this.configService.get<string>('SHORTCUT_SPACE_ID')),
      token: this.configService.get<string>('SHORTCUT_API_TOKEN', '').trim(),
      workflowStateId: asOptionalNumber(this.configService.get<string>('SHORTCUT_WORKFLOW_STATE_ID')),
    };
  }

  private parseCreateStoryResponse(responseText: string): ShortcutCreateStoryResponse {
    return this.parseJson<ShortcutCreateStoryResponse>(
      responseText,
      'Shortcut story creation returned invalid JSON.',
    );
  }

  private parseJson<T>(responseText: string, message: string): T {
    try {
      return JSON.parse(responseText) as T;
    } catch {
      throw new Error(message);
    }
  }

  private logDiscoveryFailure(resource: string, error: unknown) {
    this.logger.warn(
      JSON.stringify({
        event: 'shortcut.discovery_failed',
        reason: error instanceof Error ? error.message : 'unknown_error',
        resource,
      }),
    );
  }
}
