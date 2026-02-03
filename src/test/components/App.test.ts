/**
 * App component test.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import App from '@/popup/App.svelte';

describe('App Component', () => {
  it('should render Hello TabAla', () => {
    render(App);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hello TabAla');
  });

  it('should have main element', () => {
    const { container } = render(App);
    const main = container.querySelector('main');
    expect(main).not.toBeNull();
  });
});
