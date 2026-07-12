import { describe, it, expect } from 'vitest';
import {
  FEED, CATEGORIES, CATEGORY_META, SEVERITY_META,
  getAlert, filterFeed, unreadCount,
} from '@/lib/alert/feed';

describe('TEC Alert — smart notification hub (C-111, read-only)', () => {
  it('every category + severity has display metadata', () => {
    for (const c of CATEGORIES) expect(CATEGORY_META[c]?.label).toBeTruthy();
    for (const s of ['info', 'success', 'warning', 'critical'] as const) {
      expect(SEVERITY_META[s]?.label).toBeTruthy();
    }
  });

  it('aggregates BOTH TEC activity and the Pi community (the superset vision)', () => {
    expect(FEED.some((a) => a.source === 'tec')).toBe(true);
    expect(FEED.some((a) => a.source === 'pi')).toBe(true);
    // security/risk is one category among many (the charter's original role).
    expect(FEED.some((a) => a.category === 'security')).toBe(true);
    expect(FEED.some((a) => a.category === 'community')).toBe(true);
  });

  it('getAlert resolves by id and fails closed for an unknown id', () => {
    const first = FEED[0];
    if (!first) throw new Error('feed is empty');
    expect(getAlert(first.id)?.title).toBe(first.title);
    expect(getAlert('nope')).toBeNull();
  });

  it('filterFeed by source restricts the feed; "all" returns everything', () => {
    const tec = filterFeed({ source: 'tec' });
    expect(tec.length).toBeGreaterThan(0);
    expect(tec.every((a) => a.source === 'tec')).toBe(true);
    expect(filterFeed({ source: 'pi' }).every((a) => a.source === 'pi')).toBe(true);
    expect(filterFeed({ source: 'all' }).length).toBe(FEED.length);
  });

  it('filterFeed by category restricts to that category', () => {
    const sec = filterFeed({ category: 'security' });
    expect(sec.length).toBeGreaterThan(0);
    expect(sec.every((a) => a.category === 'security')).toBe(true);
  });

  it('unreadCount counts only unread and never exceeds the feed size', () => {
    const n = unreadCount(FEED);
    expect(n).toBe(FEED.filter((a) => a.unread).length);
    expect(n).toBeLessThanOrEqual(FEED.length);
  });

  it('a scam warning is surfaced as critical (Pi community safety)', () => {
    const scam = FEED.find((a) => a.id === 'pi-scam-1');
    expect(scam?.severity).toBe('critical');
    expect(scam?.source).toBe('pi');
  });
});
