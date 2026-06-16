'use client';

import {
  components,
  type ClassNamesConfig,
  type GroupBase,
  type OptionProps,
  type SingleValueProps,
} from 'react-select';
import SelectBase from 'react-select';
import type { Project } from '@midnite/shared';
import type { ProviderOption } from '@/lib/use-media-models';
import { ProviderIcon } from './provider-icon';
import { cn } from '@/lib/utils';

// ── Shared classNames ─────────────────────────────────────────────────────────
// Strips react-select's default styles completely and substitutes Tailwind classes
// that reference the app's CSS-variable design tokens.

function makeClassNames<T>(): ClassNamesConfig<T, false, GroupBase<T>> {
  return {
    control: ({ isFocused }) =>
      cn(
        'cursor-pointer rounded-md border bg-transparent transition-colors',
        isFocused
          ? 'border-ring shadow-[0_0_0_1px_hsl(var(--ring))]'
          : 'border-border/60 hover:border-border',
      ),
    valueContainer: () => 'px-2 py-0.5 gap-1',
    input: () => 'text-foreground text-xs',
    placeholder: () => 'text-muted-foreground text-xs',
    singleValue: () => 'text-foreground text-xs',
    indicatorsContainer: () => 'px-0.5',
    dropdownIndicator: () => 'text-muted-foreground p-1 hover:text-foreground',
    indicatorSeparator: () => 'hidden',
    menu: () =>
      'z-[100] mt-1 overflow-hidden rounded-md border border-border bg-card shadow-lg',
    menuList: () => 'max-h-52 overflow-auto py-1',
    option: ({ isFocused, isSelected }) =>
      cn(
        'cursor-pointer px-2.5 py-2 text-xs transition-colors',
        isSelected
          ? 'bg-accent text-accent-foreground font-medium'
          : isFocused
            ? 'bg-accent/50 text-foreground'
            : 'text-foreground',
      ),
    noOptionsMessage: () => 'px-2.5 py-3 text-xs text-muted-foreground',
  };
}

const PORTAL_TARGET = typeof document !== 'undefined' ? document.body : undefined;

// ── Project select ─────────────────────────────────────────────────────────────

type ProjectOption = { value: string; label: string; color: string; tag: string };

function ProjectOptionLabel({ color, tag, label }: ProjectOption) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-bold leading-none text-white"
        style={{ background: color }}
        aria-hidden
      >
        {tag.slice(0, 2).toUpperCase()}
      </span>
      <span className="truncate">{label}</span>
    </span>
  );
}

function ProjectOptionComponent(props: OptionProps<ProjectOption>) {
  return (
    <components.Option {...props}>
      <ProjectOptionLabel {...props.data} />
    </components.Option>
  );
}

function ProjectSingleValue(props: SingleValueProps<ProjectOption>) {
  return (
    <components.SingleValue {...props}>
      <ProjectOptionLabel {...props.data} />
    </components.SingleValue>
  );
}

type ProjectSelectProps = {
  projects: Project[];
  value: string;
  onChange: (value: string) => void;
};

export function ProjectSelect({ projects, value, onChange }: ProjectSelectProps) {
  const options: ProjectOption[] = [
    { value: '', label: 'All projects', color: 'hsl(var(--muted-foreground))', tag: '•' },
    ...projects.map((p) => ({ value: p.id, label: p.name, color: p.color, tag: p.tag })),
  ];
  const selected = options.find((o) => o.value === value) ?? options[0]!;

  return (
    <SelectBase<ProjectOption>
      unstyled
      classNames={makeClassNames<ProjectOption>()}
      options={options}
      value={selected}
      onChange={(opt) => onChange(opt?.value ?? '')}
      isSearchable={projects.length > 5}
      menuPortalTarget={PORTAL_TARGET}
      menuPosition="fixed"
      components={{ Option: ProjectOptionComponent, SingleValue: ProjectSingleValue }}
    />
  );
}

// ── Provider select ────────────────────────────────────────────────────────────

type ProviderOptionItem = { value: string; label: string };

function ProviderOptionLabel({ value, label }: ProviderOptionItem) {
  return (
    <span className="flex items-center gap-2">
      <ProviderIcon provider={value} size={13} />
      <span className="truncate">{label}</span>
    </span>
  );
}

function ProviderOptionComponent(props: OptionProps<ProviderOptionItem>) {
  return (
    <components.Option {...props}>
      <ProviderOptionLabel {...props.data} />
    </components.Option>
  );
}

function ProviderSingleValue(props: SingleValueProps<ProviderOptionItem>) {
  return (
    <components.SingleValue {...props}>
      <ProviderOptionLabel {...props.data} />
    </components.SingleValue>
  );
}

type ProviderSelectProps = {
  providers: ProviderOption[];
  value: string;
  onChange: (value: string) => void;
};

export function ProviderSelectRS({ providers, value, onChange }: ProviderSelectProps) {
  const options: ProviderOptionItem[] = providers.map((p) => ({
    value: p.provider,
    label: p.label,
  }));
  const selected = options.find((o) => o.value === value) ?? options[0]!;

  return (
    <SelectBase<ProviderOptionItem>
      unstyled
      classNames={makeClassNames<ProviderOptionItem>()}
      options={options}
      value={selected}
      onChange={(opt) => onChange(opt?.value ?? '')}
      isSearchable={false}
      menuPortalTarget={PORTAL_TARGET}
      menuPosition="fixed"
      components={{ Option: ProviderOptionComponent, SingleValue: ProviderSingleValue }}
    />
  );
}

// ── Model select ───────────────────────────────────────────────────────────────

type ModelOption = { value: string; label: string };

type ModelSelectProps = {
  models: ModelOption[];
  value: string;
  onChange: (value: string) => void;
};

export function ModelSelect({ models, value, onChange }: ModelSelectProps) {
  const selected = models.find((m) => m.value === value) ?? models[0]!;

  return (
    <SelectBase<ModelOption>
      unstyled
      classNames={makeClassNames<ModelOption>()}
      options={models}
      value={selected}
      onChange={(opt) => onChange(opt?.value ?? '')}
      isSearchable={false}
      menuPortalTarget={PORTAL_TARGET}
      menuPosition="fixed"
    />
  );
}
