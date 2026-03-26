"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { getCalibrationFit } from "./derived";
import { SAMPLE_LIBRARY } from "./simulator-engine";
import { MetricCard, SectionCard, SmallStat } from "./shared";
import { Simulator } from "./types";

function CalibrationPlot({ sim }: { sim: Simulator }) {
  const fit = getCalibrationFit(sim);
  const points = fit.points;
  const maxX = Math.max(110, ...points.map((point) => point.expectedPpm));
  const maxY = Math.max(0.9, ...points.map((point) => point.responseAu));
  const width = 620;
  const height = 320;
  const padding = 34;

  const mapX = (x: number) => padding + (x / maxX) * (width - padding * 2);
  const mapY = (y: number) => height - padding - (y / maxY) * (height - padding * 2);
  const linePath = `M ${mapX(0)} ${mapY(fit.intercept)} L ${mapX(maxX)} ${mapY(
    fit.intercept + fit.slope * maxX
  )}`;

  return (
    <div className="rounded-[26px] border border-stone-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(244,240,232,0.9)_100%)] p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[320px] w-full">
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const yValue = maxY * ratio;
          const y = mapY(yValue);
          return (
            <g key={`grid-y-${ratio}`}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#d6d3d1" strokeDasharray="4 6" />
              <text x={6} y={y + 4} fontSize="11" fill="#64748b">
                {yValue.toFixed(2)}
              </text>
            </g>
          );
        })}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const xValue = maxX * ratio;
          const x = mapX(xValue);
          return (
            <g key={`grid-x-${ratio}`}>
              <line x1={x} y1={padding} x2={x} y2={height - padding} stroke="#e7e5e4" />
              <text x={x - 10} y={height - 10} fontSize="11" fill="#64748b">
                {xValue.toFixed(0)}
              </text>
            </g>
          );
        })}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#334155" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" />
        <path d={linePath} fill="none" stroke="#0ea5e9" strokeWidth="3" />
        {points.map((point) => (
          <g key={point.id}>
            <circle cx={mapX(point.expectedPpm)} cy={mapY(point.responseAu)} r="6" fill="#f97316" stroke="#fff" strokeWidth="2" />
            <text x={mapX(point.expectedPpm) + 8} y={mapY(point.responseAu) - 8} fontSize="11" fill="#475569">
              {point.name}
            </text>
          </g>
        ))}
        <text x={width / 2 - 80} y={height - 6} fontSize="12" fill="#475569">
          Concentration (ppm)
        </text>
        <text x={12} y={20} fontSize="12" fill="#475569">
          Response (AU)
        </text>
      </svg>
    </div>
  );
}

export function CalibrationTab({
  sim,
  setSim,
}: {
  sim: Simulator;
  setSim: React.Dispatch<React.SetStateAction<Simulator>>;
}) {
  const fit = getCalibrationFit(sim);
  const latestCalibration = sim.injectionHistory.find(
    (record) => record.name === "Blank" || record.name.startsWith("Cal ")
  );

  const queueById = (id: string) =>
    setSim((prev) => ({
      ...prev,
      selectedStandardId: id,
      sampleShotRequested: true,
      autoRunRequested: prev.state === "READY" ? true : prev.autoRunRequested,
    }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <MetricCard label="Slope" value={fit.slope.toFixed(6)} unit="AU/ppm" helper="Linear response factor" />
        <MetricCard label="Intercept" value={fit.intercept.toFixed(4)} unit="AU" helper="Zero/background response" />
        <MetricCard label="Linearity" value={fit.r2.toFixed(5)} unit="R2" helper={`${fit.points.length} calibration points`} />
        <MetricCard
          label="Last calibration"
          value={latestCalibration ? latestCalibration.measuredPpm.toFixed(2) : "N/A"}
          unit="ppm"
          helper={latestCalibration ? latestCalibration.name : "No calibration run yet"}
        />
      </div>

      <SectionCard title="Calibration curve" eyebrow="Response versus concentration">
        <CalibrationPlot sim={sim} />
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Calibration standards" eyebrow="Quick execution">
          <div className="space-y-3">
            {SAMPLE_LIBRARY.filter((item) => item.kind !== "sample").map((standard) => (
              <div
                key={standard.id}
                className="flex items-center justify-between gap-4 rounded-[22px] border border-stone-200 bg-stone-50/80 p-4"
              >
                <div>
                  <div className="font-medium text-slate-900">{standard.name}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    Expected {standard.expectedPpm.toFixed(1)} ppm, tolerance {standard.acceptancePct.toFixed(1)}%
                  </div>
                </div>
                <Button
                  onClick={() => queueById(standard.id)}
                  variant="secondary"
                  className="rounded-2xl border border-stone-300 bg-white text-slate-900 hover:bg-stone-50"
                >
                  Run standard
                </Button>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Recent calibration points" eyebrow="Captured standards">
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
            <SmallStat label="Current sample" value={sim.selectedStandardId} />
            <SmallStat label="Shot volume" value={`${sim.injShotVolumeUl.toFixed(0)} uL`} />
            <SmallStat label="Injection rate" value={`${sim.injSp.toFixed(1)} uL/min`} />
            <SmallStat label="Measured now" value={`${sim.measuredConcentrationPpm.toFixed(2)} ppm`} emphasis />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-slate-500">
                  <th className="pb-3 pr-4 font-medium">Point</th>
                  <th className="pb-3 pr-4 font-medium">Expected</th>
                  <th className="pb-3 pr-4 font-medium">Response</th>
                  <th className="pb-3 font-medium">Measured</th>
                </tr>
              </thead>
              <tbody>
                {fit.points.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-slate-500">
                      No calibration points yet. Run blank and standards from this panel.
                    </td>
                  </tr>
                ) : (
                  fit.points.map((point) => (
                    <tr key={point.id} className="border-b border-stone-100">
                      <td className="py-3 pr-4 font-medium text-slate-900">{point.name}</td>
                      <td className="py-3 pr-4 text-slate-600">{point.expectedPpm.toFixed(2)} ppm</td>
                      <td className="py-3 pr-4 text-slate-600">{point.responseAu.toFixed(4)} AU</td>
                      <td className="py-3 text-slate-600">{point.measuredPpm.toFixed(2)} ppm</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
