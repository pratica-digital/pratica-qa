export type ShortcutStoryRequest = {
  description: string;
  name: string;
  storyType?: 'bug' | 'chore' | 'feature';
};

export type ShortcutStoryResponse = {
  appUrl: string;
  id: string;
  name: string;
};

export type FailedTestStoryInput = {
  attachments: Array<{
    originalName?: string | null;
    url: string;
  }>;
  comment?: string | null;
  executedAt?: Date | string | null;
  executedBy?: {
    email?: string | null;
    name?: string | null;
  } | null;
  id: string;
  shortcutStoryId?: string | null;
  shortcutStoryName?: string | null;
  shortcutStoryUrl?: string | null;
  testCase: {
    expectedResult?: string | null;
    steps?: Array<{
      description: string;
      expectedResult?: string | null;
      order: number;
    }>;
    title: string;
  };
  testRun: {
    name: string;
    project?: {
      name: string;
    } | null;
  };
};
