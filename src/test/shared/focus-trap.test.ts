import { describe, it, expect } from 'vitest';
import { fireEvent } from '@testing-library/svelte';
import { trapFocus } from '@/shared/focus-trap';

function dialog(): { root: HTMLDivElement; first: HTMLButtonElement; last: HTMLButtonElement } {
  const root = document.createElement('div');
  root.innerHTML = '<button>first</button><button tabindex="-1">skipped</button><button>last</button>';
  document.body.appendChild(root);
  const [first, , last] = [...root.querySelectorAll('button')];
  return { root, first, last };
}

describe('trapFocus', () => {
  it('keeps Tab inside the dialog in both directions', async () => {
    const { root, first, last } = dialog();
    const trap = trapFocus(root);

    last.focus();
    await fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
    await fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);

    trap.destroy();
    root.remove();
  });

  it('gives the focus back to what had it before', () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    const { root, first } = dialog();
    const trap = trapFocus(root);
    first.focus();

    trap.destroy();

    expect(document.activeElement).toBe(outside);
    root.remove();
    outside.remove();
  });
});
