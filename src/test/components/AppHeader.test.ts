import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import AppHeader from '@/newtab/components/AppHeader.svelte';

describe('AppHeader', () => {
  it('names the workspace and what is pending in it', () => {
    render(AppHeader, { props: { title: 'Geral', summary: { links: 17, collections: 5 } } });

    expect(screen.getByRole('heading', { name: 'Geral' })).toBeInTheDocument();
    expect(screen.getByText('header_pending_links_many header_pending_in_many')).toBeInTheDocument();
  });

  it('says when nothing is pending', () => {
    render(AppHeader, { props: { title: 'Geral', summary: { links: 0, collections: 0 } } });
    expect(screen.getByText('header_nothing_pending')).toBeInTheDocument();
  });

  it('opens the search and creates a collection', async () => {
    const openSearch = vi.fn();
    const newCollection = vi.fn();
    render(AppHeader, { props: { title: 'Geral', summary: null }, events: { openSearch, newCollection } });

    await fireEvent.click(screen.getByRole('button', { name: /search_open_placeholder/ }));
    await fireEvent.click(screen.getByRole('button', { name: 'newtab_new_collection' }));

    expect(openSearch).toHaveBeenCalledTimes(1);
    expect(newCollection).toHaveBeenCalledTimes(1);
  });

  it('shows only the search in Focus', () => {
    render(AppHeader, { props: { title: null, summary: null } });

    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByRole('button', { name: 'newtab_new_collection' })).toBeNull();
    expect(screen.getByRole('button', { name: /search_open_placeholder/ })).toBeInTheDocument();
  });
});
