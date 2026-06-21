'use client';

import type { ReactNode } from 'react';
import SelectBase, {
  components,
  type CSSObjectWithLabel,
  type ClassNamesConfig,
  type DropdownIndicatorProps,
  type GroupBase,
  type OptionProps,
  type SingleValueProps,
} from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { ChevronDown } from 'lucide-react';
import { type SelectOption } from './select';
import { cn } from '../lib/cn';

// react-select backed single-select that drops react-select's own styles
// (`unstyled`) and substitutes the app's design tokens — so it matches the rest
// of the UI and tracks the theme. Same prop shape as the lightweight ui/Select,
// so it's a drop-in. The menu portals to <body> with fixed positioning, so it's
// never clipped by an accordion/modal `overflow-hidden`.

// Internal option type is non-generic (value: string) so react-select's custom
// component props type cleanly; StyledSelect stays generic at its public edge.
type RSOption = { value: string; label: string; icon?: ReactNode };

// react-select hard-codes `zIndex: 1` on the portal wrapper (menuPortalCSS has no
// `unstyled` branch, so it's there regardless of our styling). That loses to app
// chrome that sits in its own stacking context above it — e.g. the council
// composer's `.gradient-border` surface (isolation: isolate + z-10) — clipping a
// menu that opens upward over it. Lift the wrapper above that. Must be `styles`
// (inline), not a `classNames` z-index utility: the inline zIndex would win.
const liftMenuPortal = (base: CSSObjectWithLabel): CSSObjectWithLabel => ({
  ...base,
  zIndex: 100,
});

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
        styles={{ menuPortal: liftMenuPortal }}
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

// ── Creatable model combobox ────────────────────────────────────────────────
// A searchable select pre-populated with suggested model ids (optionally grouped
// by provider) that still lets the user type any custom id their endpoint
// supports — important for openai-compatible / local models.

type ModelOpt = { value: string; label: string };

const modelClassNames: ClassNamesConfig<ModelOpt, false, GroupBase<ModelOpt>> = {
  control: ({ isFocused, isDisabled }) =>
    cn(
      'min-h-9 cursor-text rounded-md border bg-background pl-1 pr-0.5 text-sm transition-colors',
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
  group: () => 'py-1',
  groupHeading: () =>
    'px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground',
  option: ({ isFocused, isSelected }) =>
    cn(
      'cursor-pointer rounded px-2 py-1.5 text-sm transition-colors',
      isSelected
        ? 'bg-accent font-medium text-accent-foreground'
        : isFocused
          ? 'bg-accent/50 text-foreground'
          : 'text-foreground',
    ),
  noOptionsMessage: () => 'px-2.5 py-3 text-sm text-muted-foreground',
};

function ModelDropdownIndicator(props: DropdownIndicatorProps<ModelOpt, false, GroupBase<ModelOpt>>) {
  return (
    <components.DropdownIndicator {...props}>
      <ChevronDown className="h-4 w-4" />
    </components.DropdownIndicator>
  );
}

function flattenModelOptions(
  options: ReadonlyArray<ModelOpt | GroupBase<ModelOpt>>,
): ModelOpt[] {
  return options.flatMap((o) => ('options' in o ? [...o.options] : [o]));
}

export function ModelComboSelect({
  options,
  value,
  onChange,
  placeholder,
  className,
  'aria-label': ariaLabel,
}: {
  options: ReadonlyArray<ModelOpt | GroupBase<ModelOpt>>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
}) {
  const flat = flattenModelOptions(options);
  // Echo a custom (typed) id back as the selected value so it survives reopen.
  const selected = flat.find((o) => o.value === value) ?? (value ? { value, label: value } : null);

  return (
    <div className={className}>
      <CreatableSelect<ModelOpt, false, GroupBase<ModelOpt>>
        unstyled
        classNames={modelClassNames}
        styles={{ menuPortal: liftMenuPortal }}
        options={options}
        value={selected}
        onChange={(opt) => onChange(opt?.value ?? '')}
        isSearchable
        isClearable={false}
        placeholder={placeholder}
        aria-label={ariaLabel}
        formatCreateLabel={(input) => `Use “${input}”`}
        menuPortalTarget={PORTAL_TARGET}
        menuPosition="fixed"
        components={{ DropdownIndicator: ModelDropdownIndicator }}
      />
    </div>
  );
}
