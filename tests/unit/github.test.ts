import { describe, expect, it } from 'vitest';
import { dailyActivity, languageShares, timeAgo } from '../../src/lib/github';

describe('github helpers', () => {
  it('weights languages by size and skips forks', () => {
    const shares = languageShares([
      { name: 'a', description: null, url: '', language: 'Go', stars: 0, forks: 0, pushedAt: '', size: 300, fork: false },
      { name: 'b', description: null, url: '', language: 'Python', stars: 0, forks: 0, pushedAt: '', size: 100, fork: false },
      { name: 'c', description: null, url: '', language: 'Rust', stars: 0, forks: 0, pushedAt: '', size: 9999, fork: true },
    ]);
    expect(shares.map((s) => s.name)).toEqual(['Go', 'Python']);
    expect(shares[0]!.share).toBeCloseTo(0.75);
  });
  it('buckets events per day', () => {
    const now = Date.parse('2026-09-30T12:00:00Z');
    const b = dailyActivity(
      [{ created_at: '2026-09-30T01:00:00Z' }, { created_at: '2026-09-29T11:00:00Z' }, { created_at: '2025-01-01T00:00:00Z' }],
      7,
      now,
    );
    expect(b).toEqual([0, 0, 0, 0, 0, 1, 1]);
  });
  it('formats relative times', () => {
    const now = Date.parse('2026-09-30T12:00:00Z');
    expect(timeAgo('2026-09-30T11:00:00Z', now)).toBe('1h ago');
    expect(timeAgo('2026-09-27T12:00:00Z', now)).toBe('3d ago');
  });
});
