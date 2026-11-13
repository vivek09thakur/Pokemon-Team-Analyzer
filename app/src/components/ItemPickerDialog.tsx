"use client";

import { useEffect, useMemo, useState } from "react";
import Dialog from "@/common/components/Dialog";
import { Icon } from "@/common/components/Icon";
import { SearchField } from "@/common/components/SearchField";
import { Spinner } from "@/common/components/Spinner";
import { itemSprite, loadHeldItems, type HeldItem } from "@/lib/showdown";
import type { Member } from "@/lib/types";

interface Props {
  member: Member | null;
  onClose: () => void;
  onPick: (slug: string) => void;
}

export default function ItemPickerDialog({ member, onClose, onPick }: Props) {
  const [filter, setFilter] = useState("");
  const [items, setItems] = useState<HeldItem[] | null>(null);

  useEffect(() => {
    if (!member) return;
    let live = true;
    loadHeldItems().then((list) => live && setItems(list));
    return () => {
      live = false;
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
      toolbar={<SearchField value={filter} onChange={setFilter} placeholder="Search items" />}
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
          <Spinner className="mx-auto" />
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
