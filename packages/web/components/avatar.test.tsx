import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Avatar } from './avatar';

afterEach(cleanup);

describe('Avatar', () => {
  it('renders initials from first + last name when there is no image', () => {
    render(<Avatar name="Ada Lovelace" />);
    expect(screen.getByText('AL')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('uses the first two letters for a single-word name', () => {
    render(<Avatar name="madonna" />);
    expect(screen.getByText('MA')).toBeInTheDocument();
  });

  it('renders the provider image when a src is given', () => {
    render(<Avatar name="Ada Lovelace" src="https://cdn.example.com/a.png" />);
    const img = screen.getByRole('img', { name: 'Ada Lovelace' });
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/a.png');
  });

  it('falls back to initials if the image fails to load', () => {
    render(<Avatar name="Ada Lovelace" src="https://cdn.example.com/broken.png" />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByText('AL')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('picks a black or white text colour for contrast against the generated background', () => {
    const { container } = render(<Avatar name="Grace Hopper" seed="grace@example.com" />);
    const root = container.firstElementChild as HTMLElement;
    expect(['rgb(0, 0, 0)', 'rgb(255, 255, 255)']).toContain(root.style.color);
    expect(root.style.background).not.toBe('');
  });

  it('is deterministic — the same seed yields the same colours', () => {
    const first = render(<Avatar name="X" seed="stable@example.com" />)
      .container.firstElementChild as HTMLElement;
    const firstBg = first.style.background;
    cleanup();
    const second = render(<Avatar name="Different Name" seed="stable@example.com" />)
      .container.firstElementChild as HTMLElement;
    expect(second.style.background).toBe(firstBg);
  });
});
