import { ModuleStatus } from "./types";

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export const expEase = (
  current: number,
  target: number,
  dt: number,
  tau: number
) => current + (target - current) * (1 - Math.exp(-dt / Math.max(0.001, tau)));

export const randn = () => {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

export function moduleState(
  enabled: boolean,
  ready: boolean,
  active: boolean,
  fault: boolean
): ModuleStatus {
  if (fault) return "fault";
  if (active) return "active";
  if (ready || enabled) return "ready";
  return "off";
}

export function statusTone(status: ModuleStatus) {
  if (status === "active") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (status === "ready") return "border-sky-300 bg-sky-50 text-sky-800";
  if (status === "fault") return "border-rose-300 bg-rose-50 text-rose-800";
  return "border-stone-200 bg-stone-100/80 text-stone-500";
}

export function statusDot(status: ModuleStatus) {
  if (status === "active") return "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.35)]";
  if (status === "ready") return "bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.3)]";
  if (status === "fault") return "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]";
  return "bg-stone-400";
}

export function kpiTone(value: number, good: number, warn: number, reverse = false) {
  if (!reverse) {
    if (value >= good) return "text-emerald-700";
    if (value >= warn) return "text-amber-700";
    return "text-rose-700";
  }
  if (value <= good) return "text-emerald-700";
  if (value <= warn) return "text-amber-700";
  return "text-rose-700";
}

export function formatSigned(value: number, digits = 1) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}

export function sanitizeNumber(value: string, fallback: number) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}
