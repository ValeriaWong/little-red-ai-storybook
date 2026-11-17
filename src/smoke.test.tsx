/**
 * Render smoke test: mounts the real app in jsdom, clicks through the
 * cover -> kitchen -> gate -> B1 gift choice -> B2 wolf scene, and checks
 * the Firebase-not-configured banner renders (graceful degradation).
 *
 * Run: npm test
 */
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

function findButton(el: HTMLElement, text: string): HTMLButtonElement {
  const btn = [...el.querySelectorAll('button')].find((b) =>
    b.textContent?.includes(text),
  );
  if (!btn) throw new Error(`button not found: ${text}`);
  return btn as HTMLButtonElement;
}

describe('render smoke', () => {
  it('renders the cover, starts, and advances through a choice branch', async () => {
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

    // B1 choice: pick the flowers -> B2 wolf scene
    await act(async () => {
      findButton(el, 'Pick three daisies').click();
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
  });
});
