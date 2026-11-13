import { useSyncExternalStore } from "react";
import { getGlobalLoaderEntries, subscribeGlobalLoader } from "../../store/globalLoader";
import BrandLoader from "./BrandLoader";

/** Renders the central blocking overlay. Mount once in App. */
export default function GlobalLoaderHost() {
  const current = useSyncExternalStore(subscribeGlobalLoader, getGlobalLoaderEntries);
  if (current.length === 0) return null;
  return (
    <div className="global-loader" aria-busy="true">
      <BrandLoader label={current[current.length - 1].label} />
    </div>
  );
}
