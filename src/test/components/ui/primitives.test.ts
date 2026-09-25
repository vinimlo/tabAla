/**
 * Shared primitives of spec §4.5–4.6.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Icon from '@/shared/components/ui/Icon.svelte';
import IconButton from '@/shared/components/ui/IconButton.svelte';
import Kbd from '@/shared/components/ui/Kbd.svelte';
import LinkTile from '@/shared/components/ui/LinkTile.svelte';
import ProgressRing from '@/shared/components/ui/ProgressRing.svelte';
import { ICONS } from '@/shared/components/ui/icons';
import { altLabel, modLabel } from '@/shared/platform';
import ButtonHarness from './ButtonHarness.svelte';

describe('Icon', () => {
  it('draws the paths of its name and hides itself from assistive tech', () => {
    const { container } = render(Icon, { props: { name: 'check', size: 20 } });
    const svg = container.querySelector('svg') as SVGElement;

    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('width', '20');
    expect(svg.querySelectorAll('path')).toHaveLength(ICONS.check.length);
  });

  it('fills the shapes marked as filled', () => {
    const { container } = render(Icon, { props: { name: 'more' } });
    expect(container.querySelector('path')).toHaveAttribute('fill', 'currentColor');
  });
});

describe('Button', () => {
  it('shows its text and variant, and reports clicks', async () => {
    const click = vi.fn();
    render(ButtonHarness, { props: { label: 'Concluir', variant: 'primary' }, events: { click } });
    const button = screen.getByRole('button', { name: 'Concluir' });

    await fireEvent.click(button);

    expect(button).toHaveClass('primary');
    expect(button).toHaveAttribute('type', 'button');
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('draws its icon before the text', () => {
    render(ButtonHarness, { props: { label: 'Concluir', icon: 'check' } });
    expect(screen.getByRole('button', { name: 'Concluir' }).querySelector('svg')).not.toBeNull();
  });

  it('is disabled for the user when asked', () => {
    render(ButtonHarness, { props: { disabled: true } });
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });
});

describe('IconButton', () => {
  it('is named by its label and reports clicks', async () => {
    const click = vi.fn();
    render(IconButton, { props: { icon: 'more', label: 'Mais ações', expanded: false }, events: { click } });
    const button = screen.getByRole('button', { name: 'Mais ações' });

    await fireEvent.click(button);

    expect(button).toHaveAttribute('title', 'Mais ações');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('can be a toggle', () => {
    render(IconButton, { props: { icon: 'pin', label: 'Fixar', pressed: true } });
    expect(screen.getByRole('button', { name: 'Fixar' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Kbd', () => {
  it('renders a key', () => {
    const { container } = render(Kbd);
    expect(container.querySelector('kbd')).not.toBeNull();
  });
});

describe('LinkTile', () => {
  it('shows the favicon', () => {
    const { container } = render(LinkTile, { props: { link: { favicon: 'https://example.com/f.png' }, size: 36 } });
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/f.png');
  });

  it('shows the globe without a favicon', () => {
    const { container } = render(LinkTile, { props: { link: {} } });
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('falls back to the globe when the favicon fails to load', async () => {
    const { container } = render(LinkTile, { props: { link: { favicon: 'https://example.com/broken.png' } } });

    await fireEvent.error(container.querySelector('img') as HTMLImageElement);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

describe('ProgressRing', () => {
  it('draws only the track at zero', () => {
    const { container } = render(ProgressRing, { props: { value: 0, size: 40, stroke: 4 } });
    expect(container.querySelectorAll('circle')).toHaveLength(1);
  });

  it('draws the value as a share of the circumference', () => {
    const { container } = render(ProgressRing, { props: { value: 0.5, size: 40, stroke: 4 } });
    const value = container.querySelectorAll('circle')[1];
    const circumference = 2 * Math.PI * 18;

    expect(Number(value.getAttribute('stroke-dashoffset'))).toBeCloseTo(circumference / 2, 3);
  });

  it('clamps values above one', () => {
    const { container } = render(ProgressRing, { props: { value: 3, size: 40, stroke: 4 } });
    expect(Number(container.querySelectorAll('circle')[1].getAttribute('stroke-dashoffset'))).toBeCloseTo(0, 5);
  });
});

describe('platform labels', () => {
  it('names the modifier keys of the platform', () => {
    const platform = vi.spyOn(navigator, 'platform', 'get');
    platform.mockReturnValue('MacIntel');
    expect([modLabel(), altLabel()]).toEqual(['⌘', '⌥']);
    platform.mockReturnValue('Win32');
    expect([modLabel(), altLabel()]).toEqual(['Ctrl', 'Alt']);
    platform.mockRestore();
  });
});
