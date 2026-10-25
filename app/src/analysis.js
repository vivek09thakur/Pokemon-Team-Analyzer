// Analysis engine: pure functions over team data. Cheap (18 types × ≤6 members), re-run on every change.
import { TYPES, TYPE_CHART, BUCKET_WEIGHT } from "./constants.js";
import { bucket, clamp, effectiveness, plural, typeName } from "./calculation.js";

export function analyzeMember(pokemon) {
  const matchups = {};
  const groups = {
    immune: [],
    quadResist: [],
    resist: [],
    neutral: [],
    weak: [],
    quadWeak: [],
  };
  for (const t of TYPES) {
    const eff = effectiveness(t, pokemon.types);
    matchups[t] = eff;
    groups[bucket(eff)].push(t);
  }
  const score = clamp(
    80 +
      groups.immune.length * 8 +
      groups.quadResist.length * 4 +
      groups.resist.length * 2 -
      groups.weak.length * 8 -
      groups.quadWeak.length * 16
  );
  return { pokemon, matchups, groups, score };
}

export function analyzeDefense(members) {
  const byType = {};

  for (const t of TYPES) {
    const entry = {
      type: t,
      weakBy: [],
      quadWeakBy: [],
      resistBy: [],
      immuneBy: [],
      net: 0,
    };
    for (const m of members) {
      const b = bucket(m.matchups[t]);
      entry.net += BUCKET_WEIGHT[b];
      if (b === "weak" || b === "quadWeak") entry.weakBy.push(m.pokemon);
      if (b === "quadWeak") entry.quadWeakBy.push(m.pokemon);
      if (b === "resist" || b === "quadResist") entry.resistBy.push(m.pokemon);
      if (b === "immune") entry.immuneBy.push(m.pokemon);
    }
    const touched = entry.weakBy.length + entry.resistBy.length + entry.immuneBy.length;
    entry.severity =
      touched === 0
        ? "neutral"
        : entry.net >= 3
        ? "critical"
        : entry.net >= 1
        ? "major"
        : entry.net <= -1
        ? "resisted"
        : "balanced";
    byType[t] = entry;
  }

  const entries = Object.values(byType);
  const critical = entries.filter((e) => e.severity === "critical").sort((a, b) => b.net - a.net);
  const major = entries.filter((e) => e.severity === "major").sort((a, b) => b.net - a.net);
  const resisted = entries.filter((e) => e.severity === "resisted").sort((a, b) => a.net - b.net);

  // Penalties scale with how many members a type pressures; resistance bonus is capped
  let score = 100;
  let bonus = 0;
  for (const e of entries) {
    if (e.net > 0) score -= 8 * e.net;
    if (e.severity === "critical") score -= 8;
    if (e.net < 0) bonus += Math.min(-e.net, 2);
  }
  score += Math.min(bonus, 15);

  return { byType, critical, major, resisted, score: clamp(score) };
}

// Coverage is estimated from STAB types only (no move data is used)
export function analyzeCoverage(team) {
  const byType = {};
  for (const d of TYPES) {
    let best = 0;
    let hitters = [];
    for (const p of team) {
      for (const a of p.types) {
        const eff = TYPE_CHART[a]?.[d] ?? 1;
        if (eff > best) {
          best = eff;
          hitters = [{ pokemon: p, type: a }];
        } else if (eff === best) {
          hitters.push({ pokemon: p, type: a });
        }
      }
    }
    byType[d] = {
      type: d,
      best,
      hitters: best >= 2 ? hitters : [],
      status: best >= 2 ? "super" : best >= 1 ? "neutral" : "wall",
    };
  }

  const superEffective = TYPES.filter((d) => byType[d].status === "super");
  const gaps = TYPES.filter((d) => byType[d].status !== "super");
  const walls = TYPES.filter((d) => byType[d].status === "wall");

  const stab = new Set(team.flatMap((p) => p.types));
  const suggestions = TYPES.filter((a) => !stab.has(a))
    .map((a) => ({
      type: a,
      covers: gaps.filter((d) => (TYPE_CHART[a]?.[d] ?? 1) >= 2),
    }))
    .filter((s) => s.covers.length > 0)
    .sort((x, y) => y.covers.length - x.covers.length)
    .slice(0, 3);

  return {
    byType,
    superEffective,
    gaps,
    walls,
    suggestions,
    score: Math.round((superEffective.length / TYPES.length) * 100),
  };
}

export function analyzeDiversity(team) {
  const counts = {};
  team.forEach((p) => p.types.forEach((t) => (counts[t] = (counts[t] || 0) + 1)));
  const unique = Object.keys(counts).length;
  const possible = Math.max(1, Math.min(team.length * 2, TYPES.length));
  const duplicates = Object.entries(counts)
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1]);
  return { counts, unique, duplicates, score: Math.round((unique / possible) * 100) };
}

export function buildRecommendations(team, members, defense, coverage, diversity, teamSize) {
  const recs = [];
  const names = (list) => list.map((p) => p.name).join(", ");
  const resistersOf = (t) =>
    TYPES.filter((d) => (TYPE_CHART[t]?.[d] ?? 1) < 1).map((d) => typeName(d));

  for (const e of [...defense.critical, ...defense.major].slice(0, 3)) {
    const covered = e.resistBy.length + e.immuneBy.length;
    const quad = e.quadWeakBy.length ? ` (${e.quadWeakBy.length} at 4×)` : "";
    recs.push({
      icon: e.severity === "critical" ? "dangerous" : "warning",
      tone: e.severity === "critical" ? "error" : "warning",
      title: `${typeName(e.type)} threatens ${plural(e.weakBy.length, "member")}${quad}`,
      body: `${names(e.weakBy)}. ${
        covered === 0
          ? "Nothing on the team resists it"
          : `Only ${plural(covered, "member")} resist${covered === 1 ? "s" : ""} it`
      } — a ${resistersOf(e.type).slice(0, 4).join(" / ")} type would absorb it.`,
    });
  }

  if (coverage.gaps.length) {
    const sugg = coverage.suggestions
      .map((s) => `${typeName(s.type)} (+${s.covers.length})`)
      .join(", ");
    recs.push({
      icon: "gps_off",
      tone: coverage.gaps.length >= 6 ? "warning" : "neutral",
      title: `No super-effective STAB against ${plural(coverage.gaps.length, "type")}`,
      body: `${coverage.gaps.map((d) => typeName(d)).join(", ")}.${
        sugg ? ` Adding ${sugg} would close the most gaps.` : ""
      }`,
    });
  }

  if (coverage.walls.length) {
    recs.push({
      icon: "block",
      tone: "error",
      title: `${coverage.walls.map((d) => typeName(d)).join(", ")} resist${
        coverage.walls.length === 1 ? "s" : ""
      } every STAB type you have`,
      body: "You'd rely on neutral coverage moves to break through these.",
    });
  }

  if (diversity.duplicates.length) {
    recs.push({
      icon: "content_copy",
      tone: "neutral",
      title: "Overlapping types",
      body: `${diversity.duplicates
        .map(([t, n]) => `${typeName(t)} ×${n}`)
        .join(", ")} — shared types stack the same weaknesses.`,
    });
  }

  const weakest = members.reduce((a, b) => (b.score < a.score ? b : a), members[0]);
  if (weakest && weakest.score < 55) {
    const weakTo = [...weakest.groups.quadWeak, ...weakest.groups.weak]
      .map((t) => typeName(t))
      .join(", ");
    recs.push({
      icon: "personal_injury",
      tone: "neutral",
      title: `${weakest.pokemon.name} is the most exposed member (${weakest.score}/100)`,
      body: `Weak to ${weakTo}.`,
    });
  }

  if (team.length < teamSize) {
    recs.push({
      icon: "group_add",
      tone: "neutral",
      title: `${plural(teamSize - team.length, "slot")} still open`,
      body: "Scores assume a full team; fill the remaining slots for a fair reading.",
    });
  }

  if (recs.length === 0) {
    recs.push({
      icon: "verified",
      tone: "success",
      title: "Well balanced",
      body: "No stacked weaknesses or coverage gaps found.",
    });
  }
  return recs;
}

export function runAnalysis(teamMap, teamSize) {
  const team = [...teamMap.values()].filter(
    (p) => p && Array.isArray(p.types) && p.types.length > 0
  );
  const members = team.map(analyzeMember);
  const defense = analyzeDefense(members);
  const coverage = analyzeCoverage(team);
  const diversity = analyzeDiversity(team);
  const overall = Math.round(coverage.score * 0.4 + defense.score * 0.4 + diversity.score * 0.2);
  const recommendations = buildRecommendations(
    team,
    members,
    defense,
    coverage,
    diversity,
    teamSize
  );
  return { team, members, defense, coverage, diversity, overall, recommendations };
}
