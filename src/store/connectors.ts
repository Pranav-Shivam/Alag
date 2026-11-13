import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Which connectors are connected. Simulated: nothing real is called, and it is kept in the browser only. */
interface ConnectorState {
  /** connector id -> ISO time it was connected */
  connected: Record<string, string>;
  connect: (id: string) => void;
  disconnect: (id: string) => void;
}

// A believable starting set so the page and the step screens show both states.
const SEED_AT = "2026-10-01T09:00:00Z";
const SEED = ["microsoft-365-outlook", "sharepoint", "hubspot", "slack", "azure-ai-document-intelligence", "oracle-netsuite", "stripe"];

export const useConnectors = create<ConnectorState>()(
  persist(
    (set) => ({
      connected: Object.fromEntries(SEED.map((id) => [id, SEED_AT])),
      connect: (id) => set((s) => ({ connected: { ...s.connected, [id]: new Date().toISOString() } })),
      disconnect: (id) =>
        set((s) => {
          const { [id]: _removed, ...rest } = s.connected;
          return { connected: rest };
        }),
    }),
    { name: "alag-connectors-v1", version: 1 },
  ),
);
