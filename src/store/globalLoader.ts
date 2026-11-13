/**
 * Central blocking loader store. One overlay for the whole app, rendered by GlobalLoaderHost
 * (mounted once in App.tsx). Several callers can be active at once; the latest label is shown.
 * Use it for actions the user waits on. Use AppLoader for a region that is loading.
 */

type Entry = { id: number; label: string };

let entries: Entry[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const globalLoader = {
  /** Shows the overlay and returns a function that hides this entry. */
  show(label: string): () => void {
    const id = nextId++;
    entries = [...entries, { id, label }];
    emit();
    return () => {
      entries = entries.filter((e) => e.id !== id);
      emit();
    };
  },
};

export const subscribeGlobalLoader = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const getGlobalLoaderEntries = () => entries;
