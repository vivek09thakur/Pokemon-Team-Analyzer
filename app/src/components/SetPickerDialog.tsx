"use client";

import { useEffect, useMemo, useState } from "react";
import { formatName } from "@/lib/calculation";
import { fallbackSet, formatLabel, itemSprite, moveInfo, suggestedSets, type SuggestedSet } from "@/lib/showdown";
import type { Member } from "@/lib/types";
import Dialog from "./Dialog";
import { Icon, TypeChip } from "./ui";

interface Props {
  member: Member | null;
  onClose: () => void;
  onApply: (set: Pick<SuggestedSet, "moves" | "ability" | "item">) => void;
}

type State =
  | { phase: "loading" }
  | { phase: "ready"; sets: SuggestedSet[]; fallback: string[] | null }
  | { phase: "error" };

// Mounted fresh per target (parent keys it)
export default function SetPickerDialog({ member, onClose, onApply }: Props) {
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    if (!member) return;
    let live = true;
    (async () => {
      try {
        const sets = await suggestedSets(member);
        const fallback = sets.length ? null : await fallbackSet(member);
        if (live) setState({ phase: "ready", sets, fallback });
      } catch (e) {
        console.error(e);
        if (live) setState({ phase: "error" });
      }
    })();
    return () => {
      live = false;
    };
  }, [member]);

  const grouped = useMemo(() => {
    if (state.phase !== "ready") return [];
    const byFormat = new Map<string, SuggestedSet[]>();
    for (const s of state.sets) byFormat.set(s.format, [...(byFormat.get(s.format) || []), s]);
    return [...byFormat.entries()];
  }, [state]);

  return (
    <Dialog
      open={!!member}
      onClose={onClose}
      title="Suggested sets"
      subtitle={member ? `${member.name} · from Smogon analyses` : undefined}
      maxWidth="max-w-lg"
      bodyClassName="overflow-y-auto px-4 pb-4"
    >
      {state.phase === "loading" && (
        <div className="py-10 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <div className="body-md">Looking up sets…</div>
        </div>
      )}
      {state.phase === "error" && (
        <p className="body-md text-center py-8">Couldn&apos;t load set data. Try again later.</p>
      )}
      {state.phase === "ready" && grouped.length === 0 && state.fallback && (
        <>
          <p className="body-sm px-2 pb-3">
            No published analysis for {member?.name}. Here&apos;s a strongest-STAB + coverage set from its learnset:
          </p>
          <SetCard
            name="Auto coverage"
            moves={state.fallback}
            onApply={() => onApply({ moves: state.fallback! })}
          />
        </>
      )}
      {grouped.map(([format, sets]) => (
        <section key={format} className="mb-3">
          <h4 className="label-md px-2 pb-1.5 pt-1 text-on-surface-variant">
            {formatLabel(format)}
            <span className="opacity-60"> · Gen {sets[0].gen}</span>
          </h4>
          <div className="flex flex-col gap-2">
            {sets.map((s) => (
              <SetCard
                key={s.name}
                name={s.name}
                moves={s.moves}
                ability={s.ability}
                item={s.item}
                onApply={() => onApply(s)}
              />
            ))}
          </div>
        </section>
      ))}
    </Dialog>
  );
}

function SetCard({
  name,
  moves,
  ability,
  item,
  onApply,
}: {
  name: string;
  moves: string[];
  ability?: string;
  item?: string;
  onApply: () => void;
}) {
  return (
    <button type="button" className="set-card md-card-filled md-chip-action text-left" onClick={onApply}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="title-sm truncate">{name}</span>
        <span className="label-sm text-primary shrink-0 flex items-center gap-1">
          <Icon name="download" size={16} />
          Apply
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {moves.map((slug) => {
          const info = moveInfo(slug);
          return (
            <span key={slug} className="flex items-center gap-1.5 body-sm min-w-0">
              {info ? <TypeChip type={info.type} small /> : null}
              <span className="truncate">{formatName(slug)}</span>
            </span>
          );
        })}
      </div>
      {(ability || item) && (
        <div className="flex items-center gap-3 mt-2 body-sm text-on-surface-variant">
          {ability && (
            <span className="flex items-center gap-1">
              <Icon name="bolt" size={14} />
              {ability}
            </span>
          )}
          {item && (
            <span className="flex items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={itemSprite(item)} alt="" width={18} height={18} className="item-sprite" />
              {formatName(item)}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
