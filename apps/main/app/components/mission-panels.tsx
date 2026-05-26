"use client";

import { useEffect, useState } from "react";

import { defaultHomepagePanels, type HomepagePanel } from "../../lib/homepage-panels";
import { getSupabaseBrowserClient, hasSupabaseBrowserEnv } from "../../lib/supabase";

export function MissionPanels() {
  const [panels, setPanels] = useState<HomepagePanel[]>(defaultHomepagePanels);
  const [activePanel, setActivePanel] = useState("why-isonet");

  useEffect(() => {
    const client = getSupabaseBrowserClient();

    if (!hasSupabaseBrowserEnv() || !client) {
      return;
    }
    let isMounted = true;

    async function loadPanels() {
      const { data, error } = await client
        .from("site_homepage_panels")
        .select("id, eyebrow, title, compact, description, points, sort_order")
        .order("sort_order", { ascending: true });

      if (error || !isMounted || !data?.length) {
        return;
      }

      const sanitized = data.map((panel) => ({
        id: panel.id,
        eyebrow: panel.eyebrow,
        title: panel.title,
        compact: panel.compact,
        description: panel.description,
        points: Array.isArray(panel.points)
          ? panel.points.filter((point): point is string => typeof point === "string")
          : [],
        sort_order: panel.sort_order ?? 0,
      }));

      setPanels(sanitized);
      setActivePanel((currentPanel) =>
        sanitized.some((panel) => panel.id === currentPanel)
          ? currentPanel
          : sanitized[0]?.id ?? "why-isonet",
      );
    }

    void loadPanels();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div
      className="flex flex-col gap-4 lg:flex-row"
      onMouseLeave={() => setActivePanel("why-isonet")}
    >
      {panels.map((panel) => {
        const isActive = panel.id === activePanel;

        return (
          <button
            key={panel.id}
            type="button"
            onMouseEnter={() => setActivePanel(panel.id)}
            onFocus={() => setActivePanel(panel.id)}
            onClick={() => setActivePanel(panel.id)}
            aria-expanded={isActive}
            data-panel={panel.id}
            className={[
              "group flex min-w-0 flex-1 flex-col rounded-sm border text-left transition-all duration-300 ease-out lg:h-[29rem]",
              "focus:outline-none focus-visible:border-[var(--accent)]/60 focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30",
              isActive
                ? "border-[var(--accent)]/35 bg-white/7 shadow-[0_28px_70px_rgba(0,0,0,0.28)] lg:flex-[2.4]"
                : "border-white/10 bg-white/4 hover:bg-white/6 lg:flex-1",
            ].join(" ")}
          >
            <div className="flex h-full min-h-[18rem] flex-col p-5 sm:min-h-[20rem] sm:p-6 lg:min-h-0">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
                  {panel.eyebrow}
                </p>
                <h3
                  className={[
                    "mt-4 font-semibold tracking-tight text-white transition-all duration-300",
                    isActive ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl",
                  ].join(" ")}
                >
                  {panel.title}
                </h3>
              </div>

              <div
                className={[
                  "mt-5 min-h-0 flex-1 transition-all duration-300 ease-out",
                  isActive
                    ? "overflow-y-auto pr-2 isonet-scrollbar"
                    : "overflow-hidden",
                ].join(" ")}
              >
                <p className="text-sm leading-7 text-slate-300">
                  {isActive ? panel.description : panel.compact}
                </p>

                <div
                  className={[
                    "overflow-hidden transition-all duration-300 ease-out",
                    isActive ? "mt-6 max-h-72 opacity-100" : "max-h-0 opacity-0",
                  ].join(" ")}
                >
                  <ul className="space-y-3 border-t border-white/10 pt-5 text-sm leading-7 text-slate-300">
                    {panel.points.map((point) => (
                      <li key={point} className="flex gap-3">
                        <span className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
