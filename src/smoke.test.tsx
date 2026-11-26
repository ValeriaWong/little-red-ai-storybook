/**
 * Render smoke test: mounts the real app in jsdom, clicks through the
 * cover -> kitchen -> gate -> B1 gift choice -> B2 wolf scene, and checks
 * the Firebase-not-configured banner renders (graceful degradation).
 *
 * Run: npm test
 */
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

function findButton(el: HTMLElement, text: string): HTMLButtonElement {
  const btn = [...el.querySelectorAll('button')].find((b) =>
    b.textContent?.includes(text),
  );
  if (!btn) throw new Error(`button not found: ${text}`);
  return btn as HTMLButtonElement;
}

describe('render smoke', () => {
  it('renders the cover, starts, and advances through a choice branch', async () => {
    // The real .env may hold a Firebase config now; stub it away so this
    // test still exercises the unconfigured (graceful degradation) path.
    // firebase.ts reads import.meta.env at module load, so import App
    // dynamically after stubbing.
    vi.stubEnv('VITE_FIREBASE_API_KEY', '');
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', '');
    vi.stubEnv('VITE_FIREBASE_APPCHECK_DEBUG_TOKEN', '');
    const { default: App } = await import('./App');

    const el = document.createElement('div');
    document.body.appendChild(el);
    const root = createRoot(el);
    await act(async () => {
      root.render(<App />);
    });

    // Cover
    expect(el.textContent).toContain('Little Red Riding Hood');
    expect(el.querySelector('img')).toBeTruthy();
    // Graceful degradation: no Firebase config in this env
    expect(el.textContent).toContain('Firebase not connected yet');

    await act(async () => {
      findButton(el, 'Start the story').click();
    });
    expect(el.textContent).toContain('The cake');

    await act(async () => {
      findButton(el, 'Walk to the gate').click();
    });
    expect(el.textContent).toContain('Meet the hunter');

    await act(async () => {
      findButton(el, 'Set off down the road').click();
    });
    expect(el.textContent).toContain('A little surprise');

    // B1 choice: pick the flowers -> flower-picking mini-game -> B2 wolf scene
    await act(async () => {
      findButton(el, 'Pick three daisies').click();
    });
    // Picking view: basket counter starts at 0 of 3
    expect(el.textContent).toContain('Basket: 0 of 3');
    const daisies = () =>
      [...el.querySelectorAll('button[aria-label="Tap this daisy"]')] as HTMLButtonElement[];
    expect(daisies()).toHaveLength(3);
    await act(async () => {
      daisies()[0].click();
    });
    expect(el.textContent).toContain('Basket: 1 of 3');
    expect(el.textContent).toContain('One!');
    await act(async () => {
      daisies()[0].click();
    });
    await act(async () => {
      daisies()[0].click();
    });
    expect(el.textContent).toContain('Basket: 3 of 3');
    expect(el.textContent).toContain('Three daisies, gently in the basket.');
    await act(async () => {
      findButton(el, 'Put them in the basket').click();
    });
    expect(el.textContent).toContain("The wolf's question");
    expect(el.textContent).toContain('Tell him');
    expect(el.textContent).toContain('Keep it secret');

    // AI panel is present on story scenes (disabled without config)
    expect(el.textContent).toContain('Continue the story with AI');
    const aiBtn = findButton(el, 'Continue the story with AI');
    expect(aiBtn.disabled).toBe(true);

    await act(async () => {
      root.unmount();
    });
    el.remove();
    vi.unstubAllEnvs();
  });
});
