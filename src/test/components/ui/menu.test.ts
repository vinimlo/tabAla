/**
 * Menu and segmented control (spec §4.6).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import Segmented from '@/shared/components/ui/Segmented.svelte';
import MenuHarness from './MenuHarness.svelte';

async function openMenu(): Promise<void> {
  await fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
  await tick();
}

describe('Menu', () => {
  it('opens with focus on the first item and reports the chosen one', async () => {
    const select = vi.fn();
    render(MenuHarness, { events: { select } });
    await openMenu();

    expect(screen.getByRole('menu', { name: 'Ações' })).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Amanhã' }));
    await fireEvent.click(screen.getByRole('menuitem', { name: 'Descartar' }));

    expect(select).toHaveBeenCalledTimes(1);
  });

  it('moves between items with the arrows', async () => {
    render(MenuHarness);
    await openMenu();

    await fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Descartar' }));
    await fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Amanhã' }));
  });

  it('closes with Escape and gives the focus back to its anchor', async () => {
    render(MenuHarness);
    await openMenu();

    await fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    expect(screen.queryByRole('menu')).toBeNull();
    expect((document.activeElement as HTMLElement).closest('.anchor')).not.toBeNull();
  });

  it('closes on a click outside, but not on a click on its anchor', async () => {
    render(MenuHarness);
    await openMenu();

    await fireEvent.mouseDown(screen.getByRole('button', { name: 'Abrir menu' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await fireEvent.mouseDown(screen.getByRole('button', { name: 'Fora' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('marks dangerous items', async () => {
    render(MenuHarness);
    await openMenu();
    expect(screen.getByRole('menuitem', { name: 'Descartar' })).toHaveClass('danger');
  });
});

describe('Segmented', () => {
  const options = [{ value: 15, label: '15 min' }, { value: 30, label: '30 min' }, { value: 60, label: '60 min' }];

  it('is a radio group that reports the chosen value', async () => {
    const change = vi.fn();
    render(Segmented, { props: { label: 'Tempo', options, value: 30 }, events: { change } });

    expect(screen.getByRole('radiogroup', { name: 'Tempo' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '30 min' })).toHaveAttribute('aria-checked', 'true');
    await fireEvent.click(screen.getByRole('radio', { name: '60 min' }));

    expect(change.mock.calls[0][0].detail).toBe(60);
  });

  it('moves with the arrow keys, and the focus follows the choice', async () => {
    const change = vi.fn();
    render(Segmented, { props: { label: 'Tempo', options, value: 30 }, events: { change } });
    screen.getByRole('radio', { name: '30 min' }).focus();

    await fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: '60 min' }));
    await fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowLeft' });

    expect(change.mock.calls.map((call) => (call[0] as CustomEvent<number>).detail)).toEqual([60, 30]);
  });

  it('lets the first option take the focus when nothing is chosen', () => {
    render(Segmented, { props: { label: 'Tempo', options, value: null } });
    expect(screen.getByRole('radio', { name: '15 min' })).toHaveAttribute('tabindex', '0');
  });
});
