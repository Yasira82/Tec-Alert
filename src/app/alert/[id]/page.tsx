// TEC Alert — a single alert detail (C-111). Read-only view of one notification
// with its category, severity, and the app that raised it. Alert presents +
// routes you to the owning app; it never resolves the incident itself (C-111 §4).
import Link from 'next/link';
import { TEC_COLORS } from '@yasser172/tec-ui';
import { CATEGORY_META, SEVERITY_META } from '@/lib/alert/feed';
import { resolveAlert } from '@/lib/alert/server';

// Rendered dynamically from the live Alert read-layer — real data end-to-end
// (C-135 §4): a live 404 is "not found"; an unreachable backend is an honest
// "couldn't load". Never a fabricated sample.
export const dynamic = 'force-dynamic';

export default async function AlertPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { alert: a, source } = await resolveAlert(id);

  const wrap: React.CSSProperties = {
    minHeight: '100vh', background: TEC_COLORS.bg, color: TEC_COLORS.text,
    padding: '32px 22px', fontFamily: 'system-ui, -apple-system, sans-serif',
  };
  const inner: React.CSSProperties = { maxWidth: 640, margin: '0 auto' };

  if (!a) {
    const unavailable = source === 'unavailable';
    return (
      <main style={wrap}>
        <div style={inner}>
          <Link href="/app" style={{ fontSize: 13, color: TEC_COLORS.gold, textDecoration: 'none' }}>← Inbox</Link>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: TEC_COLORS.text, marginTop: 16 }}>
            {unavailable ? 'Couldn’t load this alert' : 'Alert not found'}
          </h1>
          <p style={{ fontSize: 13, color: TEC_COLORS.subtext }}>
            {unavailable
              ? 'Your inbox is unavailable right now. Please try again shortly.'
              : <>No alert <code>{id}</code> in your feed.</>}
          </p>
        </div>
      </main>
    );
  }

  const cat = CATEGORY_META[a.category];
  const sev = SEVERITY_META[a.severity];
  const tone = sev.tone === 'crit' ? TEC_COLORS.error : sev.tone === 'warn' ? TEC_COLORS.gold
    : sev.tone === 'good' ? TEC_COLORS.success : TEC_COLORS.subtext;

  return (
    <main style={wrap}>
      <div style={inner}>
        <Link href="/app" style={{ fontSize: 13, color: TEC_COLORS.gold, textDecoration: 'none' }}>← Inbox</Link>

        <div style={{ marginTop: 16, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: 1, color: TEC_COLORS.subtext, textTransform: 'uppercase' }}>{cat.icon} {cat.label} · {a.app}</div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: TEC_COLORS.gold, margin: '4px 0 0' }}>{a.title}</h1>
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, color: sev.tone === 'crit' ? '#0a0800' : TEC_COLORS.text, background: sev.tone === 'crit' ? `linear-gradient(135deg, ${TEC_COLORS.error}, #b83227)` : 'transparent', border: sev.tone === 'crit' ? 'none' : `1px solid ${tone}66`, borderRadius: 999, padding: '6px 12px', whiteSpace: 'nowrap' }}>
            {sev.label}
          </div>
        </div>

        <p style={{ fontSize: 15, color: TEC_COLORS.text, margin: '16px 0 0', lineHeight: 1.6 }}>{a.body}</p>
        <div style={{ fontSize: 12, color: TEC_COLORS.subtext, marginTop: 10 }}>{a.ago} ago · from {a.app}</div>

        <div style={{ background: TEC_COLORS.surface, border: `1px solid ${TEC_COLORS.gold}22`, borderRadius: 12, padding: 14, marginTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: TEC_COLORS.text }}>What Alert does with this</div>
          <div style={{ fontSize: 12, color: TEC_COLORS.subtext, marginTop: 5, lineHeight: 1.5 }}>
            Alert classified this signal and surfaced it here. To act on it, open
            <strong style={{ color: TEC_COLORS.text }}> {a.app}</strong> — Alert routes,
            it never resolves the incident itself.
          </div>
        </div>

        <p style={{ fontSize: 11, color: TEC_COLORS.subtext, margin: '20px 0 0', lineHeight: 1.5 }}>
          Alerts are delivered by tec-notification-service + a curated Pi-community source.
          Alert presents + routes — security response → NX; governance → SYSTEM.
        </p>
      </div>
    </main>
  );
}
