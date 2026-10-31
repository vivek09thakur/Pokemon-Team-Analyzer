"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ImportResult } from "@/lib/paste";
import Dialog from "./Dialog";
import { Icon } from "./ui";

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (text: string) => Promise<ImportResult | null>;
}

const PLACEHOLDER = `Typhlosion @ Charcoal
Ability: Flash Fire
- Flamethrower
- Eruption
- Solar Beam
- Thunder Punch

Dragonite
Ability: Multiscale
- Dragon Dance
- Dragon Claw
- Hurricane
- Ice Beam`;

type Phase = { kind: "edit" } | { kind: "working" } | { kind: "done"; result: ImportResult };

export default function ImportTeamDialog({ open, onClose, onImport }: Props) {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "edit" });
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => window.clearTimeout(t);
  }, [open]);

  const working = phase.kind === "working";

  const submit = useCallback(async () => {
    if (!text.trim() || working) return;
    setPhase({ kind: "working" });
    try {
      const result = await onImport(text);
      if (!result) return setPhase({ kind: "edit" });
      if (result.issues.length === 0) return onClose();
      setPhase({ kind: "done", result });
    } catch (e) {
      console.error(e);
      setPhase({ kind: "done", result: { members: [], issues: ["Import failed. Please try again."] } });
    }
  }, [text, working, onImport, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Import team"
      subtitle="Paste a Pokémon Showdown team"
      maxWidth="max-w-lg"
      bodyClassName="px-6 pb-4 overflow-y-auto"
      footer={
        <div className="px-6 py-3 flex items-center justify-end gap-2 border-t border-outline-variant">
          {phase.kind === "done" ? (
            <button className="md-btn md-btn-filled" onClick={onClose}>
              Done
            </button>
          ) : (
            <>
              <button className="md-btn md-btn-text" onClick={onClose}>
                Cancel
              </button>
              <button className="md-btn md-btn-filled" onClick={submit} disabled={working || !text.trim()}>
                <Icon name="download" />
                <span>{working ? "Importing…" : "Import"}</span>
              </button>
            </>
          )}
        </div>
      }
    >
      {phase.kind === "done" ? (
        <>
          <p className="body-md mb-3">
            {phase.result.members.length
              ? `Imported ${phase.result.members.length} Pokémon, with a few notes:`
              : "Nothing was imported:"}
          </p>
          <ul className="flex flex-col gap-2">
            {phase.result.issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2 body-sm">
                <Icon name="warning" size={18} className="text-warning shrink-0" />
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <textarea
            ref={inputRef}
            className="md-field !h-auto !py-3 font-mono text-sm leading-5 resize-y"
            rows={12}
            placeholder={PLACEHOLDER}
            spellCheck={false}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={working}
          />
          <p className="body-sm mt-2">
            One block per Pokémon: species @ item, an Ability line, then “- Move” lines. Importing
            replaces the current team.
          </p>
        </>
      )}
    </Dialog>
  );
}
