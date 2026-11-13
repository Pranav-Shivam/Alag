import { useEffect } from "react";
import { globalLoader } from "../store/globalLoader";

/** Shows the central blocking overlay with `label` while `active` is true. */
export function useGlobalLoader(active: boolean, label: string) {
  useEffect(() => {
    if (!active) return;
    return globalLoader.show(label);
  }, [active, label]);
}
