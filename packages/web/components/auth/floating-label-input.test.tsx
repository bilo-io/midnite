import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { FloatingLabelInput } from './floating-label-input';

afterEach(cleanup);

/** Controlled wrapper so `value` reflects typing (the floated state reads it). */
function Harness() {
  const [v, setV] = useState('');
  return <FloatingLabelInput id="email" label="Email" value={v} onChange={(e) => setV(e.target.value)} />;
}

describe('FloatingLabelInput', () => {
  it('associates the label with the input', () => {
    render(<FloatingLabelInput id="email" label="Email" value="" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('floats the label (smaller) when focused, and paints the accent-gradient frame', () => {
    const { container } = render(<Harness />);
    const frame = container.firstElementChild as HTMLElement;
    const input = screen.getByLabelText('Email');
    const label = screen.getByText('Email');

    // At rest: label centred, frame is a solid border, no gradient.
    expect(label.className).toContain('top-1/2');
    expect(frame.style.backgroundImage).toBe('');

    fireEvent.focus(input);
    expect(label.className).toContain('top-1.5');
    expect(frame.style.backgroundImage).toContain('--accent-gradient');
  });

  it('keeps the label floated when the field holds a value even after blur', () => {
    render(<Harness />);
    const input = screen.getByLabelText('Email') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'ada@x.com' } });
    fireEvent.blur(input);
    expect(screen.getByText('Email').className).toContain('top-1.5');
  });
});
