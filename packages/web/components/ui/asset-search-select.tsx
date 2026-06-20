'use client';

import { useMemo, useState } from 'react';
import AsyncSelect from 'react-select/async';
import {
  components,
  type ClassNamesConfig,
  type CSSObjectWithLabel,
  type DropdownIndicatorProps,
  type OptionProps,
} from 'react-select';
import { Search } from 'lucide-react';
import type { AssetKind, AssetSearchResult } from '@midnite/shared';
import { searchAssets } from '@/lib/api';
import { cn } from '@/lib/utils';

// Async autocomplete over the gateway's `/market/search` proxy, shared by the
// market-asset and market-watchlist widgets. Styling mirrors ui/styled-select so
// it tracks the theme; the menu portals to <body> so the grid panel's
// `overflow-hidden` never clips it.

type AssetOption = { value: string; label: string; result: AssetSearchResult };

const SEARCH_DEBOUNCE_MS = 250;

const liftMenuPortal = (base: CSSObjectWithLabel): CSSObjectWithLabel => ({ ...base, zIndex: 100 });

const classNames: ClassNamesConfig<AssetOption, false> = {
  control: ({ isFocused }) =>
    cn(
      'min-h-9 cursor-text rounded-md border bg-background pl-2 pr-0.5 text-sm transition-colors',
      isFocused ? 'border-ring ring-1 ring-ring' : 'border-input hover:bg-accent/50',
    ),
  valueContainer: () => 'gap-2 px-1',
  input: () => 'text-foreground text-sm',
  placeholder: () => 'text-muted-foreground text-sm',
  indicatorsContainer: () => 'px-0.5',
  dropdownIndicator: () => 'text-muted-foreground p-1.5',
  indicatorSeparator: () => 'hidden',
  loadingIndicator: () => 'text-muted-foreground',
  menu: () => 'z-[100] mt-1 overflow-hidden rounded-md border border-border bg-card shadow-lg',
  menuList: () => 'max-h-72 overflow-auto p-1',
  option: ({ isFocused }) =>
    cn('cursor-pointer rounded px-2 py-1.5 text-sm transition-colors', isFocused ? 'bg-accent/50 text-foreground' : 'text-foreground'),
  noOptionsMessage: () => 'px-2.5 py-3 text-sm text-muted-foreground',
  loadingMessage: () => 'px-2.5 py-3 text-sm text-muted-foreground',
};

function Option(props: OptionProps<AssetOption, false>) {
  const { result } = props.data;
  return (
    <components.Option {...props}>
      <span className="flex min-w-0 items-baseline justify-between gap-2">
        <span className="truncate">{result.name}</span>
        <span className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
          {result.kind === 'stock' ? (result.exchange ?? result.symbol) : result.symbol}
        </span>
      </span>
    </components.Option>
  );
}

function DropdownIndicator(props: DropdownIndicatorProps<AssetOption, false>) {
  return (
    <components.DropdownIndicator {...props}>
      <Search className="h-3.5 w-3.5" />
    </components.DropdownIndicator>
  );
}

const PORTAL_TARGET = typeof document !== 'undefined' ? document.body : undefined;

/** Debounce an async loader; settle any superseded call to an empty list. */
function makeDebouncedLoader(
  load: (input: string) => Promise<AssetOption[]>,
): (input: string) => Promise<AssetOption[]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let prevResolve: ((opts: AssetOption[]) => void) | undefined;
  return (input) =>
    new Promise<AssetOption[]>((resolve) => {
      if (timer) clearTimeout(timer);
      prevResolve?.([]);
      prevResolve = resolve;
      timer = setTimeout(() => {
        prevResolve = undefined;
        load(input).then(resolve, () => resolve([]));
      }, SEARCH_DEBOUNCE_MS);
    });
}

export function AssetSearchSelect({
  kind,
  onSelect,
  placeholder = 'Search…',
  autoFocus = false,
}: {
  kind: AssetKind;
  onSelect: (result: AssetSearchResult) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [input, setInput] = useState('');

  // Rebuild the debounced loader when the asset class changes so in-flight
  // stock searches don't resolve into the crypto list (or vice versa).
  const loadOptions = useMemo(
    () =>
      makeDebouncedLoader(async (value: string) => {
        const q = value.trim();
        if (!q) return [];
        const results = await searchAssets(kind, q);
        return results.map((r) => ({ value: `${r.kind}:${r.symbol}`, label: r.name, result: r }));
      }),
    [kind],
  );

  return (
    <AsyncSelect<AssetOption, false>
      unstyled
      classNames={classNames}
      styles={{ menuPortal: liftMenuPortal }}
      loadOptions={loadOptions}
      inputValue={input}
      onInputChange={(value, meta) => {
        if (meta.action === 'input-change') setInput(value);
      }}
      value={null}
      onChange={(opt) => {
        if (opt) {
          onSelect(opt.result);
          setInput('');
        }
      }}
      placeholder={placeholder}
      autoFocus={autoFocus}
      isClearable={false}
      // We do our own filtering server-side; show every result react-select is given.
      filterOption={() => true}
      noOptionsMessage={({ inputValue }) => (inputValue.trim() ? 'No matches' : 'Type to search…')}
      loadingMessage={() => 'Searching…'}
      aria-label={`Search ${kind === 'stock' ? 'stocks' : 'crypto'}`}
      menuPortalTarget={PORTAL_TARGET}
      menuPosition="fixed"
      components={{ Option, DropdownIndicator }}
    />
  );
}
