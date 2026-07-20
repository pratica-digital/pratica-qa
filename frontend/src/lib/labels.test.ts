import { describe, expect, it } from 'vitest';
import {
  suiteBelongsToProject,
  suitePrimaryProjectId,
  suiteProjectIds,
  suiteProjectLabel,
} from './labels';

const sharedSuite = {
  projects: [
    { id: 'oven-a', key: 'A', name: 'Forno A' },
    { id: 'oven-b', key: 'B', name: 'Forno B' },
  ],
};

describe('suite project helpers', () => {
  it('lists every related equipment', () => {
    expect(suiteProjectIds(sharedSuite)).toEqual(['oven-a', 'oven-b']);
    expect(suiteProjectLabel(sharedSuite)).toBe('Forno A, Forno B');
    expect(suitePrimaryProjectId(sharedSuite)).toBe('oven-a');
  });

  it('allows a shared suite in each related equipment', () => {
    expect(suiteBelongsToProject(sharedSuite, 'oven-a')).toBe(true);
    expect(suiteBelongsToProject(sharedSuite, 'oven-b')).toBe(true);
    expect(suiteBelongsToProject(sharedSuite, 'oven-c')).toBe(false);
  });

  it('keeps a suite without equipment available as Geral', () => {
    expect(suiteProjectLabel({ projects: [] })).toBe('Geral');
    expect(suiteBelongsToProject({ projects: [] }, 'oven-a')).toBe(true);
  });
});
