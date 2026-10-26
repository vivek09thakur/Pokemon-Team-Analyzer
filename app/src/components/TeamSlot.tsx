"use client";

import { memo, useEffect, useRef, useState } from "react";
import { MOVE_SLOTS } from "@/lib/constants";
import { formatName, padId, slotSpriteScale, typeColor } from "@/lib/calculation";
import { fetchMoveType, knownMoveType } from "@/lib/pokeapi";
import { itemSprite } from "@/lib/showdown";
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
  onMove: (from: number, to: number) => void;
  onSuggest: (index: number) => void;
  onOpenItem: (index: number) => void;
}

const DND_TYPE = "application/x-team-slot";

// Native HTML5 DnD: no library, no per-frame JS; the browser renders the drag image and we only
// toggle a class on the hovered slot. Drop swaps the two slots (or moves into an empty one).
function useSlotDnd(index: number, onMove: (from: number, to: number) => void, draggable: boolean) {
  const [over, setOver] = useState(false);
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0); // dragenter/leave fire for every child; count them

  return {
    over,
    dragging,
    props: {
      draggable,
      onDragStart: (e: React.DragEvent) => {
        if (!draggable) return;
        // Dragging from a control would swallow its click/select; only the card body drags
        if ((e.target as HTMLElement).closest("select, button")) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData(DND_TYPE, String(index));
        e.dataTransfer.effectAllowed = "move";
        setDragging(true);
      },
      onDragEnd: () => setDragging(false),
      onDragEnter: (e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes(DND_TYPE)) return;
        if (depth.current++ === 0) setOver(true);
      },
      onDragLeave: () => {
        if (--depth.current <= 0) {
          depth.current = 0;
          setOver(false);
        }
      },
      onDragOver: (e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes(DND_TYPE)) return;
        e.preventDefault(); // required to allow drop
        e.dataTransfer.dropEffect = "move";
      },
      onDrop: (e: React.DragEvent) => {
        depth.current = 0;
        setOver(false);
        const from = parseInt(e.dataTransfer.getData(DND_TYPE));
        if (Number.isNaN(from)) return;
        e.preventDefault();
        if (from !== index) onMove(from, index);
      },
    },
  };
}

// Memoised: a team change only re-renders the slots whose member object actually changed
const TeamSlot = memo(function TeamSlot({
  index,
  member,
  onOpenAdd,
  onRemove,
  onAbilityChange,
  onOpenMove,
  onMove,
  onSuggest,
  onOpenItem,
}: Props) {
  const dnd = useSlotDnd(index, onMove, !!member);
  const dndClass = `${dnd.over ? " is-drop-target" : ""}${dnd.dragging ? " is-dragging" : ""}`;

  if (!member) {
    return (
      <div
        className={`team-slot team-slot-empty${dndClass}`}
        onClick={() => onOpenAdd(index)}
        {...dnd.props}
      >
        <Icon name="add_circle" size={24} className="text-primary" />
        <div className="title-sm">Add Pokémon</div>
        <div className="label-sm">Slot {index + 1}</div>
      </div>
    );
  }

  const flying = member.types.includes("flying");
  return (
    <div className={`team-slot team-slot-filled${dndClass}`} {...dnd.props} title="Drag to reorder">
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
          <div className="flex items-center gap-1.5">
            <span className="label-sm">#{padId(member.id)}</span>
            <button
              type="button"
              className={`slot-item${member.item ? "" : " is-empty"}`}
              title={member.item ? formatName(member.item) : "Held item"}
              aria-label="Held item"
              onClick={() => onOpenItem(index)}
            >
              {member.item ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={itemSprite(member.item)} alt="" width={20} height={20} className="item-sprite" />
              ) : (
                <Icon name="backpack" size={14} />
              )}
              <span className="truncate">{member.item ? formatName(member.item) : "Item"}</span>
            </button>
          </div>
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
          <button
            className="suggest-btn"
            aria-label="Suggest a set"
            title="Suggest moves, ability & item"
            onClick={() => onSuggest(index)}
          >
            <Icon name="auto_awesome" size={14} />
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
});

export default TeamSlot;

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
