/**
 * App component test.
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
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('should have header with title', () => {
    const { container } = render(App);
    const header = container.querySelector('.header');
    expect(header).not.toBeNull();
    expect(header?.querySelector('h1')?.textContent).toBe('TabAla');
  });

  it('should have content area', () => {
    const { container } = render(App);
    const content = container.querySelector('.content');
    expect(content).not.toBeNull();
  });
});
