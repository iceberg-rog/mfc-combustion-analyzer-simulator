"use client";

import React from "react";
import { getCalibrationFit } from "./derived";
import { MetricCard, SectionCard } from "./shared";
import { Simulator } from "./types";

function resultTone(status: "PASS" | "WARN" | "FAIL") {
  if (status === "PASS") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "WARN") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

export function ResultsTab({ sim }: { sim: Simulator }) {
  const latest = sim.injectionHistory[0];
  const fit = getCalibrationFit(sim);
  const qcRecords = sim.injectionHistory.filter((record) => record.standardId === "qc-check");
  const passCount = sim.injectionHistory.filter((record) => record.status === "PASS").length;
  const warnCount = sim.injectionHistory.filter((record) => record.status === "WARN").length;
  const failCount = sim.injectionHistory.filter((record) => record.status === "FAIL").length;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <MetricCard
          label="Latest result"
          value={latest ? latest.measuredPpm.toFixed(2) : "N/A"}
          unit="ppm"
          helper={latest ? latest.name : "No injection complete yet"}
        />
        <MetricCard
          label="Recovery"
          value={latest ? latest.recoveryPct.toFixed(2) : "N/A"}
          unit="%"
          helper={latest ? `Expected ${latest.expectedPpm.toFixed(2)} ppm` : "Waiting for sample"}
        />
        <MetricCard label="Calibration R2" value={fit.r2.toFixed(5)} helper="Used for ppm back-calculation" />
        <MetricCard label="QC count" value={String(qcRecords.length)} helper="Independent check standard runs" />
      </div>

      <SectionCard title="Analytical release view" eyebrow="Operator-facing result table">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-slate-500">
                <th className="pb-3 pr-4 font-medium">Time</th>
                <th className="pb-3 pr-4 font-medium">Sample</th>
                <th className="pb-3 pr-4 font-medium">Expected</th>
                <th className="pb-3 pr-4 font-medium">Measured</th>
                <th className="pb-3 pr-4 font-medium">Response</th>
                <th className="pb-3 pr-4 font-medium">Recovery</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {sim.injectionHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-4 text-slate-500">
                    No complete analytical results yet. Queue a standard or sample from the module panel.
                  </td>
                </tr>
              ) : (
                sim.injectionHistory.map((record) => (
                  <tr key={record.id} className="border-b border-stone-100">
                    <td className="py-3 pr-4 text-slate-600">{record.t.toFixed(1)} s</td>
                    <td className="py-3 pr-4 font-medium text-slate-900">{record.name}</td>
                    <td className="py-3 pr-4 text-slate-600">{record.expectedPpm.toFixed(2)} ppm</td>
                    <td className="py-3 pr-4 text-slate-600">{record.measuredPpm.toFixed(2)} ppm</td>
                    <td className="py-3 pr-4 text-slate-600">{record.responseAu.toFixed(4)} AU</td>
                    <td className="py-3 pr-4 text-slate-600">{record.recoveryPct.toFixed(2)} %</td>
                    <td className="py-3">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${resultTone(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Release criteria snapshot" eyebrow="Fast interpretation">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-emerald-700/70">Pass</div>
              <div className="mt-2 text-3xl font-semibold text-emerald-900">{passCount}</div>
            </div>
            <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-amber-700/70">Warn</div>
              <div className="mt-2 text-3xl font-semibold text-amber-900">{warnCount}</div>
            </div>
            <div className="rounded-[22px] border border-rose-200 bg-rose-50 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-rose-700/70">Fail</div>
              <div className="mt-2 text-3xl font-semibold text-rose-900">{failCount}</div>
            </div>
          </div>

          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <p>
              Results are back-calculated from the live calibration line rather than a hard-coded factor,
              so repeated standards directly reshape the instrument response.
            </p>
            <p>
              Sample acceptance uses the configured tolerance for each standard and reports pass, warning,
              or fail against that band.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="Latest report card" eyebrow="Most recent injection">
          {latest ? (
            <div className="space-y-3">
              {[
                ["Sample", latest.name],
                ["Expected", `${latest.expectedPpm.toFixed(2)} ppm`],
                ["Measured", `${latest.measuredPpm.toFixed(2)} ppm`],
                ["Recovery", `${latest.recoveryPct.toFixed(2)} %`],
                ["Volume", `${latest.volumeUl.toFixed(0)} uL`],
                ["Flow", `${latest.flowUlMin.toFixed(1)} uL/min`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 rounded-[20px] border border-stone-200 bg-stone-50/70 px-4 py-3"
                >
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium text-slate-900">{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[20px] border border-stone-200 bg-stone-50/70 px-4 py-6 text-sm text-slate-500">
              No report card yet because no injection has finished.
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
