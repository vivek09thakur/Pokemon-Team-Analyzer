"use client";

import { useEffect, useMemo, useState } from "react";
import Dialog from "@/common/components/Dialog";
import { Icon } from "@/common/components/Icon";
import { SearchField } from "@/common/components/SearchField";
import { fetchMoveType, knownMoveType } from "@/lib/pokeapi";
import { loadMoveIndex } from "@/lib/showdown";
import type { Member } from "@/lib/types";
import { TypeChip } from "./TypeChip";

interface Props {
  target: { member: Member; moveIndex: number } | null;
  onClose: () => void;
  onPick: (slug: string) => void;
}

export default function MovePickerDialog({ target, onClose, onPick }: Props) {
  const [filter, setFilter] = useState("");
  const [, setTick] = useState(0);

  const member = target?.member;
  const moveIndex = target?.moveIndex ?? 0;
  const current = member?.selectedMoves[moveIndex] || "";
  const taken = useMemo(
    () => new Set((member?.selectedMoves || []).filter((s) => s && s !== current)),
    [member, current]
  );
  const q = filter.trim().toLowerCase();
  const matches = useMemo(
    () => (member?.moves || []).filter((m) => !q || m.name.toLowerCase().includes(q)),
    [member, q]
  );

  useEffect(() => {
    if (!target) return;
    let live = true;
    loadMoveIndex()
      .catch(() => null)
      .then(() => {
        if (!live) return;
        setTick((n) => n + 1);
        matches.slice(0, 30).forEach(async (m) => {
          if (knownMoveType(m.slug)) return;
          const type = await fetchMoveType(m.slug);
          if (live && type) setTick((n) => n + 1);
        });
      });
    return () => {
      live = false;
    };
  }, [matches, target]);

  return (
    <Dialog
      open={!!target}
      onClose={onClose}
      title={`Move ${moveIndex + 1}`}
      subtitle={member?.name}
      maxWidth="max-w-md"
      bodyClassName="overflow-y-auto px-3 pb-2"
      toolbar={<SearchField value={filter} onChange={setFilter} placeholder="Search moves" />}
      footer={
        <div className="px-4 py-3 flex justify-end border-t border-outline-variant">
          <button className="md-btn md-btn-text" onClick={() => onPick("")}>
            <Icon name="backspace" />
            <span>Clear slot</span>
          </button>
        </div>
      }
    >
      <ul>
        {matches.length === 0 ? (
          <li className="body-md text-center py-6">No moves match &quot;{filter}&quot;</li>
        ) : (
          matches.map((m) => {
            const type = knownMoveType(m.slug);
            const isCurrent = m.slug === current;
            const isTaken = taken.has(m.slug);
            return (
              <li key={m.slug}>
                <button
                  type="button"
                  className={`move-option${isCurrent ? " is-current" : ""}`}
                  disabled={isTaken}
                  onClick={() => onPick(m.slug)}
                >
                  <span className="move-option-name">{m.name}</span>
                  <span className="move-option-type">{type ? <TypeChip type={type} small /> : null}</span>
                  {isCurrent ? <Icon name="check" size={18} className="text-primary" /> : null}
                  {isTaken ? <span className="label-sm">In use</span> : null}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </Dialog>
  );
}
