"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { TEAM_SIZES } from "@/lib/constants";
import { Icon } from "./ui";

// Theme lives on <html class="dark">, seeded before hydration by the inline script in layout.tsx
const subscribeTheme = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
};
const readTheme = () => document.documentElement.classList.contains("dark");

export function ThemeToggle({ className = "" }: { className?: string }) {
  const dark = useSyncExternalStore(subscribeTheme, readTheme, () => false);
  const toggle = useCallback(() => {
    document.documentElement.classList.toggle("dark");
  }, []);
  return (
    <button className={`md-icon-btn ${className}`} aria-label="Toggle theme" onClick={toggle}>
      <Icon name={dark ? "light_mode" : "dark_mode"} />
    </button>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <div
        className={`${compact ? "w-8 h-8" : "w-10 h-10"} bg-primary-container text-on-primary-container rounded-full flex items-center justify-center shrink-0`}
      >
        <Icon name="swords" filled size={compact ? 18 : undefined} />
      </div>
      <div className={compact ? "leading-tight" : "min-w-0"}>
        {compact ? (
          <>
            <div className="title-sm">Team Analyzer</div>
            <div className="body-sm">PokéAPI · Showdown sprites</div>
          </>
        ) : (
          <>
            <h1 className="title-md truncate">Team Analyzer</h1>
            <p className="body-sm">Build &amp; analyze</p>
          </>
        )}
      </div>
    </>
  );
}

export interface ControlsProps {
  teamSize: number;
  onTeamSize: (size: number) => void;
  memberCount: number;
  typeCount: number;
  recommendationCount: number | null; // null when there is nothing to recommend yet
  onOpenRecommendations: () => void;
  onCopy: () => Promise<void>;
  onImport: () => void;
  onReset: () => void;
  // Drawer gets stacked controls + hint; the desktop dock a single row
  variant: "drawer" | "dock";
}

function CopyTeamButton({
  onCopy,
  disabled,
  className,
}: {
  onCopy: () => Promise<void>;
  disabled: boolean;
  className: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copy = useCallback(async () => {
    try {
      await onCopy();
      setState("copied");
    } catch {
      setState("failed");
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 1800);
  }, [onCopy]);
  const label = state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy team";
  return (
    <button
      className={className}
      onClick={copy}
      disabled={disabled}
      title="Copy the team as Showdown text"
      aria-live="polite"
    >
      <Icon name={state === "copied" ? "check" : "content_copy"} />
      <span>{label}</span>
    </button>
  );
}

// Same controls live in the drawer on mobile and under the slots on desktop
export function Controls({
  teamSize,
  onTeamSize,
  memberCount,
  typeCount,
  recommendationCount,
  onOpenRecommendations,
  onCopy,
  onImport,
  onReset,
  variant,
}: ControlsProps) {
  const dock = variant === "dock";
  const id = `teamSize-${variant}`;
  const btn = `md-btn md-btn-outlined !h-9 ${dock ? "w-auto" : "w-full"}`;
  return (
    <div
      className={
        dock
          ? "flex flex-row flex-wrap items-center gap-3 flex-1"
          : "flex flex-col gap-3"
      }
    >
      <div className={dock ? "flex items-center gap-2" : ""}>
        <label htmlFor={id} className={`md-field-label ${dock ? "mb-0 whitespace-nowrap" : ""}`}>
          Team size
        </label>
        <select
          id={id}
          className={`md-field md-field-sm ${dock ? "w-36" : ""}`}
          value={teamSize}
          onChange={(e) => onTeamSize(parseInt(e.target.value))}
        >
          {TEAM_SIZES.map((n) => (
            <option key={n} value={n}>
              {n} Pokémon
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="md-chip !h-8 !px-2.5 body-sm" title="Members">
          <Icon name="groups" size={18} className="text-primary" />
          <span>
            {memberCount}/{teamSize}
          </span>
        </span>
        <span className="md-chip !h-8 !px-2.5 body-sm" title="Distinct types">
          <Icon name="category" size={18} className="text-primary" />
          <span>{typeCount} types</span>
        </span>
      </div>
      {!dock && <p className="body-sm">Tap a slot to add a Pokémon</p>}

      {recommendationCount !== null && (
        <button
          className={`md-chip md-chip-action !h-8 !px-2.5 flex items-center gap-1.5 text-left ${dock ? "w-auto" : "w-full"}`}
          aria-haspopup="dialog"
          onClick={onOpenRecommendations}
        >
          <Icon name="lightbulb" size={18} className="text-primary" />
          <span className={dock ? "" : "flex-1"}>Recommendations</span>
          <span className="label-sm bg-primary-container text-on-primary-container px-1.5 rounded-full">
            {recommendationCount}
          </span>
        </button>
      )}

      <div className={dock ? "flex flex-wrap items-center gap-2 ml-auto" : "flex flex-col gap-2"}>
        <CopyTeamButton onCopy={onCopy} disabled={memberCount === 0} className={btn} />
        <button className={btn} onClick={onImport} aria-haspopup="dialog" title="Paste a Showdown team">
          <Icon name="content_paste" />
          <span>Import team</span>
        </button>
        <button className={btn} onClick={onReset}>
          <Icon name="restart_alt" />
          <span>Reset team</span>
        </button>
      </div>
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 bg-scrim z-30 lg:hidden ${open ? "" : "hidden"}`}
        onClick={onClose}
      />
      <aside
        className={`md-drawer fixed inset-y-0 left-0 w-64 z-40 flex flex-col transform transition-transform duration-300 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-4 pt-4 pb-3 flex items-center gap-3">
          <Brand />
          <span className="ml-auto flex">
            <ThemeToggle />
          </span>
          <button className="md-icon-btn" aria-label="Close menu" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <div className="flex-1 min-h-0 px-3 pt-1 pb-3 overflow-y-auto overscroll-contain">{children}</div>
        <div className="px-4 py-3 body-sm">
          <p>Data: PokéAPI · Sprites: Pokémon Showdown</p>
          <p>
            Design &amp; development by{" "}
            <a
              className="text-primary hover:underline"
              href="http://vishme.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              Vivek Thakur
            </a>
          </p>
        </div>
      </aside>
    </>
  );
}
