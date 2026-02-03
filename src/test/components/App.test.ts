/**
 * App component test.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import App from '@/popup/App.svelte';

describe('App Component', () => {
  it('should render Hello TabAla in heading', () => {
    render(App);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hello TabAla');
  });

  it('should have main element', () => {
    const { container } = render(App);
    const main = container.querySelector('main');
    expect(main).not.toBeNull();
  });

  it('should have h1 inside main', () => {
    const { container } = render(App);
    const main = container.querySelector('main');
    const h1 = main?.querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1?.textContent).toBe('Hello TabAla');
  });
});
