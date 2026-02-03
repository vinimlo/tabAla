/**
 * Example Svelte component test.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import App from '@/popup/App.svelte';

describe('App Component', () => {
  it('should render the app title', () => {
    render(App);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('TabAla');
  });

  it('should render the subtitle', () => {
    render(App);
    expect(screen.getByText('Sua sala de espera para links')).toBeInTheDocument();
  });

  it('should have main element', () => {
    const { container } = render(App);
    const main = container.querySelector('main');
    expect(main).not.toBeNull();
  });
});
