"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { itemSprite, loadHeldItems, type HeldItem } from "@/lib/showdown";
import type { Member } from "@/lib/types";
import Dialog from "./Dialog";
import { Icon } from "./ui";

interface Props {
  member: Member | null;
  onClose: () => void;
  onPick: (slug: string) => void;
}

// Mounted fresh per target (parent keys it)
export default function ItemPickerDialog({ member, onClose, onPick }: Props) {
  const [filter, setFilter] = useState("");
  const [items, setItems] = useState<HeldItem[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!member) return;
    let live = true;
    loadHeldItems().then((list) => live && setItems(list));
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [member]);

  const q = filter.trim().toLowerCase();
  const matches = useMemo(
    () => (items || []).filter((i) => !q || i.name.toLowerCase().includes(q)),
    [items, q]
  );
  const current = member?.item || "";

  return (
    <Dialog
      open={!!member}
      onClose={onClose}
      title="Held item"
      subtitle={member?.name}
      maxWidth="max-w-md"
      bodyClassName="overflow-y-auto px-3 pb-2"
      toolbar={
        <div className="px-6 pb-3 relative">
          <Icon
            name="search"
            size={20}
            className="absolute left-9 top-1/2 -translate-y-1/2 -mt-1.5 pointer-events-none"
          />
          <input
            ref={inputRef}
            type="text"
            className="md-field md-field-sm !pl-10"
            placeholder="Search items"
            autoComplete="off"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      }
      footer={
        <div className="px-4 py-3 flex justify-end border-t border-outline-variant">
          <button className="md-btn md-btn-text" onClick={() => onPick("")}>
            <Icon name="backspace" />
            <span>No item</span>
          </button>
        </div>
      }
    >
      {!items ? (
        <div className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        </div>
      ) : matches.length === 0 ? (
        <p className="body-md text-center py-6">No items match &quot;{filter}&quot;</p>
      ) : (
        <ul>
          {matches.map((i) => {
            const isCurrent = i.slug === current;
            return (
              <li key={i.slug}>
                <button
                  type="button"
                  className={`move-option${isCurrent ? " is-current" : ""}`}
                  onClick={() => onPick(i.slug)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={itemSprite(i.slug)} alt="" width={24} height={24} className="item-sprite shrink-0" loading="lazy" />
                  <span className="move-option-name">{i.name}</span>
                  {isCurrent ? <Icon name="check" size={18} className="text-primary" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Dialog>
  );
}
