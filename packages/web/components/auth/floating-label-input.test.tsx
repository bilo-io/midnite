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

  it('wraps the field in the app gradient-border glow', () => {
    const { container } = render(<Harness />);
    expect(container.querySelector('.gradient-border')).not.toBeNull();
  });

  it('floats the label (up + smaller) when focused', () => {
    render(<Harness />);
    const input = screen.getByLabelText('Email');
    const label = screen.getByText('Email');

    // At rest: sits inside the field at full size.
    expect(label.style.transform).toContain('scale(1)');

    fireEvent.focus(input);
    // Floated: lifts clear of the top edge and shrinks.
    expect(label.style.transform).toContain('translateY(-1.15rem)');
    expect(label.style.transform).toContain('scale(0.82)');
  });

  it('keeps the label floated when the field holds a value even after blur', () => {
    render(<Harness />);
    const input = screen.getByLabelText('Email') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'ada@x.com' } });
    fireEvent.blur(input);
    expect(screen.getByText('Email').style.transform).toContain('scale(0.82)');
  });
});
