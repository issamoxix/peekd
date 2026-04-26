import { useSyncExternalStore } from "react";
import { readSelection, subscribeSelection, type Selection } from "../lib/selection";

export interface CurrentSelection extends Selection {
  isConfigured: boolean;
}

/**
 * Single source of truth for the active Peec project + brand, persisted in
 * localStorage. The Settings page is the only place that should write it.
 * Reads sync across all subscribers via a custom event + the storage event.
 */
export function useCurrentSelection(): CurrentSelection {
  const selection = useSyncExternalStore(subscribeSelection, readSelection, readSelection);
  return {
    ...selection,
    isConfigured: Boolean(selection.projectId && selection.brandId),
  };
}
