/**
 * Display-only compatibility layer for legacy review taxonomy values.
 * Raw Supabase data is never modified — only what is shown in the Stats Hub.
 */

// Modern top-level categories
const MODERN_CATEGORIES = new Set([
  "Foul", "Violation", "Mechanics", "Game Awareness", "Game Administration",
]);

// Modern specific tags per category (for validation, not filtering)
const MODERN_SPECIFIC_TAGS: Record<string, Set<string>> = {
  Foul: new Set(["Hands","Hold","Push","Block","Charge","Hook","Head","Illegal Screen","Disruption","Throw-In","Elbow / Kick","Impact","Flagrant","Technical","Disqualification","Correctable Error","Other"]),
  Violation: new Set(["Out of Bounds","Travel","3 Seconds","5 Seconds","8 Seconds","Backcourt","Kick/Strike Ball","Jump Ball","Free Throw","24 Seconds","Other"]),
  Mechanics: new Set(["Closed Angle","Process","Coverage","Whistle Timing","Signals","Communication","Positioning","Advantage / Disadvantage","Other"]),
  "Game Awareness": new Set(["Coach Behaviour","Player Behaviour","End of Quarter","Escalation","Feel for Game","State of Game","Other"]),
  "Game Administration": new Set(["Game Clock","Shot Clock","Inbound Location","Substitution","Timeout","Correctable Error","Other"]),
};

// Legacy category prefix aliases (case-insensitive keys handled via normalize below)
const LEGACY_CATEGORY_MAP: Record<string, string> = {
  "foul": "Foul",
  "violation": "Violation",
  "mechanics": "Mechanics",
  "game awareness": "Game Awareness",
  "game administration": "Game Administration",
};

// Legacy specific-tag suffix aliases (normalised to lowercase)
const LEGACY_SPECIFIC_TAG_MAP: Record<string, string> = {
  "oob": "Out of Bounds",
  "out of bounds": "Out of Bounds",
  "travel": "Travel",
  "backcourt": "Backcourt",
  "3 seconds": "3 Seconds",
  "3sec": "3 Seconds",
  "5 seconds": "5 Seconds",
  "5sec": "5 Seconds",
  "8 seconds": "8 Seconds",
  "8sec": "8 Seconds",
  "24 seconds": "24 Seconds",
  "24sec": "24 Seconds",
  "position": "Positioning",
  "positioning": "Positioning",
  "signal": "Signals",
  "signals": "Signals",
  "communication": "Communication",
  "coverage": "Coverage",
  "whistle timing": "Whistle Timing",
  "closed angle": "Closed Angle",
  "process": "Process",
  "jump ball": "Jump Ball",
  "free throw": "Free Throw",
  "kick/strike ball": "Kick/Strike Ball",
  "kick strike ball": "Kick/Strike Ball",
  "coach behaviour": "Coach Behaviour",
  "coach behavior": "Coach Behaviour",
  "player behaviour": "Player Behaviour",
  "player behavior": "Player Behaviour",
  "end of quarter": "End of Quarter",
  "escalation": "Escalation",
  "feel for game": "Feel for Game",
  "state of game": "State of Game",
  "game clock": "Game Clock",
  "shot clock": "Shot Clock",
  "inbound location": "Inbound Location",
  "substitution": "Substitution",
  "timeout": "Timeout",
  "correctable error": "Correctable Error",
  "flagrant": "Flagrant",
  "technical": "Technical",
  "disqualification": "Disqualification",
  "hands": "Hands",
  "hold": "Hold",
  "push": "Push",
  "block": "Block",
  "charge": "Charge",
  "hook": "Hook",
  "head": "Head",
  "illegal screen": "Illegal Screen",
  "disruption": "Disruption",
  "throw-in": "Throw-In",
  "elbow / kick": "Elbow / Kick",
  "elbow/kick": "Elbow / Kick",
  "impact": "Impact",
  "other": "Other",
};

/** Trim and collapse whitespace around separator hyphens. */
function normaliseSep(raw: string): string {
  return raw.trim().replace(/\s*-\s*/g, " - ");
}

/**
 * Split a raw category string into [categoryPrefix, specificSuffix | null].
 * Handles both modern "Category — Specific" (em dash) and legacy "Category - Specific" (hyphen).
 */
function splitCategoryString(raw: string): [string, string | null] {
  const emDash = raw.indexOf(" — ");
  if (emDash !== -1) return [raw.slice(0, emDash).trim(), raw.slice(emDash + 3).trim() || null];
  // Legacy hyphen separator: normalise spacing first
  const normalised = normaliseSep(raw);
  const hyphen = normalised.indexOf(" - ");
  if (hyphen !== -1) return [normalised.slice(0, hyphen).trim(), normalised.slice(hyphen + 3).trim() || null];
  return [raw.trim(), null];
}

/**
 * Returns the modern display category for a raw category string.
 * Returns null for empty / unrecognised input.
 */
export function getDisplayCategory(rawCategory?: string | null): string | null {
  if (!rawCategory?.trim()) return null;
  const [prefix] = splitCategoryString(rawCategory);
  // Already a modern top-level category
  if (MODERN_CATEGORIES.has(prefix)) return prefix;
  // Legacy alias lookup
  const mapped = LEGACY_CATEGORY_MAP[prefix.toLowerCase()];
  return mapped ?? null;
}

/**
 * Returns the modern display specific tag for a raw category string.
 * Returns null when there is no specific-tag part or it cannot be cleanly mapped.
 */
export function getDisplaySpecificTag(rawCategory?: string | null): string | null {
  if (!rawCategory?.trim()) return null;
  const [prefix, suffix] = splitCategoryString(rawCategory);

  // Resolve category first
  const category = MODERN_CATEGORIES.has(prefix)
    ? prefix
    : LEGACY_CATEGORY_MAP[prefix.toLowerCase()] ?? null;
  if (!category) return null;
  if (!suffix) return null;

  // Is it already a modern specific tag for this category?
  if (MODERN_SPECIFIC_TAGS[category]?.has(suffix)) return suffix;

  // Try legacy alias
  const mapped = LEGACY_SPECIFIC_TAG_MAP[suffix.toLowerCase()];
  if (!mapped) return null;

  // Validate the mapped tag belongs to this category
  if (MODERN_SPECIFIC_TAGS[category]?.has(mapped)) return mapped;
  return null;
}

/**
 * Returns the modern "Category — SpecificTag" string used for grouping in the Stats Hub.
 * Falls back to just the category if there is no clean specific tag mapping.
 */
export function getDisplayCategoryFull(rawCategory?: string | null): string | null {
  const cat = getDisplayCategory(rawCategory);
  if (!cat) return null;
  const spec = getDisplaySpecificTag(rawCategory);
  return spec ? `${cat} — ${spec}` : cat;
}

export type NormalisedTag<T extends { category?: string | null }> = T & {
  _displayCategory: string | null;
  _displaySpecificTag: string | null;
  _displayCategoryFull: string | null;
};

/** Attaches display fields to a tag object without mutating the original stored values. */
export function normaliseClipTaxonomy<T extends { category?: string | null }>(tag: T): NormalisedTag<T> {
  return {
    ...tag,
    _displayCategory: getDisplayCategory(tag.category),
    _displaySpecificTag: getDisplaySpecificTag(tag.category),
    _displayCategoryFull: getDisplayCategoryFull(tag.category),
  };
}
