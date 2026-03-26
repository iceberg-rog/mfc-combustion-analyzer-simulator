"use client";

import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ModuleStatus } from "./types";
import { clamp, statusDot, statusTone } from "./utils";

function useHydrated() {
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}

export function SectionCard({
  title,
  eyebrow,
  children,
  action,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="rounded-[30px] border border-stone-200/90 bg-white/86 text-slate-900 shadow-[0_24px_90px_rgba(120,113,108,0.12)] backdrop-blur">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          {eyebrow ? (
            <div className="text-[11px] uppercase tracking-[0.32em] text-sky-700/70">{eyebrow}</div>
          ) : null}
          <CardTitle className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{title}</CardTitle>
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function MetricCard({
  label,
  value,
  unit,
  helper,
}: {
  label: string;
  value: string;
  unit?: string;
  helper?: string;
}) {
  return (
    <Card className="rounded-[26px] border border-stone-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,244,237,0.94)_100%)] text-slate-900">
      <CardContent className="space-y-2 p-5">
        <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{label}</div>
        <div className="flex items-end gap-2">
          <div className="text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
          {unit ? <div className="pb-1 font-mono text-xs text-slate-500">{unit}</div> : null}
        </div>
        {helper ? <div className="text-xs text-slate-500">{helper}</div> : null}
      </CardContent>
    </Card>
  );
}

export function GaugeWidget({
  label,
  value,
  max,
  suffix,
  color,
}: {
  label: string;
  value: number;
  max: number;
  suffix: string;
  color: string;
}) {
  const hydrated = useHydrated();
  const normalized = clamp((value / max) * 100, 0, 100);
  const data = [{ name: label, value: normalized, fill: color }];

  return (
    <Card className="rounded-[26px] border border-stone-200 bg-white/92 text-slate-900">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium text-slate-600">{label}</CardTitle>
      </CardHeader>
      <CardContent className="h-[190px] min-w-0">
        {hydrated ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={220} minHeight={160}>
            <RadialBarChart innerRadius="72%" outerRadius="100%" data={data} startAngle={210} endAngle={-30}>
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar background={{ fill: "rgba(214,211,209,0.85)" }} dataKey="value" cornerRadius={14} />
              <text x="50%" y="48%" textAnchor="middle" fill="#0f172a" fontSize="28" fontWeight="600">
                {value.toFixed(1)}
              </text>
              <text x="50%" y="62%" textAnchor="middle" fill="#64748b" fontSize="12">
                {suffix}
              </text>
            </RadialBarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-stone-200 bg-stone-50/80">
            <div className="text-center">
              <div className="text-3xl font-semibold tracking-tight text-slate-900">{value.toFixed(1)}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">{suffix}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function KeyValue({ a, b }: { a: string; b: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-stone-200 py-2.5 text-sm last:border-b-0">
      <span className="text-slate-500">{a}</span>
      <span className="text-right font-medium text-slate-900">{b}</span>
    </div>
  );
}

export function SmallStat({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-stone-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(245,241,233,0.9)_100%)] p-4">
      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className={`mt-2 text-lg font-semibold ${emphasis ? "text-slate-950" : "text-slate-800"}`}>
        {value}
      </div>
    </div>
  );
}

export function StatusBadge({ label, status }: { label: string; status: ModuleStatus }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${statusTone(status)}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${statusDot(status)}`} />
      <span>{label}</span>
    </div>
  );
}

export function ModuleTile({
  title,
  icon: Icon,
  status,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  status: ModuleStatus;
  children: React.ReactNode;
}) {
  return (
    <Card className={`rounded-[26px] border bg-white/92 text-slate-900 ${statusTone(status)}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Icon className="h-4 w-4 text-sky-700" />
            {title}
          </CardTitle>
          <Badge className={`border text-[10px] tracking-[0.18em] uppercase shadow-none ${statusTone(status)}`}>
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function FillBar({
  value,
  max,
  colorClass,
}: {
  value: number;
  max: number;
  colorClass?: string;
}) {
  return <Progress value={clamp((value / max) * 100, 0, 100)} className={`mt-4 h-2 ${colorClass ?? ""}`} />;
}

export function TrendChart({
  title,
  data,
  dataKey,
  color,
  markers = [],
  yDomain,
}: {
  title: string;
  data: Array<Record<string, number>>;
  dataKey: string;
  color: string;
  markers?: Array<{ t: number; label: string; color: string }>;
  yDomain?: [number | "auto", number | "auto"];
}) {
  const hydrated = useHydrated();

  return (
    <Card className="rounded-[26px] border border-stone-200 bg-white/92 text-slate-900">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base font-semibold text-slate-900">{title}</CardTitle>
          {markers.length > 0 ? (
            <div className="flex flex-wrap justify-end gap-2">
              {markers.slice(-3).map((marker) => (
                <span
                  key={`${title}-${marker.label}-${marker.t}`}
                  className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-600"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: marker.color }} />
                  {marker.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="h-[280px] min-w-0">
        {hydrated ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={260} minHeight={220}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(203,213,225,0.85)" />
              <XAxis
                dataKey="t"
                stroke="#94a3b8"
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={{ stroke: "#cbd5e1" }}
              />
              <YAxis
                domain={yDomain}
                stroke="#94a3b8"
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={{ stroke: "#cbd5e1" }}
              />
              <Tooltip
                contentStyle={{
                  background: "#fffefb",
                  border: "1px solid rgba(226,232,240,1)",
                  borderRadius: 16,
                  color: "#0f172a",
                }}
              />
              {markers.map((marker) => (
                <ReferenceLine
                  key={`${title}-marker-${marker.label}-${marker.t}`}
                  x={marker.t}
                  stroke={marker.color}
                  strokeDasharray="5 5"
                  strokeWidth={1.6}
                  label={{
                    value: marker.label,
                    position: "insideTopRight",
                    fill: marker.color,
                    fontSize: 10,
                  }}
                />
              ))}
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                fill={`url(#fill-${dataKey})`}
                strokeWidth={2.8}
                isAnimationActive={false}
                dot={false}
                activeDot={{ r: 4, stroke: color, strokeWidth: 1.5, fill: "#fffefb" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-end rounded-[20px] border border-dashed border-stone-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.9)_0%,rgba(241,245,249,0.8)_100%)] px-4 py-5">
            <div className="grid h-full w-full grid-cols-12 items-end gap-2">
              {[28, 42, 31, 58, 47, 61, 54, 76, 64, 71, 68, 83].map((bar, index) => (
                <div
                  key={`${dataKey}-${index}`}
                  className="rounded-t-full"
                  style={{
                    height: `${bar}%`,
                    background: `${color}55`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
