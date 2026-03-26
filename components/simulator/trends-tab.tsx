"use client";

import React, { useMemo, useState, useSyncExternalStore } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard, SmallStat, TrendChart } from "./shared";
import { Simulator, TrendPoint } from "./types";

type Marker = { t: number; label: string; color: string };
type WindowMode = "30s" | "60s" | "120s" | "full";

function detectorMarkersFromLog(messages: Simulator["eventLog"]): Marker[] {
  return messages
    .filter(
      (entry) =>
        entry.message.startsWith("Injection started:") ||
        entry.message.startsWith("Manual injection engaged:") ||
        entry.message.startsWith("Sample reached detector:") ||
        entry.message.startsWith("Sample clearing started:") ||
        entry.message.startsWith("Injection completed:")
    )
    .slice(0, 8)
    .reverse()
    .map((entry) => {
      const message = entry.message;

      if (message.startsWith("Injection started:") || message.startsWith("Manual injection engaged:")) {
        return { t: entry.t, label: "Inject", color: "#f59e0b" };
      }

      if (message.startsWith("Sample reached detector:")) {
        return { t: entry.t, label: "Detect", color: "#10b981" };
      }

      if (message.startsWith("Sample clearing started:")) {
        return { t: entry.t, label: "Clear", color: "#8b5cf6" };
      }

      return { t: entry.t, label: "Done", color: "#0f172a" };
    });
}

export function TrendsTab({ sim }: { sim: Simulator }) {
  const [paused, setPaused] = useState(false);
  const [windowMode, setWindowMode] = useState<WindowMode>("60s");
  const [pausedData, setPausedData] = useState<TrendPoint[]>([]);
  const [pausedMarkers, setPausedMarkers] = useState<Marker[]>([]);
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const liveMarkers = useMemo(() => detectorMarkersFromLog(sim.eventLog), [sim.eventLog]);

  const liveData = sim.trends;
  const baseData = paused ? pausedData : liveData;
  const baseMarkers = paused ? pausedMarkers : liveMarkers;

  const filteredData = useMemo(() => {
    if (baseData.length === 0 || windowMode === "full") return baseData;
    const lastT = baseData[baseData.length - 1]?.t ?? 0;
    const seconds = windowMode === "30s" ? 30 : windowMode === "60s" ? 60 : 120;
    return baseData.filter((point) => point.t >= lastT - seconds);
  }, [baseData, windowMode]);

  const filteredMarkers = useMemo(() => {
    if (filteredData.length === 0) return baseMarkers;
    const start = filteredData[0]?.t ?? 0;
    return baseMarkers.filter((marker) => marker.t >= start);
  }, [baseMarkers, filteredData]);

  const detectorValues = filteredData.map((point) => point.detector);
  const responseValues = filteredData.map((point) => point.response);
  const measuredValues = filteredData.map((point) => point.measured);

  const baseline =
    detectorValues.length === 0
      ? 0
      : detectorValues.slice(0, Math.min(12, detectorValues.length)).reduce((acc, value) => acc + value, 0) /
        Math.min(12, detectorValues.length);
  const peak = detectorValues.length === 0 ? 0 : Math.max(...detectorValues);
  const delta = Math.max(0, peak - baseline);
  const current = detectorValues[detectorValues.length - 1] ?? sim.detectorFiltered;
  const currentMeasured = measuredValues[measuredValues.length - 1] ?? sim.measuredConcentrationPpm;

  const signalFloor = Math.min(...detectorValues, ...responseValues, baseline, 0.09);
  const signalCeil = Math.max(...detectorValues, ...responseValues, peak, 0.12);
  const signalPadding = Math.max((signalCeil - signalFloor) * 0.22, 0.01);
  const detectorDomain: [number, number] = [
    Math.max(0, signalFloor - signalPadding),
    signalCeil + signalPadding,
  ];

  const measuredFloor = Math.min(...measuredValues, 0);
  const measuredCeil = Math.max(...measuredValues, 5);
  const measuredPadding = Math.max((measuredCeil - measuredFloor) * 0.18, 2);

  const togglePause = () => {
    if (paused) {
      setPaused(false);
      return;
    }

    setPausedData([...liveData]);
    setPausedMarkers([...liveMarkers]);
    setPaused(true);
  };

  const exportDetectorCsv = () => {
    const rows = [
      ["time_s", "detector_au", "response_au", "measured_ppm", "injection_ul_min"],
      ...filteredData.map((point) => [
        point.t.toFixed(1),
        point.detector.toFixed(6),
        point.response.toFixed(6),
        point.measured.toFixed(4),
        point.inj.toFixed(4),
      ]),
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `detector-trace-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const charts = [
    { title: "Furnace raw temperature", dataKey: "furnace", color: "#f97316" },
    { title: "Displayed furnace temperature", dataKey: "furnaceCal", color: "#fb7185" },
    {
      title: "Measured concentration",
      dataKey: "measured",
      color: "#8b5cf6",
      yDomain: [Math.max(0, measuredFloor - measuredPadding), measuredCeil + measuredPadding] as [number, number],
    },
    { title: "Oxygen flow", dataKey: "o2", color: "#38bdf8" },
    { title: "Pressure drop", dataKey: "dp", color: "#facc15" },
    { title: "Injection rate", dataKey: "inj", color: "#f59e0b" },
  ] as const;

  return (
    <div className="space-y-4">
      <SectionCard
        title="Detector Signal Analysis"
        eyebrow="Primary analytical graph"
        action={
          <div className="flex flex-wrap items-center gap-2">
            {(["30s", "60s", "120s", "full"] as const).map((mode) => (
              <Button
                key={mode}
                type="button"
                size="sm"
                variant={windowMode === mode ? "default" : "outline"}
                onClick={() => setWindowMode(mode)}
                className={windowMode === mode ? "rounded-xl bg-sky-600 text-white hover:bg-sky-700" : "rounded-xl"}
              >
                {mode}
              </Button>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={togglePause} className="rounded-xl">
              {paused ? <Play className="mr-1 h-4 w-4" /> : <Pause className="mr-1 h-4 w-4" />}
              {paused ? "Resume" : "Pause"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={exportDetectorCsv} className="rounded-xl">
              <Download className="mr-1 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SmallStat label="Mode" value={paused ? "Paused snapshot" : "Live stream"} emphasis />
          <SmallStat label="Current signal" value={`${current.toFixed(5)} AU`} />
          <SmallStat label="Baseline" value={`${baseline.toFixed(5)} AU`} />
          <SmallStat label="Peak" value={`${peak.toFixed(5)} AU`} />
          <SmallStat label="Delta / ppm" value={`${delta.toFixed(5)} AU / ${currentMeasured.toFixed(2)} ppm`} />
        </div>

        <div className="mt-4 h-[430px] min-w-0">
          {hydrated ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredData}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(203,213,225,0.85)" />
                <XAxis
                  dataKey="t"
                  stroke="#94a3b8"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickLine={{ stroke: "#cbd5e1" }}
                />
                <YAxis
                  yAxisId="signal"
                  domain={detectorDomain}
                  stroke="#94a3b8"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickLine={{ stroke: "#cbd5e1" }}
                />
                <YAxis
                  yAxisId="ppm"
                  orientation="right"
                  domain={[Math.max(0, measuredFloor - measuredPadding), measuredCeil + measuredPadding]}
                  stroke="#c084fc"
                  tick={{ fill: "#7c3aed", fontSize: 12 }}
                  axisLine={{ stroke: "#e9d5ff" }}
                  tickLine={{ stroke: "#e9d5ff" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "#fffefb",
                    border: "1px solid rgba(226,232,240,1)",
                    borderRadius: 16,
                    color: "#0f172a",
                  }}
                />
                <Legend />

                <ReferenceLine
                  yAxisId="signal"
                  y={baseline}
                  stroke="#64748b"
                  strokeDasharray="6 6"
                  label={{ value: "Baseline", fill: "#64748b", fontSize: 10, position: "insideBottomRight" }}
                />

                {filteredMarkers.map((marker) => (
                  <ReferenceLine
                    key={`detector-marker-${marker.label}-${marker.t}`}
                    x={marker.t}
                    stroke={marker.color}
                    strokeDasharray="5 5"
                    strokeWidth={1.6}
                    label={{ value: marker.label, fill: marker.color, fontSize: 10, position: "insideTopRight" }}
                  />
                ))}

                <Line
                  yAxisId="signal"
                  type="monotone"
                  dataKey="detector"
                  name="Detector signal"
                  stroke="#10b981"
                  strokeWidth={3.2}
                  dot={false}
                  isAnimationActive={false}
                  activeDot={{ r: 4, fill: "#fffefb", stroke: "#10b981", strokeWidth: 2 }}
                />
                <Line
                  yAxisId="signal"
                  type="monotone"
                  dataKey="response"
                  name="Model response"
                  stroke="#0ea5e9"
                  strokeWidth={2.2}
                  strokeDasharray="7 5"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="ppm"
                  type="monotone"
                  dataKey="measured"
                  name="Measured ppm"
                  stroke="#8b5cf6"
                  strokeWidth={2.2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-end rounded-[24px] border border-dashed border-stone-200 bg-stone-50/80 px-4 py-5">
              <div className="grid h-full w-full grid-cols-24 items-end gap-2">
                {[24, 28, 25, 27, 31, 40, 55, 68, 82, 96, 88, 74, 60, 52, 44, 38, 34, 29, 26, 24, 23, 22, 22, 21].map((bar, index) => (
                  <div
                    key={`detector-preview-${index}`}
                    className="rounded-t-full bg-emerald-400/60"
                    style={{ height: `${bar}%` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        {charts.map((chart) => (
          <TrendChart
            key={chart.title}
            title={chart.title}
            data={filteredData}
            dataKey={chart.dataKey}
            color={chart.color}
            markers={filteredMarkers}
            yDomain={"yDomain" in chart ? chart.yDomain : undefined}
          />
        ))}
      </div>
    </div>
  );
}
