"use client";

import { useEffect, useState } from "react";
import type { AnalysisResult, DefenseEntry, MemberAnalysis, Severity } from "@/lib/analysis";
import { TYPES } from "@/lib/constants";
import type { Member } from "@/lib/types";
import Sprite from "./Sprite";
import { Icon, TypeChip } from "./ui";

interface Props {
  result: AnalysisResult | null;
  updatedAt: string;
}

export default function AnalysisPanel({ result, updatedAt }: Props) {
  if (!result) {
    return (
      <div className="md-card-filled p-8 flex flex-col items-center text-center gap-2 min-h-[320px] justify-center">
        <Icon name="insights" size={40} className="text-primary" />
        <p className="title-md">Build your team</p>
        <p className="body-md max-w-sm">
          Tap a slot to search any Pokémon. Coverage, weaknesses and recommendations appear here and
          update live as you add them.
        </p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4 min-w-0">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4">
        <ScoreCard result={result} updatedAt={updatedAt} />
        <ThreatSummary result={result} />
      </div>

      <div className="md-card p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon name="swap_horiz" className="text-error" />
          <h3 className="title-md">Threats &amp; switch-ins</h3>
        </div>
        <ThreatList result={result} />
      </div>

      <div className="md-card p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon name="groups" className="text-primary" />
          <h3 className="title-md">Member breakdown</h3>
        </div>
        <p className="body-sm mb-3 text-on-surface-variant">
          The badge is a <b>typing</b> score (0–100): how many attacking types each member resists versus is
          weak to. It ignores stats, so a well-typed Charmander can outscore a 4×-weak legendary.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-3">
          {result.members.map((m) => (
            <MemberCard key={`${m.pokemon.id}-${m.pokemon.name}`} m={m} />
          ))}
        </div>
      </div>
    </section>
  );
}

const CIRC = 2 * Math.PI * 42;

function ScoreCard({ result: r, updatedAt }: { result: AnalysisResult; updatedAt: string }) {
  // Animate from 0 on first paint, then between values
  const [shown, setShown] = useState({ overall: 0, coverage: 0, defense: 0, diversity: 0 });
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      setShown({
        overall: r.overall,
        coverage: r.coverage.score,
        defense: r.defense.score,
        diversity: r.diversity.score,
      })
    );
    return () => cancelAnimationFrame(id);
  }, [r]);

  const grade =
    r.overall >= 85
      ? "Excellent"
      : r.overall >= 70
      ? "Solid"
      : r.overall >= 55
      ? "Decent"
      : r.overall >= 40
      ? "Shaky"
      : "Fragile";

  const bar = (label: string, value: number) => (
    <div>
      <div className="flex justify-between label-sm mb-1">
        <span>{label}</span>
        <span className="text-primary">{value}%</span>
      </div>
      <div className="md-progress !h-1.5">
        <div style={{ width: `${value}%` }} />
      </div>
    </div>
  );

  return (
    <div className="md-card-filled p-4 flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--md-surface-container-highest)" strokeWidth="10" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="var(--md-primary)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${(shown.overall / 100) * CIRC} ${CIRC}`}
              style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.2, 0, 0, 1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="title-lg font-medium leading-none">{r.overall}</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <div className="title-md">{grade}</div>
            <span className="label-sm shrink-0">{updatedAt}</span>
          </div>
          <p className="body-sm mt-0.5">
            {r.coverage.superEffective.length}/{TYPES.length} types hit super-effectively ·{" "}
            {r.defense.critical.length} critical threat{r.defense.critical.length === 1 ? "" : "s"} ·{" "}
            {r.defense.resisted.length} well-resisted
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        {bar("Coverage", shown.coverage)}
        {bar("Defense", shown.defense)}
        {bar("Diversity", shown.diversity)}
      </div>
    </div>
  );
}

function ThreatSummary({ result: d }: { result: AnalysisResult }) {
  const chips = (entries: DefenseEntry[], resisted = false) =>
    entries.length ? (
      entries.map((e) => {
        const detail = [
          e.weakBy.length ? `${e.weakBy.length} weak` : "",
          e.resistBy.length ? `${e.resistBy.length} resist` : "",
          e.immuneBy.length ? `${e.immuneBy.length} immune` : "",
        ]
          .filter(Boolean)
          .join(" · ");
        const count = resisted ? e.resistBy.length + e.immuneBy.length : e.weakBy.length;
        return (
          <span key={e.type} title={detail} className="contents">
            <TypeChip type={e.type}>
              <b className="ml-1 opacity-90">×{count}</b>
            </TypeChip>
          </span>
        );
      })
    ) : (
      <span className="body-sm">None</span>
    );

  const row = (
    icon: string,
    iconClass: string,
    label: string,
    count: number,
    badge: string,
    body: React.ReactNode
  ) => (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-1.5 label-lg text-on-surface">
          <Icon name={icon} size={18} className={iconClass} />
          {label}
        </span>
        <span className={`label-sm px-2 rounded-full ${badge}`}>{count}</span>
      </div>
      <div className="flex flex-wrap gap-1">{body}</div>
    </div>
  );

  return (
    <div className="md-card p-4 flex flex-col gap-3">
      {row("dangerous", "text-error", "Critical", d.defense.critical.length, "bg-error text-on-error", chips(d.defense.critical))}
      {row("warning", "text-warning", "Major", d.defense.major.length, "bg-warning-container text-on-warning-container", chips(d.defense.major))}
      {row("shield", "text-success", "Well resisted", d.defense.resisted.length, "bg-success-container text-on-success-container", chips(d.defense.resisted, true))}
    </div>
  );
}

const BADGE: Record<Severity, string> = {
  critical: "bg-error text-on-error",
  major: "bg-warning-container text-on-warning-container",
  balanced: "bg-surface-highest text-on-surface-variant",
  resisted: "bg-success-container text-on-success-container",
  neutral: "bg-surface-highest text-on-surface-variant",
};
const BADGE_TEXT: Record<Severity, string> = {
  critical: "Critical",
  major: "Major",
  balanced: "Covered",
  resisted: "Covered",
  neutral: "Covered",
};

// One row per attacking type that hits someone: who it hits, and who can switch in
function ThreatList({ result }: { result: AnalysisResult }) {
  const threats = Object.values(result.defense.byType)
    .filter((e) => e.weakBy.length > 0)
    .sort((a, b) => b.net - a.net || b.weakBy.length - a.weakBy.length);

  const nameList = (list: Member[], quad: Member[] = []) =>
    list.map((p, i) => (
      <span key={`${p.id}-${i}`}>
        {i > 0 ? ", " : ""}
        {quad.includes(p) ? <b>{p.name} (4×)</b> : p.name}
      </span>
    ));

  if (!threats.length) {
    return (
      <ul>
        <li className="md-list-item !px-0 body-md">No attacking type hits any member super-effectively.</li>
      </ul>
    );
  }
  return (
    <ul className="divide-y divide-outline-variant">
      {threats.map((e) => {
        const safe = [...e.immuneBy, ...e.resistBy];
        return (
          <li key={e.type} className="md-list-item !px-0 !py-2.5 items-center flex-wrap">
            <TypeChip type={e.type} className="w-20 justify-center shrink-0" />
            <div className="flex-1 min-w-0 body-sm leading-5">
              <div>
                <span className="label-md text-error mr-1">Hits {e.weakBy.length}</span>
                {nameList(e.weakBy, e.quadWeakBy)}
              </div>
              <div>
                {safe.length ? (
                  <>
                    <span className="label-md text-success mr-1">Switch in</span>
                    {nameList(safe)}
                  </>
                ) : (
                  <span className="label-md text-error">No safe switch-in</span>
                )}
              </div>
            </div>
            <span className={`label-sm px-2 py-0.5 rounded-full shrink-0 ${BADGE[e.severity]}`}>
              {BADGE_TEXT[e.severity]}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function MemberCard({ m }: { m: MemberAnalysis }) {
  const tone =
    m.score >= 75
      ? "bg-success-container text-on-success-container"
      : m.score >= 50
      ? "bg-warning-container text-on-warning-container"
      : "bg-error-container text-on-error-container";
  const weakMarks = Object.fromEntries(m.groups.quadWeak.map((t) => [t, "4×"]));
  const resistMarks = {
    ...Object.fromEntries(m.groups.quadResist.map((t) => [t, "¼"])),
    ...Object.fromEntries(m.groups.immune.map((t) => [t, "0"])),
  };
  const chips = (list: string[], mark: Record<string, string> = {}) =>
    list.length ? (
      list.map((t) => (
        <TypeChip key={t} type={t} small>
          {mark[t] ? <b className="opacity-90">{mark[t]}</b> : null}
        </TypeChip>
      ))
    ) : (
      <span className="label-sm">—</span>
    );

  return (
    <div className="md-card-filled p-3 flex gap-3">
      <div className="w-16 h-16 shrink-0 flex items-center justify-center">
        <Sprite pokemon={m.pokemon} className="max-w-full max-h-full" thumb />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="title-sm truncate">{m.pokemon.name}</span>
          <span
            className={`label-sm px-2 py-0.5 rounded-full ${tone} inline-flex items-center gap-1`}
            title={`Typing score: ${m.groups.immune.length} immunities, ${
              m.groups.quadResist.length + m.groups.resist.length
            } resistances, ${m.groups.weak.length + m.groups.quadWeak.length} weaknesses`}
          >
            <Icon name="shield" size={12} />
            {m.score}
          </span>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">{chips(m.pokemon.types)}</div>
        <div className="label-sm mt-2 mb-1">Weak to</div>
        <div className="flex flex-wrap gap-1">{chips([...m.groups.quadWeak, ...m.groups.weak], weakMarks)}</div>
        <div className="label-sm mt-2 mb-1">Resists</div>
        <div className="flex flex-wrap gap-1">
          {chips([...m.groups.immune, ...m.groups.quadResist, ...m.groups.resist], resistMarks)}
        </div>
      </div>
    </div>
  );
}
