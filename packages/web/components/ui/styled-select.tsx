'use client';

import type { ReactNode } from 'react';
import SelectBase, {
  components,
  type ClassNamesConfig,
  type DropdownIndicatorProps,
  type OptionProps,
  type SingleValueProps,
} from 'react-select';
import { ChevronDown } from 'lucide-react';
import type { SelectOption } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// react-select backed single-select that drops react-select's own styles
// (`unstyled`) and substitutes the app's design tokens — so it matches the rest
// of the UI and tracks the theme. Same prop shape as the lightweight ui/Select,
// so it's a drop-in. The menu portals to <body> with fixed positioning, so it's
// never clipped by an accordion/modal `overflow-hidden`.

// Internal option type is non-generic (value: string) so react-select's custom
// component props type cleanly; StyledSelect stays generic at its public edge.
type RSOption = { value: string; label: string; icon?: ReactNode };

const classNames: ClassNamesConfig<RSOption, false> = {
  control: ({ isFocused, isDisabled }) =>
    cn(
      'min-h-9 cursor-pointer rounded-md border bg-background pl-1 pr-0.5 text-sm transition-colors',
      isFocused ? 'border-ring ring-1 ring-ring' : 'border-input hover:bg-accent/50',
      isDisabled && 'cursor-not-allowed opacity-50',
    ),
  valueContainer: () => 'gap-2 px-2',
  input: () => 'text-foreground text-sm',
  placeholder: () => 'text-muted-foreground text-sm',
  singleValue: () => 'text-foreground text-sm',
  indicatorsContainer: () => 'px-0.5',
  dropdownIndicator: () => 'text-muted-foreground p-1.5',
  indicatorSeparator: () => 'hidden',
  menu: () => 'z-[100] mt-1 overflow-hidden rounded-md border border-border bg-card shadow-lg',
  menuList: () => 'max-h-72 overflow-auto p-1',
  option: ({ isFocused, isSelected }) =>
    cn(
      'flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors',
      isSelected
        ? 'bg-accent font-medium text-accent-foreground'
        : isFocused
          ? 'bg-accent/50 text-foreground'
          : 'text-foreground',
    ),
  noOptionsMessage: () => 'px-2.5 py-3 text-sm text-muted-foreground',
};

function OptionLabel({ icon, label }: RSOption) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {icon ? <span className="flex shrink-0 items-center">{icon}</span> : null}
      <span className="truncate">{label}</span>
    </span>
  );
}

function Option(props: OptionProps<RSOption, false>) {
  return (
    <components.Option {...props}>
      <OptionLabel {...props.data} />
    </components.Option>
  );
}

function SingleValue(props: SingleValueProps<RSOption, false>) {
  return (
    <components.SingleValue {...props}>
      <OptionLabel {...props.data} />
    </components.SingleValue>
  );
}

function DropdownIndicator(props: DropdownIndicatorProps<RSOption, false>) {
  return (
    <components.DropdownIndicator {...props}>
      <ChevronDown className="h-4 w-4" />
    </components.DropdownIndicator>
  );
}

const PORTAL_TARGET = typeof document !== 'undefined' ? document.body : undefined;

export function StyledSelect<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  isSearchable = false,
  className,
  'aria-label': ariaLabel,
}: {
  options: ReadonlyArray<SelectOption<T>>;
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  isSearchable?: boolean;
  className?: string;
  'aria-label'?: string;
}) {
  const opts: RSOption[] = options.map((o) => ({ value: o.value, label: o.label, icon: o.icon }));
  const selected = opts.find((o) => o.value === value) ?? null;

  return (
    <div className={className}>
      <SelectBase<RSOption>
        unstyled
        classNames={classNames}
        options={opts}
        value={selected}
        onChange={(opt) => opt && onChange(opt.value as T)}
        isDisabled={disabled}
        isSearchable={isSearchable}
        aria-label={ariaLabel}
        menuPortalTarget={PORTAL_TARGET}
        menuPosition="fixed"
        components={{ Option, SingleValue, DropdownIndicator }}
      />
    </div>
  );
}
