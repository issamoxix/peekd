export interface Selection {
  projectId: string;
  brandId: string;
  brandName: string;
  projectName: string;
}

const KEY = "peekd:selection";
const EVENT = "peekd:selection-change";

const empty: Selection = { projectId: "", brandId: "", brandName: "", projectName: "" };

export function readSelection(): Selection {
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<Selection>;
    return {
      projectId: parsed.projectId ?? "",
      brandId: parsed.brandId ?? "",
      brandName: parsed.brandName ?? "",
      projectName: parsed.projectName ?? "",
    };
  } catch {
    return empty;
  }
}

export function writeSelection(next: Partial<Selection>): Selection {
  const merged: Selection = { ...readSelection(), ...next };
  window.localStorage.setItem(KEY, JSON.stringify(merged));
  window.dispatchEvent(new Event(EVENT));
  return merged;
}

export function clearSelection(): void {
  window.localStorage.removeItem(KEY);
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
