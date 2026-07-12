// TEC Alert — the smart notification hub data model (C-111, extended). Alert is
// the ecosystem's single inbox: it AGGREGATES + CLASSIFIES + PRIORITIZES signals
// from every TEC app (payments, connections, goals, assets, properties,
// verification, AI) AND a curated Pi-community feed (mainnet/news/hackathons/scam
// warnings), so a user doesn't open eight apps to know what changed.
//
// Boundary (C-111 §4): Alert PRESENTS + routes; it does NOT resolve incidents
// (the owning service does), enforce security (NX), or take governance action
// (SYSTEM). Risk/security alerts are ONE category here — the charter's original
// admin risk-signal role, generalized into a user inbox. This V1 is a curated
// READ-ONLY sample; live delivery comes from tec-notification-service + a Pi news
// source (Phase 1+).

export type Severity = 'info' | 'success' | 'warning' | 'critical';

// TEC activity categories (which app the signal came from) + community.
export type Category =
  | 'payment' | 'connection' | 'goal' | 'security' | 'asset' | 'property'
  | 'verification' | 'ai' | 'community';

export type Source = 'tec' | 'pi';   // your TEC activity vs the Pi ecosystem

export interface Alert {
  id:        string;
  source:    Source;
  category:  Category;
  severity:  Severity;
  title:     string;
  body:      string;
  app:       string;   // originating app/service (or "Pi Network")
  ago:       string;   // human-relative time (sample)
  unread:    boolean;
}

export const CATEGORY_META: Record<Category, { icon: string; label: string }> = {
  payment:      { icon: '💸', label: 'Payments' },
  connection:   { icon: '🤝', label: 'Connections' },
  goal:         { icon: '🎯', label: 'Goals' },
  security:     { icon: '🛡️', label: 'Security' },
  asset:        { icon: '💎', label: 'Assets' },
  property:     { icon: '🏠', label: 'Property' },
  verification: { icon: '✅', label: 'Verification' },
  ai:           { icon: '🤖', label: 'AI' },
  community:    { icon: '🌐', label: 'Pi Community' },
};

export const CATEGORIES = Object.keys(CATEGORY_META) as Category[];

export const SEVERITY_META: Record<Severity, { label: string; tone: 'info' | 'good' | 'warn' | 'crit' }> = {
  info:     { label: 'Info',     tone: 'info' },
  success:  { label: 'Done',     tone: 'good' },
  warning:  { label: 'Warning',  tone: 'warn' },
  critical: { label: 'Critical', tone: 'crit' },
};

// Curated sample feed (demo). Read-only.
export const FEED: Alert[] = [
  { id: 'pay-recv-1',  source: 'tec', category: 'payment',      severity: 'success',  title: 'Payment received', body: 'You received 12π from @maya for “Logo design”.', app: 'Commerce',   ago: '2m',  unread: true },
  { id: 'sec-login-1', source: 'tec', category: 'security',     severity: 'critical', title: 'New login detected', body: 'A new device signed in to your TEC account. If this wasn’t you, secure your account.', app: 'Hub', ago: '18m', unread: true },
  { id: 'conn-1',      source: 'tec', category: 'connection',   severity: 'info',     title: 'New connection', body: '@dev_sara followed you on Connection.', app: 'Connection', ago: '40m', unread: true },
  { id: 'verify-1',    source: 'tec', category: 'verification', severity: 'success',  title: 'Verification complete', body: 'Your business is now Zone Verified 🛡️.', app: 'Zone',       ago: '1h',  unread: false },
  { id: 'asset-1',     source: 'tec', category: 'asset',        severity: 'warning',  title: 'Asset price alert', body: 'vanguard.pi crossed your target — indicative only (Analytics).', app: 'Assets', ago: '3h', unread: false },
  { id: 'goal-1',      source: 'tec', category: 'goal',         severity: 'info',     title: 'Goal reminder', body: '“Learn Pi SDK” — 2 tasks due this week.', app: 'Life',       ago: '5h',  unread: false },
  { id: 'prop-1',      source: 'tec', category: 'property',     severity: 'info',     title: 'Property update', body: 'Lease renewal for Seaside Villa 7 is due in 30 days.', app: 'Estate', ago: '8h', unread: false },
  { id: 'ai-1',        source: 'tec', category: 'ai',           severity: 'info',     title: 'AI recommendation', body: 'Based on your goals, 3 opportunities match your skills.', app: 'TEC AI', ago: '9h', unread: false },

  // Pi community feed
  { id: 'pi-mainnet-1', source: 'pi', category: 'community', severity: 'info',     title: 'Mainnet update', body: 'Pi Network published a protocol update. Read the official announcement.', app: 'Pi Network', ago: '1h',  unread: true },
  { id: 'pi-scam-1',    source: 'pi', category: 'community', severity: 'critical', title: '⚠️ Scam warning', body: 'A phishing site impersonating a Pi wallet is circulating. Never share your passphrase.', app: 'Pi Network', ago: '6h', unread: true },
  { id: 'pi-hack-1',    source: 'pi', category: 'community', severity: 'info',     title: 'Hackathon open', body: 'A new Pi Hackathon is accepting submissions this month.', app: 'Pi Network', ago: '1d', unread: false },
  { id: 'pi-verified-1', source: 'pi', category: 'community', severity: 'success', title: 'Newly verified project', body: 'A community project just earned Zone verification.', app: 'Zone', ago: '2d', unread: false },
];

export const getAlert = (id: string): Alert | null => FEED.find((a) => a.id === id) ?? null;

export const unreadCount = (feed: Alert[] = FEED): number => feed.filter((a) => a.unread).length;

// Filter the feed by source and/or category (pure + testable). Preserves order
// (newest-first as authored); severity is surfaced in the UI, not re-sorted here.
export interface FeedQuery { source?: Source | 'all'; category?: Category | 'all'; }

export const filterFeed = (q: FeedQuery, feed: Alert[] = FEED): Alert[] =>
  feed.filter((a) => {
    if (q.source && q.source !== 'all' && a.source !== q.source) return false;
    if (q.category && q.category !== 'all' && a.category !== q.category) return false;
    return true;
  });
