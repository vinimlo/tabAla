/**
 * EmptyState component tests.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import EmptyState from '@/popup/components/EmptyState.svelte';

describe('EmptyState Component', () => {
  it('should render default message', () => {
    render(EmptyState);
    expect(screen.getByText('Nenhum link salvo ainda')).toBeInTheDocument();
  });

  it('should render default hint', () => {
    render(EmptyState);
    expect(screen.getByText('Salve sua primeira aba')).toBeInTheDocument();
  });

  it('should render custom message when provided', () => {
    render(EmptyState, { props: { message: 'Custom message' } });
    expect(screen.getByText('Custom message')).toBeInTheDocument();
  });

  it('should render custom hint when provided', () => {
    render(EmptyState, { props: { hint: 'Custom hint' } });
    expect(screen.getByText('Custom hint')).toBeInTheDocument();
  });

  it('should render icon svg', () => {
    const { container } = render(EmptyState);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should have proper styling classes', () => {
    const { container } = render(EmptyState);
    const emptyState = container.querySelector('.empty-state');
    expect(emptyState).toBeInTheDocument();
  });
});
