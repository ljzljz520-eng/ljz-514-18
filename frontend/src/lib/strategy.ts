/** 路线规划策略（与后端 /api/path 的 strategy 参数一致） */
export const STRATEGY_OPTIONS = [
  { value: "distance", label: "最短距离" },
  { value: "stops", label: "最少经停" },
] as const;

export type Strategy = (typeof STRATEGY_OPTIONS)[number]["value"];

export const DEFAULT_STRATEGY: Strategy = "distance";

export function strategyLabel(value?: string): string {
  const hit = STRATEGY_OPTIONS.find((o) => o.value === value);
  return hit ? hit.label : STRATEGY_OPTIONS[0].label;
}
