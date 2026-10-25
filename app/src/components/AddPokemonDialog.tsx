"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SEARCH_LIMIT } from "@/lib/constants";
import { padId } from "@/lib/calculation";
import { fetchPokemon, fetchPokemonSummary, hasPokemonList, loadPokemonList } from "@/lib/pokeapi";
import type { Pokemon, PokemonSummary } from "@/lib/types";
import Dialog from "./Dialog";
import Sprite from "./Sprite";
import { Icon, TypeChip } from "./ui";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (pokemon: Pokemon) => void;
}

type Progress = null | { done: number; total: number; label?: string };
type Phase = "idle" | "searching" | "loading" | "results" | "empty" | "error";
interface SearchState {
  phase: Phase;
  results: PokemonSummary[];
  progress: Progress;
}

// Mounted fresh per open (parent keys it by slot), so initial state is the reset state
export default function AddPokemonDialog({ open, onClose, onAdd }: Props) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({
    phase: "idle",
    results: [],
    progress: null,
  });
  const [selected, setSelected] = useState<PokemonSummary | null>(null);
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const runId = useRef(0);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => window.clearTimeout(t);
  }, [open]);

  const term = query.trim().toLowerCase();
  const active = term.length >= 2;

  // Debounced search; a bumped runId makes superseded runs no-ops
  useEffect(() => {
    if (!open || !active) return;
    const run = runId;
    const id = ++run.current;
    const live = () => run.current === id;
    const patch = (p: Partial<SearchState>) => {
      if (live()) setSearch((s) => ({ ...s, ...p }));
    };
    const timer = window.setTimeout(async () => {
      try {
        patch({
          phase: "searching",
          progress: hasPokemonList() ? null : { done: 0, total: 0, label: "Loading Pokémon list…" },
        });
        const list = await loadPokemonList();
        if (!live()) return;

        const filtered = list.filter((p) => p?.name?.toLowerCase().includes(term)).slice(0, SEARCH_LIMIT);
        if (filtered.length === 0) {
          patch({ phase: "empty", progress: null, results: [] });
          return;
        }

        let done = 0;
        patch({ phase: "loading", progress: { done, total: filtered.length } });
        const found = (
          await Promise.all(
            filtered.map(async (entry) => {
              const data = await fetchPokemonSummary(entry.name);
              patch({ progress: { done: ++done, total: filtered.length } });
              return data;
            })
          )
        ).filter((p): p is PokemonSummary => !!p);
        patch({ phase: found.length ? "results" : "empty", progress: null, results: found });
      } catch (error) {
        if (!live()) return;
        console.error("Search error:", error);
        patch({ phase: "error", progress: null });
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      if (run.current === id) run.current++; // cancel in-flight updates for this run
    };
  }, [term, active, open]);

  const phase: Phase = active ? search.phase : "idle";
  const results = active ? search.results : [];
  const progress = active ? search.progress : null;

  const select = useCallback((p: PokemonSummary) => {
    setSelected(p);
    fetchPokemon(p.slug); // warm the full record so Add is instant
    window.setTimeout(
      () => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
      0
    );
  }, []);

  const add = useCallback(async () => {
    if (!selected || adding) return;
    setAdding(true);
    const full = await fetchPokemon(selected.slug);
    setAdding(false);
    if (full) onAdd(full);
  }, [selected, adding, onAdd]);

  const handleClose = useCallback(() => {
    runId.current++;
    onClose();
  }, [onClose]);

  const indeterminate = !!progress && progress.total === 0;
  const pct = progress && progress.total ? (progress.done / progress.total) * 100 : 0;
  const status = progress
    ? progress.label || (progress.total ? `Loading ${progress.done}/${progress.total} Pokémon…` : "")
    : "";

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={<span className="headline-sm">Add Pokémon</span>}
      maxWidth="max-w-4xl"
      bodyClassName="px-6 pb-6 overflow-y-auto"
    >
      <div className="relative mb-4">
        <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          className="md-field !pl-12"
          placeholder="Search Pokémon by name"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {/* Determinate while results load; indeterminate while the species list itself loads */}
        <div
          className={`search-progress${progress ? " is-active" : ""}${indeterminate ? " is-indeterminate" : ""}`}
          role="progressbar"
          aria-hidden={!progress}
          aria-valuenow={progress && progress.total ? Math.round(pct) : undefined}
        >
          <div style={{ width: `${pct}%` }} />
        </div>
      </div>
      {status ? <p className="body-sm mb-3 -mt-2">{status}</p> : null}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {phase === "searching" && (
          <div className="col-span-full py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
            <div>Searching...</div>
          </div>
        )}
        {phase === "loading" &&
          Array.from({ length: SEARCH_LIMIT }, (_, i) => (
            <div key={i} className="animate-pulse md-card-filled p-3">
              <div className="bg-surface-highest rounded-full w-16 h-16 mx-auto mb-3" />
              <div className="bg-surface-highest h-3 rounded mb-2" />
              <div className="bg-surface-highest h-3 rounded w-3/4 mx-auto" />
            </div>
          ))}
        {phase === "empty" && (
          <div className="col-span-full py-8 text-center body-md">No Pokémon found</div>
        )}
        {phase === "error" && (
          <div className="col-span-full py-8 text-center body-md">Error searching. Please try again.</div>
        )}
        {phase === "results" &&
          results.map((p) => (
            <button
              key={p.id}
              type="button"
              className="search-result md-card-filled md-chip-action p-3 flex flex-col items-center gap-1 text-center w-full"
              onClick={() => select(p)}
            >
              <Sprite pokemon={p} className="h-16 w-16" thumb />
              <div className="title-sm truncate max-w-full">{p.name}</div>
              <div className="label-sm">#{padId(p.id)}</div>
              <div className="flex flex-wrap justify-center gap-1">
                {p.types.map((t) => (
                  <TypeChip key={t} type={t} small />
                ))}
              </div>
            </button>
          ))}
      </div>

      {selected && (
        <div ref={previewRef} className="mt-5">
          <div className="md-card-filled p-4 flex flex-wrap items-center gap-4">
            <Sprite pokemon={selected} className="h-24 w-24" thumb />
            <div className="flex-1 min-w-[160px]">
              <h5 className="title-lg">
                {selected.name} #{padId(selected.id)}
              </h5>
              <div className="flex gap-2 mt-2">
                {selected.types.map((t) => (
                  <TypeChip key={t} type={t} />
                ))}
              </div>
            </div>
            <button className="md-btn md-btn-filled" onClick={add} disabled={adding}>
              <Icon name="add" />
              <span>{adding ? "Adding…" : "Add to team"}</span>
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
