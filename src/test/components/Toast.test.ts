/**
 * Toast component tests.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Toast from '@/popup/components/Toast.svelte';

describe('Toast Component', () => {
  it('should render with provided message', () => {
    render(Toast, { props: { message: 'Test error message' } });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('should have accessible close button', () => {
    render(Toast, { props: { message: 'Test message' } });

    const closeButton = screen.getByRole('button', { name: /fechar notificação/i });
    expect(closeButton).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(Toast, { props: { message: 'Test message', onClose } });

    const closeButton = screen.getByRole('button', { name: /fechar notificação/i });
    await fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should have default duration prop', () => {
    render(Toast, { props: { message: 'Test message' } });
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should have aria-live attribute for accessibility', () => {
    render(Toast, { props: { message: 'Test message' } });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });

  it('should not be visible after dismiss', async () => {
    render(Toast, { props: { message: 'Test message' } });

    const closeButton = screen.getByRole('button', { name: /fechar notificação/i });
    await fireEvent.click(closeButton);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
