/**
 * Unit tests for ConfirmDialog component.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import ConfirmDialog from '@/popup/components/ConfirmDialog.svelte';

describe('ConfirmDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with default message', () => {
    render(ConfirmDialog);

    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('should render with custom message', () => {
    render(ConfirmDialog, { props: { message: 'Delete this item?' } });

    expect(screen.getByText('Delete this item?')).toBeInTheDocument();
  });

  it('should render custom button texts', () => {
    render(ConfirmDialog, {
      props: {
        confirmText: 'Delete',
        cancelText: 'Keep',
      },
    });

    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument();
  });

  it('should dispatch confirm event when confirm button is clicked', async () => {
    const { component } = render(ConfirmDialog);

    const handleConfirm = vi.fn();
    component.$on('confirm', handleConfirm);

    const confirmButton = screen.getByRole('button', { name: 'Remover' });
    await fireEvent.click(confirmButton);

    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('should dispatch cancel event when cancel button is clicked', async () => {
    const { component } = render(ConfirmDialog);

    const handleCancel = vi.fn();
    component.$on('cancel', handleCancel);

    const cancelButton = screen.getByRole('button', { name: 'Cancelar' });
    await fireEvent.click(cancelButton);

    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('should dispatch cancel event when backdrop is clicked', async () => {
    const { component } = render(ConfirmDialog);

    const handleCancel = vi.fn();
    component.$on('cancel', handleCancel);

    const backdrop = screen.getByRole('dialog');
    await fireEvent.click(backdrop);

    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('should dispatch cancel event when Escape key is pressed on dialog', async () => {
    const { component } = render(ConfirmDialog);

    const handleCancel = vi.fn();
    component.$on('cancel', handleCancel);

    const backdrop = screen.getByRole('dialog');
    await fireEvent.keyDown(backdrop, { key: 'Escape' });

    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('should dispatch confirm event when Enter key is pressed on dialog', async () => {
    const { component } = render(ConfirmDialog);

    const handleConfirm = vi.fn();
    component.$on('confirm', handleConfirm);

    const backdrop = screen.getByRole('dialog');
    await fireEvent.keyDown(backdrop, { key: 'Enter' });

    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('should have proper accessibility attributes', () => {
    render(ConfirmDialog, { props: { message: 'Confirm action?' } });

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-message');

    const message = screen.getByText('Confirm action?');
    expect(message).toHaveAttribute('id', 'dialog-message');
  });
});
