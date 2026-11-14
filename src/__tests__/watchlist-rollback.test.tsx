import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

/**
 * The watchlist changes the screen first and the server second. When the server does
 * not take the change, the screen must go back to what is true, say so, and report it —
 * it used to keep showing a change the next reload undid (E8).
 */
vi.mock('@/lib/observability/reportError', () => ({ reportError: vi.fn() }));

const WATCH = { id: 'w1', title: 'Mainnet news', done: false };

function serve(mutation: () => Response) {
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) =>
    !init?.method || init.method === 'GET'
      ? new Response(JSON.stringify({ watches: [WATCH], isPro: false, cap: 3 }), { status: 200 })
      : mutation()));
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('watchlist: a change the server refuses is undone on screen', () => {
  it('a failed "mark done" puts the item back and says so', async () => {
    serve(() => new Response('{}', { status: 500 }));
    const { reportError } = await import('@/lib/observability/reportError');
    const { Watchlist } = await import('@/app/app/components/Watchlist');
    render(<Watchlist />);
    fireEvent.click(await screen.findByTitle('Mark done'));
    await waitFor(() => expect(screen.getByText('Could not save. Please retry.')).toBeTruthy());
    expect(screen.getByTitle('Mark done')).toBeTruthy();
    expect(reportError).toHaveBeenCalled();
  });

  it('a failed delete brings the item back', async () => {
    serve(() => { throw new TypeError('network down'); });
    const { Watchlist } = await import('@/app/app/components/Watchlist');
    render(<Watchlist />);
    fireEvent.click(await screen.findByTitle('Remove'));
    await waitFor(() => expect(screen.getByText('Could not delete. Please retry.')).toBeTruthy());
    expect(screen.getByText('Mainnet news')).toBeTruthy();
  });

  it('a change the server takes stays', async () => {
    serve(() => new Response('{}', { status: 200 }));
    const { Watchlist } = await import('@/app/app/components/Watchlist');
    render(<Watchlist />);
    fireEvent.click(await screen.findByTitle('Mark done'));
    await waitFor(() => expect(screen.getByTitle('Mark active')).toBeTruthy());
    expect(screen.queryByText('Could not save. Please retry.')).toBeNull();
  });
});
