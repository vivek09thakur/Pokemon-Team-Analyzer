// All DOM output lives here. Functions receive data + callbacks; they never own app state.
import { TYPES, MOVE_SLOTS, SEARCH_LIMIT } from "./constants.js";
import { lineupHeight, padId, slotSpriteScale, spriteSources, typeColor, typeName } from "./calculation.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/"/g, "&quot;");

// ---------- Shared fragments ----------

export function typeChip(type, extraClass = "") {
  return `<span class="type-chip ${extraClass}" style="background:${typeColor(type)}">${typeName(
    type
  )}</span>`;
}

export function spriteImg(pokemon, className = "", style = "") {
  const [primary, ...fallbacks] = spriteSources(pokemon);
  return `<img src="${primary}" alt="${pokemon.name}" class="sprite-3d ${className}"${
    style ? ` style="${style}"` : ""
  } data-fallbacks="${fallbacks.join("|")}">`;
}

// ---------- Team slots ----------

export function renderEmptySlot(slot) {
  slot.className = "team-slot team-slot-empty";
  slot.innerHTML = `
    <span class="material-symbols-rounded text-primary" style="font-size:24px">add_circle</span>
    <div class="title-sm">Add Pokémon</div>
    <div class="label-sm">Slot ${parseInt(slot.dataset.index) + 1}</div>
  `;
}

export function renderFilledSlot(slot, pokemon, { onRemove, onAbilityChange, onMoveClick, getMoveType }) {
  slot.className = "team-slot team-slot-filled";

  const abilityOptions = (pokemon.abilities || [])
    .map(
      (a) =>
        `<option value="${esc(a.name)}"${a.name === pokemon.ability ? " selected" : ""}>${a.name}${
          a.hidden ? " (H)" : ""
        }</option>`
    )
    .join("");
  const moveBtn = (i) =>
    `<button type="button" class="slot-move" data-move="${i}" aria-label="Move ${i + 1}"></button>`;

  slot.innerHTML = `
    <div class="slot-top">
      <div class="slot-head">
        <select class="slot-select slot-ability" aria-label="Ability" title="Ability">${
          abilityOptions || `<option value="">No ability</option>`
        }</select>
        <div class="slot-name" title="${pokemon.name}">${pokemon.name}</div>
        <span class="label-sm">#${padId(pokemon.id)}</span>
      </div>
      <div class="slot-meta">
        <button class="remove-btn" aria-label="Remove ${pokemon.name}" title="Remove">
          <span class="material-symbols-rounded" style="font-size:14px">close</span>
        </button>
        ${[...pokemon.types].reverse().map((t) => typeChip(t, "type-chip-sm")).join("")}
      </div>
    </div>
    <div class="slot-sprite-box">${spriteImg(pokemon, "", `height:${slotSpriteScale(pokemon)}%`)}</div>
    <div class="slot-moves">${Array.from({ length: MOVE_SLOTS }, (_, i) => moveBtn(i)).join("")}</div>
  `;

  slot.querySelector(".remove-btn").addEventListener("click", onRemove);
  slot
    .querySelector(".slot-ability")
    .addEventListener("change", (e) => onAbilityChange(e.target.value));
  slot.querySelectorAll(".slot-move").forEach((btn) => {
    paintMoveButton(btn, pokemon, getMoveType);
    btn.addEventListener("click", () => onMoveClick(parseInt(btn.dataset.move)));
  });
}

export async function paintMoveButton(btn, pokemon, getMoveType) {
  const i = parseInt(btn.dataset.move);
  const slug = pokemon.selectedMoves?.[i] || "";
  const move = pokemon.moves?.find((m) => m.slug === slug);
  btn.dataset.slug = slug;
  btn.style.backgroundColor = "";
  btn.classList.remove("slot-move-typed");
  btn.classList.toggle("slot-move-empty", !move);
  btn.textContent = move ? move.name : `Move ${i + 1}`;
  if (!move) return;

  const type = await getMoveType(slug);
  // User may have changed the pick while the request was in flight
  if (btn.dataset.slug !== slug || !type) return;
  btn.classList.add("slot-move-typed");
  btn.style.backgroundColor = typeColor(type);
}

// ---------- Move picker ----------

export function renderMoveList(pokemon, moveIndex, filter, { knownType, getMoveType, onPick }) {
  const list = $("moveList");
  const q = filter.trim().toLowerCase();
  const current = pokemon.selectedMoves?.[moveIndex] || "";
  const taken = new Set((pokemon.selectedMoves || []).filter((s) => s && s !== current));
  const matches = (pokemon.moves || []).filter((m) => !q || m.name.toLowerCase().includes(q));

  if (matches.length === 0) {
    list.innerHTML = `<li class="body-md text-center py-6">No moves match "${filter}"</li>`;
    return;
  }

  list.innerHTML = matches
    .map((m) => {
      const type = knownType(m.slug);
      const isCurrent = m.slug === current;
      const isTaken = taken.has(m.slug);
      return `<li>
        <button type="button" class="move-option${isCurrent ? " is-current" : ""}" data-slug="${m.slug}"${
          isTaken ? " disabled" : ""
        }>
          <span class="move-option-name">${m.name}</span>
          <span class="move-option-type" data-type-for="${m.slug}">${
            type ? typeChip(type, "type-chip-sm") : ""
          }</span>
          ${isCurrent ? `<span class="material-symbols-rounded text-primary" style="font-size:18px">check</span>` : ""}
          ${isTaken ? `<span class="label-sm">In use</span>` : ""}
        </button>
      </li>`;
    })
    .join("");

  list.querySelectorAll(".move-option").forEach((btn) =>
    btn.addEventListener("click", () => onPick(btn.dataset.slug))
  );

  // Resolve type chips lazily for the first screenful so the list opens instantly
  matches.slice(0, 30).forEach(async (m) => {
    if (knownType(m.slug)) return;
    const type = await getMoveType(m.slug);
    const holder = list.querySelector(`[data-type-for="${m.slug}"]`);
    if (type && holder) holder.innerHTML = typeChip(type, "type-chip-sm");
  });
}

// ---------- Add-Pokémon dialog ----------

export function renderSearchMessage(text) {
  $("searchResults").innerHTML = `<div class="col-span-full py-8 text-center body-md">${text}</div>`;
}

export function renderSearching() {
  $("searchResults").innerHTML = `
    <div class="col-span-full py-8 text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
      <div>Searching...</div>
    </div>`;
}

export function renderSearchSkeleton() {
  $("searchResults").innerHTML = Array(SEARCH_LIMIT)
    .fill()
    .map(
      () => `
        <div class="animate-pulse md-card-filled p-3">
          <div class="bg-surface-highest rounded-full w-16 h-16 mx-auto mb-3"></div>
          <div class="bg-surface-highest h-3 rounded mb-2"></div>
          <div class="bg-surface-highest h-3 rounded w-3/4 mx-auto"></div>
        </div>`
    )
    .join("");
}

export function renderSearchResults(results, onSelect) {
  const container = $("searchResults");
  container.innerHTML = results
    .map(
      (pokemon) => `
        <button type="button" class="search-result md-card-filled md-chip-action p-3 flex flex-col items-center gap-1 text-center w-full">
          ${spriteImg(pokemon, "h-16 w-16")}
          <div class="title-sm truncate max-w-full">${pokemon.name}</div>
          <div class="label-sm">#${padId(pokemon.id)}</div>
          <div class="flex flex-wrap justify-center gap-1">
            ${pokemon.types.map((t) => typeChip(t, "type-chip-sm")).join("")}
          </div>
        </button>`
    )
    .join("");
  container.querySelectorAll(".search-result").forEach((item, index) => {
    item.addEventListener("click", () => onSelect(results[index]));
  });
}

export function renderSelectedPreview(pokemon) {
  const preview = $("selectedPreview");
  const sprite = $("selectedSprite");
  const [primary, ...fallbacks] = spriteSources(pokemon);
  sprite.dataset.fallbacks = fallbacks.join("|");
  sprite.src = primary;
  sprite.alt = pokemon.name;
  $("selectedName").textContent = `${pokemon.name} #${padId(pokemon.id)}`;
  $("selectedTypes").innerHTML = pokemon.types.map((t) => typeChip(t)).join("");
  preview.classList.remove("hidden");
  preview.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ---------- Analysis panel ----------

export function updateQuickStats(teamMap, teamSize) {
  const typeCount = new Set();
  teamMap.forEach((p) => p.types.forEach((t) => typeCount.add(t)));
  $("teamCount").textContent = teamMap.size;
  $("teamSizeLabel").textContent = teamSize;
  $("typeCount").textContent = typeCount.size;
}

export function hideResults() {
  $("resultsSection").classList.add("hidden");
  $("recommendationsCard").classList.add("hidden");
  $("emptyState").classList.remove("hidden");
  $("analysisMeta").textContent = "";
}

export function showResults() {
  $("resultsSection").classList.remove("hidden");
  $("recommendationsCard").classList.remove("hidden");
  $("emptyState").classList.add("hidden");
}

// Team display with nothing in it: one empty stand per slot
export function renderEmptyLineup(teamSize) {
  $("lineup").innerHTML = Array.from(
    { length: teamSize },
    (_, i) => `<figure class="lineup-empty" aria-hidden="true"><span>${i + 1}</span></figure>`
  ).join("");
  $("coverageSummary").textContent = "Your team will line up here.";
}

export function displayResults(r, teamMap, teamSize) {
  renderScore(r);
  renderLineup(teamMap, teamSize, r.coverage);
  renderRecommendations(r.recommendations);
  renderThreatList(r.defense);
  renderMemberCards(r.members);
  renderThreats(r.defense);
  $("analysisMeta").textContent = `Updated ${new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function renderScore(r) {
  const set = (id, text) => ($(id).textContent = text);
  set("overallScore", r.overall);
  set("coverageScore", `${r.coverage.score}%`);
  set("defenseScore", `${r.defense.score}%`);
  set("diversityScore", `${r.diversity.score}%`);

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
  set("overallGrade", grade);
  set(
    "overallSummary",
    `${r.coverage.superEffective.length}/${TYPES.length} types hit super-effectively · ${
      r.defense.critical.length
    } critical threat${r.defense.critical.length === 1 ? "" : "s"} · ${
      r.defense.resisted.length
    } well-resisted`
  );

  const ring = $("overallRing");
  const circumference = 2 * Math.PI * 42;
  ring.setAttribute("stroke-dasharray", `0 ${circumference}`);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      ring.setAttribute(
        "stroke-dasharray",
        `${(r.overall / 100) * circumference} ${circumference}`
      );
      $("coverageFill").style.width = `${r.coverage.score}%`;
      $("defenseFill").style.width = `${r.defense.score}%`;
      $("diversityFill").style.width = `${r.diversity.score}%`;
    })
  );
}

function renderRecommendations(recs) {
  const tone = {
    error: "text-error",
    warning: "text-warning",
    success: "text-success",
    neutral: "text-primary",
  };
  $("recommendationsCount").textContent = recs.length;
  $("recommendations").innerHTML = recs
    .map(
      (rec) => `
      <li class="flex items-start gap-3 py-3">
        <span class="material-symbols-rounded ${tone[rec.tone]}" style="margin-top:2px">${rec.icon}</span>
        <div class="min-w-0">
          <div class="title-sm">${rec.title}</div>
          <div class="body-md">${rec.body}</div>
        </div>
      </li>`
    )
    .join("");
}

// One row per attacking type that hits someone: who it hits, and who can switch in
function renderThreatList(defense) {
  const threats = Object.values(defense.byType)
    .filter((e) => e.weakBy.length > 0)
    .sort((a, b) => b.net - a.net || b.weakBy.length - a.weakBy.length);

  const badge = {
    critical: "bg-error text-on-error",
    major: "bg-warning-container text-on-warning-container",
    balanced: "bg-surface-highest text-on-surface-variant",
    resisted: "bg-success-container text-on-success-container",
  };
  const badgeText = { critical: "Critical", major: "Major", balanced: "Covered", resisted: "Covered" };

  const nameList = (list, quad = []) =>
    list.map((p) => (quad.includes(p) ? `<b>${p.name} (4×)</b>` : p.name)).join(", ");

  $("threatList").innerHTML = threats.length
    ? threats
        .map((e) => {
          const safe = [...e.immuneBy, ...e.resistBy];
          return `
          <li class="md-list-item !px-0 !py-2.5 items-center flex-wrap">
            ${typeChip(e.type, "w-20 justify-center shrink-0")}
            <div class="flex-1 min-w-0 body-sm leading-5">
              <div><span class="label-md text-error mr-1">Hits ${e.weakBy.length}</span>${nameList(
                e.weakBy,
                e.quadWeakBy
              )}</div>
              <div>${
                safe.length
                  ? `<span class="label-md text-success mr-1">Switch in</span>${nameList(safe)}`
                  : `<span class="label-md text-error">No safe switch-in</span>`
              }</div>
            </div>
            <span class="label-sm px-2 py-0.5 rounded-full shrink-0 ${badge[e.severity]}">${
              badgeText[e.severity]
            }</span>
          </li>`;
        })
        .join("")
    : `<li class="md-list-item !px-0 body-md">No attacking type hits any member super-effectively.</li>`;
}

function renderMemberCards(members) {
  const chips = (list, mark = {}) =>
    list.length
      ? list
          .map(
            (t) =>
              `<span class="type-chip type-chip-sm" style="background:${typeColor(t)}">${typeName(t)}${
                mark[t] ? `<b class="opacity-90">${mark[t]}</b>` : ""
              }</span>`
          )
          .join("")
      : `<span class="label-sm">—</span>`;

  $("memberGrid").innerHTML = members
    .map((m) => {
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
      return `
      <div class="md-card-filled p-3 flex gap-3">
        <div class="w-16 h-16 shrink-0 flex items-center justify-center">
          ${spriteImg(m.pokemon, "max-w-full max-h-full")}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <span class="title-sm truncate">${m.pokemon.name}</span>
            <span class="label-sm px-2 py-0.5 rounded-full ${tone}" title="Defensive score">${m.score}</span>
          </div>
          <div class="flex flex-wrap gap-1 mt-1">${chips(m.pokemon.types)}</div>
          <div class="label-sm mt-2 mb-1">Weak to</div>
          <div class="flex flex-wrap gap-1">${chips(
            [...m.groups.quadWeak, ...m.groups.weak],
            weakMarks
          )}</div>
          <div class="label-sm mt-2 mb-1">Resists</div>
          <div class="flex flex-wrap gap-1">${chips(
            [...m.groups.immune, ...m.groups.quadResist, ...m.groups.resist],
            resistMarks
          )}</div>
        </div>
      </div>`;
    })
    .join("");
}

function renderLineup(teamMap, teamSize, c) {
  const figures = [];
  for (let i = 0; i < teamSize; i++) {
    const p = teamMap.get(i);
    if (!p) continue;
    figures.push(
      `<figure title="${p.name} · ${(p.height / 10).toFixed(1)} m · ${p.types
        .map((t) => typeName(t))
        .join(" / ")}">
        ${spriteImg(p, "", `height:${lineupHeight(p)}px`)}
        <figcaption>${p.name}</figcaption>
      </figure>`
    );
  }
  $("lineup").innerHTML = figures.join("");

  const sugg = c.suggestions.map((s) => `${typeName(s.type)} (+${s.covers.length})`).join(", ");
  $("coverageSummary").textContent =
    `STAB hits ${c.superEffective.length} of ${TYPES.length} types super-effectively.` +
    (sugg ? ` Best additions: ${sugg}.` : "");
}

function renderThreats(d) {
  const chips = (entries, tone) =>
    entries
      .map((e) => {
        const detail = [
          e.weakBy.length ? `${e.weakBy.length} weak` : "",
          e.resistBy.length ? `${e.resistBy.length} resist` : "",
          e.immuneBy.length ? `${e.immuneBy.length} immune` : "",
        ]
          .filter(Boolean)
          .join(" · ");
        const count =
          tone === "resisted" ? e.resistBy.length + e.immuneBy.length : e.weakBy.length;
        return `<span class="type-chip" style="background:${typeColor(e.type)}" title="${detail}">${typeName(
          e.type
        )}<b class="ml-1 opacity-90">×${count}</b></span>`;
      })
      .join("") || `<span class="body-sm">None</span>`;

  $("criticalCount").textContent = d.critical.length;
  $("criticalTypes").innerHTML = chips(d.critical, "weak");
  $("moderateCount").textContent = d.major.length;
  $("moderateTypes").innerHTML = chips(d.major, "weak");
  $("strongCount").textContent = d.resisted.length;
  $("strongTypes").innerHTML = chips(d.resisted, "resisted");
}
