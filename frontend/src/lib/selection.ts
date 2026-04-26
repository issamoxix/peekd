export interface Selection {
  projectId: string;
  brandId: string;
  brandName: string;
  projectName: string;
}

const KEY = "peekd:selection";
const EVENT = "peekd:selection-change";

const empty: Selection = { projectId: "", brandId: "", brandName: "", projectName: "" };

let cached: Selection = empty;
let cachedRaw: string | null = null;

function parse(raw: string | null): Selection {
  if (!raw) return empty;
  try {
    const p = JSON.parse(raw) as Partial<Selection>;
    return {
      projectId: p.projectId ?? "",
      brandId: p.brandId ?? "",
      brandName: p.brandName ?? "",
      projectName: p.projectName ?? "",
    };
  } catch {
    return empty;
  }
}

/**
 * Returns a stable Selection reference. The same object is returned across
 * calls until localStorage actually changes — required by useSyncExternalStore.
 */
export function readSelection(): Selection {
  if (typeof window === "undefined") return empty;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  cached = parse(raw);
  return cached;
}

export function writeSelection(next: Partial<Selection>): Selection {
  const merged: Selection = { ...readSelection(), ...next };
  const raw = JSON.stringify(merged);
  window.localStorage.setItem(KEY, raw);
  cachedRaw = raw;
  cached = merged;
  window.dispatchEvent(new Event(EVENT));
  return merged;
}

export function clearSelection(): void {
  window.localStorage.removeItem(KEY);
  cachedRaw = null;
  cached = empty;
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeSelection(listener: () => void): () => void {
  window.addEventListener(EVENT, listener);
  // also pick up cross-tab changes
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
