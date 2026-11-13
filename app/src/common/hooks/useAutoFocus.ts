"use client";

import { useEffect, type RefObject } from "react";

export function useAutoFocus(
  ref: RefObject<HTMLElement | null>,
  active = true,
  delay = 50
) {
  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(() => ref.current?.focus(), delay);
    return () => window.clearTimeout(t);
  }, [ref, active, delay]);
}
