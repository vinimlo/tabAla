/**
 * App component test.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import App from '@/popup/App.svelte';

describe('App Component', () => {
  it('should render Hello TabAla text', () => {
    const { container } = render(App);
    expect(container.textContent).toContain('Hello TabAla');
  });

  it('should have main element', () => {
    const { container } = render(App);
    const main = container.querySelector('main');
    expect(main).not.toBeNull();
  });

  it('should render plain text without additional styling elements', () => {
    const { container } = render(App);
    const main = container.querySelector('main');
    expect(main?.children.length).toBe(0);
    expect(main?.textContent).toBe('Hello TabAla');
  });
});
