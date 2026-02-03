/**
 * LinkItem component tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import LinkItem from '@/popup/components/LinkItem.svelte';
import type { Link } from '@/lib/types';

const createMockLink = (overrides: Partial<Link> = {}): Link => ({
  id: 'test-link-1',
  url: 'https://example.com',
  title: 'Example Link',
  collectionId: 'inbox',
  createdAt: Date.now(),
  ...overrides,
});

describe('LinkItem Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(chrome.tabs.create).mockResolvedValue({ id: 1, url: '' } as chrome.tabs.Tab);
  });

  it('should render link title and url', () => {
    const link = createMockLink({ title: 'My Link', url: 'https://mysite.com' });
    render(LinkItem, { props: { link } });

    expect(screen.getByText('My Link')).toBeInTheDocument();
    expect(screen.getByText('https://mysite.com')).toBeInTheDocument();
  });

  it('should render favicon when provided', () => {
    const link = createMockLink({ favicon: 'https://example.com/favicon.ico' });
    const { container } = render(LinkItem, { props: { link } });

    const favicon = container.querySelector('.link-favicon') as HTMLImageElement;
    expect(favicon).toBeInTheDocument();
    expect(favicon.src).toBe('https://example.com/favicon.ico');
  });

  it('should render placeholder icon when no favicon', () => {
    const link = createMockLink({ favicon: undefined });
    const { container } = render(LinkItem, { props: { link } });

    expect(container.querySelector('.link-favicon-placeholder')).toBeInTheDocument();
  });

  it('should have accessible open button', () => {
    const link = createMockLink();
    render(LinkItem, { props: { link } });

    const button = screen.getByRole('button', { name: /abrir link em nova aba/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('title', 'Abrir em nova aba');
  });

  it('should call chrome.tabs.create when open button is clicked', async () => {
    const link = createMockLink({ url: 'https://test.com' });
    render(LinkItem, { props: { link } });

    const button = screen.getByRole('button', { name: /abrir link em nova aba/i });
    await fireEvent.click(button);

    await waitFor(() => {
      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: 'https://test.com',
        active: true,
      });
    });
  });

  it('should show spinner while loading', async () => {
    let resolveCreate!: (value: chrome.tabs.Tab) => void;
    vi.mocked(chrome.tabs.create).mockReturnValue(
      new Promise<chrome.tabs.Tab>((resolve) => {
        resolveCreate = resolve;
      }),
    );

    const link = createMockLink();
    const { container } = render(LinkItem, { props: { link } });

    const button = screen.getByRole('button', { name: /abrir link em nova aba/i });
    await fireEvent.click(button);

    await waitFor(() => {
      expect(container.querySelector('.spinner')).toBeInTheDocument();
    });

    resolveCreate({ id: 1, url: '' } as chrome.tabs.Tab);

    await waitFor(() => {
      expect(container.querySelector('.spinner')).not.toBeInTheDocument();
    });
  });

  it('should disable button while loading', async () => {
    let resolveCreate!: (value: chrome.tabs.Tab) => void;
    vi.mocked(chrome.tabs.create).mockReturnValue(
      new Promise<chrome.tabs.Tab>((resolve) => {
        resolveCreate = resolve;
      }),
    );

    const link = createMockLink();
    render(LinkItem, { props: { link } });

    const button = screen.getByRole('button', { name: /abrir link em nova aba/i });
    await fireEvent.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
    });

    resolveCreate({ id: 1, url: '' } as chrome.tabs.Tab);

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  it('should dispatch error event for invalid URL', async () => {
    const link = createMockLink({ url: 'invalid-url' });
    const handleError = vi.fn();

    const { component } = render(LinkItem, { props: { link } });
    component.$on('error', handleError);

    const button = screen.getByRole('button', { name: /abrir link em nova aba/i });
    await fireEvent.click(button);

    await waitFor(() => {
      expect(handleError).toHaveBeenCalled();
      expect(handleError.mock.calls[0][0].detail.message).toBe(
        'URL inválido. Não foi possível abrir o link.',
      );
    });
  });

  it('should dispatch error event when chrome.tabs.create fails', async () => {
    vi.mocked(chrome.tabs.create).mockRejectedValueOnce(new Error('Failed'));

    const link = createMockLink({ url: 'https://example.com' });
    const handleError = vi.fn();

    const { component } = render(LinkItem, { props: { link } });
    component.$on('error', handleError);

    const button = screen.getByRole('button', { name: /abrir link em nova aba/i });
    await fireEvent.click(button);

    await waitFor(() => {
      expect(handleError).toHaveBeenCalled();
      expect(handleError.mock.calls[0][0].detail.message).toBe(
        'Erro ao abrir link. Tente novamente.',
      );
    });
  });

  it('should render as list item', () => {
    const link = createMockLink();
    render(LinkItem, { props: { link } });

    expect(screen.getByRole('listitem')).toBeInTheDocument();
  });

  it('should be keyboard accessible', () => {
    const link = createMockLink();
    render(LinkItem, { props: { link } });

    const button = screen.getByRole('button', { name: /abrir link em nova aba/i });
    expect(button).not.toHaveAttribute('tabindex', '-1');
  });
});
