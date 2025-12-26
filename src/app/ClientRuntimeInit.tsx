"use client";

import { useEffect } from "react";

export function ClientRuntimeInit() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (typeof window === "undefined") return;

    const perf = window.performance as unknown as {
      measure?: (...args: unknown[]) => unknown;
    };

    if (typeof perf.measure !== "function") return;

    const anyPerf = perf as {
      __baihocMeasurePatched?: boolean;
      __baihocOriginalMeasure?: (...args: unknown[]) => unknown;
      measure: (...args: unknown[]) => unknown;
    };

    if (anyPerf.__baihocMeasurePatched) return;

    const originalMeasure =
      anyPerf.__baihocOriginalMeasure ??
      anyPerf.measure.bind(window.performance);

    anyPerf.__baihocOriginalMeasure = originalMeasure;
    anyPerf.__baihocMeasurePatched = true;

    anyPerf.measure = (...args) => {
      try {
        return originalMeasure(...args);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("negative time stamp")) {
          return null;
        }
        throw error;
      }
    };
  }, []);

  return null;
}
