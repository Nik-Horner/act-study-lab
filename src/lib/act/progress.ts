"use client";
import { useSyncExternalStore } from "react";
import { createCloudProgressStore } from "./cloud-store";
export * from "./progress-model";
const store = createCloudProgressStore();
let initialized = false;
function subscribe(listener: () => void) {
  if (!initialized) {
    initialized = true;
    window.addEventListener("focus", () => {
      void store.refresh();
    });
    window.addEventListener("online", () => {
      void store.refresh();
    });
    window.addEventListener("act-study-preference", () => {
      void store.refresh();
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) void store.refresh();
    });
    window.addEventListener("beforeunload", (event) => {
      if (store.pendingCount()) event.preventDefault();
    });
  }
  return store.subscribe(listener);
}
export const retryPending = store.retry;
export function useProgress() {
  const snapshot = useSyncExternalStore(
    subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  return { ...snapshot, update: store.update, retry: store.retry };
}
