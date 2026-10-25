"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { runAnalysis } from "@/lib/analysis";
import { MOVE_SLOTS } from "@/lib/constants";
import { loadPokemonList } from "@/lib/pokeapi";
import type { Member, Pokemon, Team } from "@/lib/types";
import AddPokemonDialog from "./AddPokemonDialog";
import AnalysisPanel from "./AnalysisPanel";
import Lineup from "./Lineup";
import MovePickerDialog from "./MovePickerDialog";
import RecommendationsDialog from "./RecommendationsDialog";
import { Brand, Controls, Drawer, ThemeToggle } from "./Shell";
import TeamSlot from "./TeamSlot";
import { Icon } from "./ui";

export default function TeamAnalyzer() {
  const [team, setTeam] = useState<Team>(() => new Map());
  const [teamSize, setTeamSize] = useState(6);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addSlot, setAddSlot] = useState<number | null>(null);
  const [moveTarget, setMoveTarget] = useState<{ slot: number; moveIndex: number } | null>(null);
  const [recsOpen, setRecsOpen] = useState(false);

  // Warm the species list in the background so the first search is fast
  useEffect(() => {
    loadPokemonList().catch(() => {});
  }, []);

  // Analysis is cheap (18 types × ≤6 members), so it re-runs on every team change
  const analysis = useMemo(
    () =>
      team.size
        ? {
            result: runAnalysis(team, teamSize),
            updatedAt: `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
          }
        : { result: null, updatedAt: "" },
    [team, teamSize]
  );
  const { result, updatedAt } = analysis;

  const typeCount = useMemo(() => {
    const s = new Set<string>();
    team.forEach((p) => p.types.forEach((t) => s.add(t)));
    return s.size;
  }, [team]);

  const updateTeam = useCallback((fn: (draft: Team) => void) => {
    setTeam((prev) => {
      const next = new Map(prev);
      fn(next);
      return next;
    });
  }, []);

  const addPokemon = useCallback(
    (pokemon: Pokemon) => {
      if (addSlot === null) return;
      // Per-slot copy so ability/move picks don't leak into the shared cache entry
      const member: Member = {
        ...pokemon,
        ability: pokemon.abilities[0]?.name || "",
        selectedMoves: Array(MOVE_SLOTS).fill(""),
      };
      updateTeam((t) => t.set(addSlot, member));
      setAddSlot(null);
    },
    [addSlot, updateTeam]
  );

  const removePokemon = useCallback(
    (index: number) => {
      if (!confirm("Remove this Pokémon from your team?")) return;
      updateTeam((t) => t.delete(index));
    },
    [updateTeam]
  );

  const changeTeamSize = useCallback(
    (size: number) => {
      const overflow = [...team.keys()].filter((i) => i >= size);
      if (overflow.length > 0) {
        if (!confirm(`Changing team size will remove ${overflow.length} Pokémon. Continue?`)) return;
        updateTeam((t) => overflow.forEach((i) => t.delete(i)));
      }
      setTeamSize(size);
    },
    [team, updateTeam]
  );

  const resetTeam = useCallback(() => {
    if (team.size === 0) return;
    if (!confirm("Reset the entire team? This will remove all Pokémon.")) return;
    setTeam(new Map());
  }, [team.size]);

  const setAbility = useCallback(
    (index: number, ability: string) =>
      updateTeam((t) => {
        const m = t.get(index);
        if (m) t.set(index, { ...m, ability });
      }),
    [updateTeam]
  );

  // Drag-and-drop: swap two slots (moving into an empty slot just relocates)
  const moveMember = useCallback(
    (from: number, to: number) =>
      updateTeam((t) => {
        const a = t.get(from);
        const b = t.get(to);
        if (!a) return;
        t.set(to, a);
        if (b) t.set(from, b);
        else t.delete(from);
      }),
    [updateTeam]
  );

  const pickMove = useCallback(
    (slug: string) => {
      if (!moveTarget) return;
      updateTeam((t) => {
        const m = t.get(moveTarget.slot);
        if (!m) return;
        const selectedMoves = [...m.selectedMoves];
        selectedMoves[moveTarget.moveIndex] = slug;
        t.set(moveTarget.slot, { ...m, selectedMoves });
      });
      setMoveTarget(null);
    },
    [moveTarget, updateTeam]
  );

  const moveDialogTarget = useMemo(() => {
    if (!moveTarget) return null;
    const member = team.get(moveTarget.slot);
    return member ? { member, moveIndex: moveTarget.moveIndex } : null;
  }, [moveTarget, team]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const closeAdd = useCallback(() => setAddSlot(null), []);
  const closeMove = useCallback(() => setMoveTarget(null), []);
  const closeRecs = useCallback(() => setRecsOpen(false), []);
  const openMove = useCallback((slot: number, moveIndex: number) => setMoveTarget({ slot, moveIndex }), []);

  const controlsProps = {
    teamSize,
    onTeamSize: changeTeamSize,
    memberCount: team.size,
    typeCount,
    recommendationCount: result ? result.recommendations.length : null,
    onOpenRecommendations: () => setRecsOpen(true),
    onReset: resetTeam,
  };

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <Drawer open={drawerOpen} onClose={closeDrawer}>
        <Controls {...controlsProps} variant="drawer" />
      </Drawer>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar (mobile only) */}
        <header className="md-top-bar lg:hidden px-2 flex items-center gap-1 border-b border-outline-variant">
          <button className="md-icon-btn" aria-label="Open menu" onClick={() => setDrawerOpen(true)}>
            <Icon name="menu" />
          </button>
          <h2 className="title-md px-1">Team Analyzer</h2>
        </header>

        <main className="flex-1 overflow-auto p-3 lg:p-0">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)] gap-4 lg:gap-0 items-start lg:items-stretch lg:min-h-full">
            {/* Left column: nav + team + controls; fills the viewport height on lg+ */}
            <div className="flex flex-col gap-3 lg:gap-0 w-full max-w-[720px] mx-auto lg:max-w-none lg:mx-0 lg:self-start lg:sticky lg:top-0 lg:h-dvh">
              <div className="hidden lg:flex items-center gap-3 px-4 h-14 shrink-0 border-b border-outline-variant">
                <Brand compact />
                <span className="ml-auto flex">
                  <ThemeToggle />
                </span>
              </div>

              <section className="lg:flex-1 lg:min-h-0 lg:p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 lg:h-full lg:auto-rows-fr">
                  {Array.from({ length: teamSize }, (_, i) => (
                    <TeamSlot
                      key={i}
                      index={i}
                      member={team.get(i)}
                      onOpenAdd={setAddSlot}
                      onRemove={removePokemon}
                      onAbilityChange={setAbility}
                      onOpenMove={openMove}
                      onMove={moveMember}
                    />
                  ))}
                </div>
              </section>

              <div className="hidden lg:flex items-center px-4 pb-4 shrink-0">
                <Controls {...controlsProps} variant="dock" />
              </div>
            </div>

            {/* Right column: team display pinned, analysis scrolls beneath it */}
            <div className="md-card min-w-0 flex flex-col lg:rounded-none lg:border-0 lg:border-l lg:border-outline-variant lg:h-dvh lg:sticky lg:top-0 lg:overflow-hidden">
              <Lineup team={team} teamSize={teamSize} coverage={result?.coverage ?? null} />
              <div className="flex flex-col gap-4 p-3 sm:p-4 lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain">
                <AnalysisPanel result={result} updatedAt={updatedAt} />
              </div>
            </div>
          </div>
        </main>
      </div>

      <AddPokemonDialog
        key={addSlot === null ? "add-closed" : `add-${addSlot}`}
        open={addSlot !== null}
        onClose={closeAdd}
        onAdd={addPokemon}
      />
      <MovePickerDialog
        key={moveTarget ? `move-${moveTarget.slot}:${moveTarget.moveIndex}` : "move-closed"}
        target={moveDialogTarget}
        onClose={closeMove}
        onPick={pickMove}
      />
      <RecommendationsDialog
        open={recsOpen}
        onClose={closeRecs}
        recommendations={result?.recommendations ?? []}
      />
    </div>
  );
}
