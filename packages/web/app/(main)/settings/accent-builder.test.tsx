import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { BRAND_ACCENT, SECONDARY_ACCENT_OFF, type AccentValue } from '@/lib/app-settings';
import { AccentBuilder } from './accent-builder';

/** Controlled harness so onChange updates re-render the builder like the real panel. */
function Harness({ onChange, initial = BRAND_ACCENT }: { onChange?: (v: AccentValue) => void; initial?: AccentValue }) {
  const [value, setValue] = useState<AccentValue>(initial);
  const [secondary, setSecondary] = useState<AccentValue>(SECONDARY_ACCENT_OFF);
  return (
    <AccentBuilder
      value={value}
      onChange={(v) => {
        onChange?.(v);
        setValue(v);
      }}
      secondary={secondary}
      onSecondaryChange={setSecondary}
      hydrated
    />
  );
}

describe('AccentBuilder', () => {
  it('offers the brand rainbow first and marks it active by default', () => {
    render(<Harness />);
    const brand = screen.getByRole('radio', { name: 'Brand' });
    expect(brand).toHaveAttribute('aria-checked', 'true');
  });

  it('selects a gradient preset', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Aurora' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ kind: 'gradient', preset: 'aurora' }));
  });

  it('selects a solid accent', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const solids = screen.getByRole('radiogroup', { name: 'Solid accent' });
    fireEvent.click(within(solids).getByRole('radio', { name: 'Blue' }));
    expect(onChange).toHaveBeenCalledWith({ kind: 'solid', swatch: 'blue' });
  });

  it('enters the custom builder and edits type, stops, and angle', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    // Enter custom mode.
    fireEvent.click(screen.getByRole('button', { name: /customise/i }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'gradient', preset: 'custom' }));

    // Switch geometry to conic.
    fireEvent.click(screen.getByRole('radio', { name: 'Conic' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'conic' }));

    // Change the angle via the slider.
    fireEvent.change(screen.getByLabelText('Angle'), { target: { value: '180' } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ angle: 180 }));
  });

  it('collapses to a single stop in mono mode', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} initial={{ kind: 'gradient', preset: 'custom', type: 'linear', stops: ['blue', 'violet'], angle: 90, animate: false }} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Mono' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ stops: ['blue'] }));
  });

  it('sets an independent secondary accent', () => {
    render(<Harness />);
    const secondaryGroup = screen.getByRole('radiogroup', { name: 'Secondary accent' });
    fireEvent.click(within(secondaryGroup).getByRole('radio', { name: 'Emerald' }));
    // Secondary is controlled internally; assert the swatch is now checked.
    expect(within(secondaryGroup).getByRole('radio', { name: 'Emerald' })).toHaveAttribute('aria-checked', 'true');
  });
});
