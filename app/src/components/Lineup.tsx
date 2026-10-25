"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CoverageAnalysis } from "@/lib/analysis";
import { TYPES } from "@/lib/constants";
import { lineupHeight, typeName } from "@/lib/calculation";
import type { Member, Team } from "@/lib/types";
import Sprite from "./Sprite";

const EXIT_MS = 280;

interface Figure {
  key: string;
  slot: number;
  member: Member;
}

interface Props {
  team: Team;
  teamSize: number;
  coverage: CoverageAnalysis | null;
}

// Members overflow the stage when several are tall: squeeze them together (taller ones behind)
// by mapping their natural centres onto the stage and clamping each figure inside it.
function packLineup(lineup: HTMLElement) {
  const figs = [...lineup.querySelectorAll<HTMLElement>("figure:not(.lineup-empty):not(.is-leaving)")];
  if (figs.length === 0) return;
  figs.forEach((f) => (f.style.marginLeft = ""));
  lineup.style.justifyContent = "";

  const heightOf = (f: HTMLElement) => f.querySelector("img")?.getBoundingClientRect().height || 0;
  [...figs]
    .sort((a, b) => heightOf(b) - heightOf(a))
    .forEach((f, i) => (f.style.zIndex = String(i + 1)));

  const W = lineup.clientWidth;
  const gap = parseFloat(getComputedStyle(lineup).gap) || 0;
  const widths = figs.map((f) => f.getBoundingClientRect().width);
  const total = widths.reduce((s, w) => s + w, 0) + gap * (figs.length - 1);
  if (total <= W || figs.length < 2) return;

  // Natural centres → stretched so the first/last figures touch the stage edges
  const natural: number[] = [];
  let x = 0;
  for (const w of widths) {
    natural.push(x + w / 2);
    x += w + gap;
  }
  const c0 = natural[0];
  const cN = natural[natural.length - 1];
  const t0 = widths[0] / 2;
  const tN = W - widths[widths.length - 1] / 2;
  const lefts = widths.map((w, i) => {
    const centre = t0 + ((natural[i] - c0) / (cN - c0)) * (tN - t0);
    return Math.max(0, Math.min(W - w, centre - w / 2));
  });

  lineup.style.justifyContent = "flex-start";
  figs.forEach((f, i) => {
    const prevEnd = i === 0 ? 0 : lefts[i - 1] + widths[i - 1] + gap;
    f.style.marginLeft = `${lefts[i] - prevEnd}px`;
  });
}

export default function Lineup({ team, teamSize, coverage }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const packTimer = useRef<number>(0);
  const schedulePack = useCallback(() => {
    window.clearTimeout(packTimer.current);
    packTimer.current = window.setTimeout(() => {
      if (stageRef.current) packLineup(stageRef.current);
    }, 30);
  }, []);

  const wanted = useMemo(() => {
    const list: Figure[] = [];
    for (let i = 0; i < teamSize; i++) {
      const m = team.get(i);
      if (m) list.push({ key: `${i}:${m.id}`, slot: i, member: m });
    }
    return list;
  }, [team, teamSize]);

  // Figures keyed by slot + species: unchanged members stay put, newcomers animate in,
  // departures animate out, and packLineup eases everyone into the new positions
  const [leaving, setLeaving] = useState<Figure[]>([]);
  const [entering, setEntering] = useState<Set<string>>(() => new Set());
  const prevWanted = useRef<Figure[]>([]);
  const figRefs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    const prev = prevWanted.current;
    prevWanted.current = wanted;
    const wantedKeys = new Set(wanted.map((f) => f.key));
    const prevKeys = new Set(prev.map((f) => f.key));

    const gone = prev.filter((f) => !wantedKeys.has(f.key));
    const fresh = wanted.filter((f) => !prevKeys.has(f.key));

    if (gone.length) {
      // Pin the current width so it can collapse to 0 (auto → 0 doesn't animate)
      gone.forEach((f) => {
        const el = figRefs.current.get(f.key);
        if (el) {
          el.style.width = `${el.offsetWidth}px`;
          void el.offsetWidth;
        }
      });
      setLeaving((l) => [...l, ...gone.filter((g) => !l.some((x) => x.key === g.key))]);
      window.setTimeout(() => {
        setLeaving((l) => l.filter((x) => !gone.some((g) => g.key === x.key)));
        schedulePack();
      }, EXIT_MS);
    }
    if (fresh.length) {
      setEntering((s) => new Set([...s, ...fresh.map((f) => f.key)]));
      // Commit the entering state first so the class removal transitions
      window.setTimeout(() => {
        setEntering((s) => {
          const n = new Set(s);
          fresh.forEach((f) => n.delete(f.key));
          return n;
        });
      }, 20);
    }
    schedulePack();
  }, [wanted, schedulePack]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(schedulePack);
    ro.observe(el);
    return () => ro.disconnect();
  }, [schedulePack]);

  // Merge live + leaving figures in slot order (leaving ones keep their place while fading)
  const figures = useMemo(() => {
    const all = [...wanted, ...leaving.filter((l) => !wanted.some((w) => w.key === l.key))];
    return all.sort((a, b) => a.slot - b.slot);
  }, [wanted, leaving]);
  const leavingKeys = useMemo(() => new Set(leaving.map((l) => l.key)), [leaving]);
  const empty = figures.length === 0;

  const summary = coverage
    ? `STAB hits ${coverage.superEffective.length} of ${TYPES.length} types super-effectively.` +
      (coverage.suggestions.length
        ? ` Best additions: ${coverage.suggestions
            .map((s) => `${typeName(s.type)} (+${s.covers.length})`)
            .join(", ")}.`
        : "")
    : "Your team will line up here.";

  return (
    <div className="lineup-card px-4 pt-3 pb-3 lg:py-4 lg:h-[58dvh] lg:shrink-0 border-b border-outline-variant">
      <div
        ref={stageRef}
        className="lineup"
        style={empty ? { justifyContent: "" } : undefined}
      >
        {empty
          ? Array.from({ length: teamSize }, (_, i) => (
              <figure key={`empty-${i}`} className="lineup-empty" aria-hidden="true">
                <span>{i + 1}</span>
              </figure>
            ))
          : figures.map(({ key, member }) => {
              const h = lineupHeight(member);
              const cls = [
                member.types.includes("flying") ? "is-flying" : "",
                entering.has(key) ? "is-entering" : "",
                leavingKeys.has(key) ? "is-leaving" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <figure
                  key={key}
                  ref={(el) => {
                    if (el) figRefs.current.set(key, el);
                    else figRefs.current.delete(key);
                  }}
                  className={cls}
                  title={`${member.name} · ${(member.height / 10).toFixed(1)} m · ${member.types
                    .map((t) => typeName(t))
                    .join(" / ")}`}
                >
                  <Sprite
                    pokemon={member}
                    style={{ height: `${h}px` }}
                    // Wide fliers (Swellow, Lugia) are capped at ~2.2× their height so they don't swallow the stage
                    fit={{ height: h, maxWidth: Math.max(h * 2.2, 170), onFit: schedulePack }}
                  />
                  <figcaption>{member.name}</figcaption>
                </figure>
              );
            })}
      </div>
      <p className="body-sm text-center mt-2 shrink-0">{summary}</p>
    </div>
  );
}
