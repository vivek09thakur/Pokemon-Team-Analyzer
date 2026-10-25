"use client";

import { useEffect, useRef, useState } from "react";
import { MOVE_SLOTS } from "@/lib/constants";
import { padId, slotSpriteScale, typeColor } from "@/lib/calculation";
import { fetchMoveType, knownMoveType } from "@/lib/pokeapi";
import type { Member } from "@/lib/types";
import Sprite from "./Sprite";
import { Icon, TypeChip } from "./ui";

interface Props {
  index: number;
  member: Member | undefined;
  onOpenAdd: (index: number) => void;
  onRemove: (index: number) => void;
  onAbilityChange: (index: number, ability: string) => void;
  onOpenMove: (index: number, moveIndex: number) => void;
}

export default function TeamSlot({
  index,
  member,
  onOpenAdd,
  onRemove,
  onAbilityChange,
  onOpenMove,
}: Props) {
  if (!member) {
    return (
      <div className="team-slot team-slot-empty" onClick={() => onOpenAdd(index)}>
        <Icon name="add_circle" size={24} className="text-primary" />
        <div className="title-sm">Add Pokémon</div>
        <div className="label-sm">Slot {index + 1}</div>
      </div>
    );
  }

  const flying = member.types.includes("flying");
  return (
    <div className="team-slot team-slot-filled">
      <div className="slot-top">
        <div className="slot-head">
          <select
            className="slot-select slot-ability"
            aria-label="Ability"
            title="Ability"
            value={member.ability}
            onChange={(e) => onAbilityChange(index, e.target.value)}
          >
            {member.abilities.length ? (
              member.abilities.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name}
                  {a.hidden ? " (H)" : ""}
                </option>
              ))
            ) : (
              <option value="">No ability</option>
            )}
          </select>
          <div className="slot-name" title={member.name}>
            {member.name}
          </div>
          <span className="label-sm">#{padId(member.id)}</span>
        </div>
        <div className="slot-meta">
          <button
            className="remove-btn"
            aria-label={`Remove ${member.name}`}
            title="Remove"
            onClick={() => onRemove(index)}
          >
            <Icon name="close" size={14} />
          </button>
          {[...member.types].reverse().map((t) => (
            <TypeChip key={t} type={t} small />
          ))}
        </div>
      </div>
      <SlotSprite member={member} flying={flying} />
      <div className="slot-moves">
        {Array.from({ length: MOVE_SLOTS }, (_, i) => (
          <MoveButton
            key={i}
            member={member}
            moveIndex={i}
            onClick={() => onOpenMove(index, i)}
          />
        ))}
      </div>
    </div>
  );
}

function SlotSprite({ member, flying }: { member: Member; flying: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={boxRef} className={`slot-sprite-box${flying ? " is-flying" : ""}`}>
      <Sprite
        pokemon={member}
        style={{ height: `${slotSpriteScale(member)}%` }}
        // Target = the %-of-box height the sprite already has; never wider than the box
        fit={{ height: null, maxWidth: () => boxRef.current?.clientWidth ?? 0 }}
      />
    </div>
  );
}

function MoveButton({
  member,
  moveIndex,
  onClick,
}: {
  member: Member;
  moveIndex: number;
  onClick: () => void;
}) {
  const slug = member.selectedMoves[moveIndex] || "";
  const move = member.moves.find((m) => m.slug === slug);
  // Known types resolve at render; unknown ones are fetched and land in `fetched`
  const [fetched, setFetched] = useState<{ slug: string; type: string | null } | null>(null);
  const type = slug ? knownMoveType(slug) ?? (fetched?.slug === slug ? fetched.type : null) : null;

  useEffect(() => {
    if (!slug || knownMoveType(slug)) return;
    let live = true;
    fetchMoveType(slug).then((t) => {
      // User may have changed the pick while the request was in flight
      if (live) setFetched({ slug, type: t });
    });
    return () => {
      live = false;
    };
  }, [slug]);

  const typed = !!(move && type);
  return (
    <button
      type="button"
      className={`slot-move${!move ? " slot-move-empty" : ""}${typed ? " slot-move-typed" : ""}`}
      style={typed ? { backgroundColor: typeColor(type) } : undefined}
      aria-label={`Move ${moveIndex + 1}`}
      onClick={onClick}
    >
      {move ? move.name : `Move ${moveIndex + 1}`}
    </button>
  );
}
