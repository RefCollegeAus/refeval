import type { CodedTag } from "@/lib/types/reviews";

export function percent(n: number, d: number): string {
  return d ? `${Math.round((n / d) * 100)}%` : "—";
}

export function countBy(tags: CodedTag[], field: keyof CodedTag): [string, number][] {
  const counts: Record<string, number> = {};
  for (const tag of tags) {
    const value = String(tag[field] || "Uncoded");
    counts[value] = (counts[value] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

export function makeAnalytics(tags: CodedTag[]) {
  const total = tags.length;
  const correctCalls = tags.filter(t => t.outcome === "Correct Call").length;
  const correctNoCalls = tags.filter(t => t.outcome === "Correct No Call").length;
  const incorrectCalls = tags.filter(t => t.outcome === "Incorrect Call").length;
  const incorrectNoCalls = tags.filter(t => t.outcome === "Incorrect No Call").length;
  const reviews = tags.filter(t => t.outcome === "Review").length;
  const denom = correctCalls + correctNoCalls + incorrectCalls + incorrectNoCalls;
  return {
    total, correctCalls, correctNoCalls, incorrectCalls, incorrectNoCalls, reviews,
    accuracy: percent(correctCalls + correctNoCalls, denom),
    outcomeCounts: countBy(tags, "outcome"),
    categoryCounts: countBy(tags, "category"),
    coverageCounts: countBy(tags, "coverage"),
    positionCounts: countBy(tags, "position"),
  };
}
