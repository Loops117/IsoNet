"use client";

import { useMemo, useState } from "react";

export type TimelineStep = {
  label: string;
  done: boolean;
  inProgress?: boolean;
  status?: string;
  description: string;
};

type TimelineProgressProps = {
  steps: TimelineStep[];
};

export function TimelineProgress({ steps }: TimelineProgressProps) {
  const defaultIndex = useMemo(() => {
    const lastDoneIndex = [...steps]
      .map((step, index) => ({ step, index }))
      .filter(({ step }) => step.done)
      .at(-1)?.index;

    return lastDoneIndex ?? 0;
  }, [steps]);

  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  return (
    <section
      className="isonet-panel overflow-visible px-4 py-3 sm:px-5 sm:py-4"
      onMouseLeave={() => setActiveIndex(defaultIndex)}
    >
      <div className="overflow-x-auto pb-1 isonet-scrollbar">
        <div className="flex min-w-[640px] items-start sm:min-w-[760px]">
          {steps.map((step, index) => {
            const nextStep = steps[index + 1];
            const connectorComplete = Boolean(step.done && nextStep?.done);
            const connectorInProgress = Boolean(
              step.done && nextStep?.inProgress && !nextStep.done,
            );

            return (
              <div key={step.label} className="flex min-w-0 flex-1 items-start">
                <div className="flex w-24 shrink-0 flex-col items-center text-center sm:w-28">
                  <div className="relative flex w-full flex-col items-center">
                    <div
                      className={[
                        "pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-[9rem] -translate-x-1/2 rounded-sm border px-3 py-2 text-left text-[10px] font-medium leading-4 transition-all duration-150 sm:w-[11rem] sm:text-[11px] sm:leading-5",
                        activeIndex === index
                          ? "border-white/16 bg-[rgba(8,20,39,0.96)] text-slate-200 opacity-100 shadow-[0_14px_32px_rgba(0,0,0,0.28)]"
                          : "border-transparent bg-transparent text-transparent opacity-0",
                      ].join(" ")}
                    >
                      {step.description}
                    </div>

                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(index)}
                      onFocus={() => setActiveIndex(index)}
                      onClick={() => setActiveIndex(index)}
                      aria-label={`${step.label}: ${step.description}`}
                      className={[
                        "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors outline-none",
                        "focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35",
                        step.done
                          ? "border-[var(--accent)] bg-[var(--accent)] text-slate-950"
                          : step.inProgress
                            ? "border-amber-300/70 bg-amber-400/90 text-slate-950 shadow-[0_0_0_4px_rgba(251,191,36,0.12)]"
                            : "border-white/14 bg-white/4 text-slate-200",
                      ].join(" ")}
                    >
                      {index + 1}
                    </button>

                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white sm:mt-3 sm:text-[11px] sm:tracking-[0.14em]">
                      {step.label}
                    </p>

                    <div className="mt-2 min-h-[1.25rem]">
                      {step.status ? (
                        <span
                          className={[
                            "rounded-sm border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                            step.inProgress
                              ? "border-amber-300/45 bg-amber-400/14 text-amber-100"
                              : "border-[var(--accent)]/40 bg-[var(--accent)]/12 text-slate-100",
                          ].join(" ")}
                        >
                          {step.status}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Upcoming
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {index < steps.length - 1 ? (
                  <div className="flex min-w-[2.5rem] flex-1 items-center px-2 pt-4">
                    <div className="h-px w-full bg-white/10">
                      <div
                        className={[
                          "h-px transition-all duration-300",
                          connectorComplete
                            ? "w-full bg-[var(--accent)]"
                            : connectorInProgress
                              ? "w-1/2 bg-amber-400/80"
                              : "w-0 bg-transparent",
                        ].join(" ")}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
