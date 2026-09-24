import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import QuickActionsBar from '@/newtab/components/QuickActionsBar.svelte';

describe('QuickActionsBar', () => {
  it('opens the search panel from the search field', async () => {
    const openSearch = vi.fn();
    render(QuickActionsBar, { events: { openSearch } });

    await fireEvent.click(screen.getByRole('button', { name: /search_open_placeholder/ }));

    expect(openSearch).toHaveBeenCalledTimes(1);
  });
});
