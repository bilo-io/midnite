'use client';

import SelectBase, {
  components,
  type CSSObjectWithLabel,
  type ClassNamesConfig,
  type DropdownIndicatorProps,
  type MultiValueGenericProps,
  type OptionProps,
} from 'react-select';
import { ChevronDown } from 'lucide-react';
import { SOURCE_KIND_LABEL, type SourceKind } from '@midnite/shared';
import { SourceIcon } from '@/components/source-icon';
import { cn } from '@/lib/utils';

// A react-select multi-select for filtering the sources list by kind. Styling
// mirrors @midnite/ui's StyledSelect (unstyled + design tokens, menu portalled to
// <body> with fixed positioning) with the extra multi-value chip classes.

type KindOption = { value: SourceKind; label: string };

// react-select hard-codes zIndex:1 on the portal wrapper; lift it above app chrome.
const liftMenuPortal = (base: CSSObjectWithLabel): CSSObjectWithLabel => ({ ...base, zIndex: 100 });

const classNames: ClassNamesConfig<KindOption, true> = {
  control: ({ isFocused }) =>
    cn(
      'min-h-9 cursor-pointer rounded-md border bg-background pl-1 pr-0.5 text-sm transition-colors',
      isFocused ? 'border-ring ring-1 ring-ring' : 'border-input hover:bg-accent/50',
    ),
  valueContainer: () => 'gap-1 px-1.5 py-1 flex-wrap',
  input: () => 'text-foreground text-sm',
  placeholder: () => 'text-muted-foreground text-sm',
  indicatorsContainer: () => 'px-0.5',
  dropdownIndicator: () => 'text-muted-foreground p-1.5',
  clearIndicator: () => 'text-muted-foreground p-1.5 hover:text-foreground',
  indicatorSeparator: () => 'hidden',
  multiValue: () => 'flex items-center gap-1 rounded bg-accent px-1.5 py-0.5',
  multiValueLabel: () => 'text-accent-foreground text-xs',
  multiValueRemove: () => 'text-muted-foreground hover:text-destructive rounded',
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

function Option(props: OptionProps<KindOption, true>) {
  return (
    <components.Option {...props}>
      <span className="flex min-w-0 items-center gap-2">
        <SourceIcon kind={props.data.value} />
        <span className="truncate">{props.data.label}</span>
      </span>
    </components.Option>
  );
}

function MultiValueLabel(props: MultiValueGenericProps<KindOption, true>) {
  return (
    <components.MultiValueLabel {...props}>
      <span className="flex items-center gap-1">
        <SourceIcon kind={props.data.value} className="h-3 w-3" />
        {props.data.label}
      </span>
    </components.MultiValueLabel>
  );
}

function DropdownIndicator(props: DropdownIndicatorProps<KindOption, true>) {
  return (
    <components.DropdownIndicator {...props}>
      <ChevronDown className="h-4 w-4" />
    </components.DropdownIndicator>
  );
}

const PORTAL_TARGET = typeof document !== 'undefined' ? document.body : undefined;

/**
 * Filter the sources list by one or more kinds. `available` is the set of kinds
 * actually present in the list, so the dropdown only offers real options.
 */
export function SourceKindMultiSelect({
  available,
  value,
  onChange,
  className,
}: {
  available: SourceKind[];
  value: SourceKind[];
  onChange: (kinds: SourceKind[]) => void;
  className?: string;
}) {
  const options: KindOption[] = available.map((k) => ({ value: k, label: SOURCE_KIND_LABEL[k] }));
  const selected = options.filter((o) => value.includes(o.value));

  return (
    <div className={className}>
      <SelectBase<KindOption, true>
        isMulti
        unstyled
        classNames={classNames}
        styles={{ menuPortal: liftMenuPortal }}
        options={options}
        value={selected}
        onChange={(opts) => onChange(opts.map((o) => o.value))}
        closeMenuOnSelect={false}
        hideSelectedOptions={false}
        isClearable
        placeholder="Filter by type…"
        aria-label="Filter sources by type"
        menuPortalTarget={PORTAL_TARGET}
        menuPosition="fixed"
        components={{ Option, MultiValueLabel, DropdownIndicator }}
      />
    </div>
  );
}
