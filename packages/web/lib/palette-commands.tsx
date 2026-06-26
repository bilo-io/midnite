'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type PaletteCommand = {
  id: string;
  label: string;
  /** Lucide icon component — optional; palette renders a fallback if absent. */
  Icon?: React.ComponentType<{ className?: string }>;
  keywords?: string[];
  action: () => void;
};

type Ctx = {
  /** Read all currently registered commands (across all namespaces). */
  getAll: () => PaletteCommand[];
  /** Register a set of commands under a namespace key. Replaces any prior set. */
  register: (ns: string, cmds: PaletteCommand[]) => void;
  /** Unregister a namespace (e.g. on component unmount). */
  unregister: (ns: string) => void;
};

const PaletteCommandsContext = createContext<Ctx>({
  getAll: () => [],
  register: () => {},
  unregister: () => {},
});

export function PaletteCommandsProvider({ children }: { children: ReactNode }) {
  const registry = useRef(new Map<string, PaletteCommand[]>());
  // Bump version on mutations so consumers re-render.
  const [, setV] = useState(0);

  const register = (ns: string, cmds: PaletteCommand[]) => {
    registry.current.set(ns, cmds);
    setV((v) => v + 1);
  };

  const unregister = (ns: string) => {
    registry.current.delete(ns);
    setV((v) => v + 1);
  };

  const getAll = () => Array.from(registry.current.values()).flat();

  return (
    <PaletteCommandsContext.Provider value={{ getAll, register, unregister }}>
      {children}
    </PaletteCommandsContext.Provider>
  );
}

/**
 * Register a set of palette commands under `ns` for the lifetime of the calling
 * component. Commands are updated on every render (the ref tracks the latest
 * values without causing extra re-registrations).
 *
 * @param ns   Stable namespace key — typically a page/component name.
 * @param cmds Palette commands to register. Recreate the array whenever the
 *             actions' closures need to refresh (e.g. on task-id change).
 */
export function useRegisterPaletteCommands(ns: string, cmds: PaletteCommand[]) {
  const { register, unregister } = useContext(PaletteCommandsContext);
  const latestRef = useRef(cmds);
  latestRef.current = cmds;

  useEffect(() => {
    register(ns, latestRef.current);
    return () => unregister(ns);
    // ns changes → cleanup + re-register; cmds update via latestRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ns]);
}

/** Consume the full list of registered palette commands. */
export function usePaletteCommands(): PaletteCommand[] {
  const { getAll } = useContext(PaletteCommandsContext);
  return getAll();
}
