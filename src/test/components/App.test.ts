/**
 * App component test.
 *
 * Note: Async tests for loading links are challenging with Svelte + Vitest
 * due to module mocking limitations. The core functionality is tested in
 * storage.test.ts and component tests (LinkItem, ConfirmDialog).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { mockStorage } from '../setup';
import App from '@/popup/App.svelte';

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  it('should render TabAla in heading', () => {
    render(App);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('TabAla');
  });

  it('should have main element', () => {
    const { container } = render(App);
    const main = container.querySelector('main');
    expect(main).not.toBeNull();
  });

  it('should show loading state initially', () => {
    render(App);
    expect(screen.getByRole('main')).toBeInTheDocument();
    const spinner = document.querySelector('.spinner');
    expect(spinner).toBeInTheDocument();
  });

  it('should have header with title', () => {
    const { container } = render(App);
    const main = container.querySelector('main');
    const h1 = main?.querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1?.textContent).toBe('TabAla');
  });
});
