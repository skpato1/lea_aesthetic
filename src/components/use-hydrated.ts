"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
// Keep SSR controls inert until their event handlers are attached.
export function useHydrated() {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
