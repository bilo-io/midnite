// @midnite/ui — the reusable component library + design system.
//
// Phase 25 Theme A stood up the package + Vite build; Theme B moves in the design
// tokens (here) + the theme runtime (`@midnite/ui/theme`) + the token CSS
// (`@midnite/ui/styles`). The generic primitives (button, card, input, …) migrate
// from packages/web/components/ui in Theme C.

export { cn } from './lib/cn';

// Typed design tokens (the TS mirror of `@midnite/ui/styles`).
export * from './tokens';

// Generic UI primitives (Phase 25 Theme C).
export { Accordion } from './components/accordion';
export { Button, buttonVariants, type ButtonProps } from './components/button';
export { Card, CardHeader, CardTitle, CardContent } from './components/card';
export { Collapse } from './components/collapse';
export { Input, type InputProps } from './components/input';
export { Select, type SelectOption } from './components/select';
export { StyledSelect, ModelComboSelect } from './components/styled-select';
export { Switch } from './components/switch';
export { Tabs, type TabOption } from './components/tabs';
export { Textarea, type TextareaProps } from './components/textarea';
