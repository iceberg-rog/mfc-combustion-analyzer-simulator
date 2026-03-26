"use client";

import React from "react";
import { Activity, AlertTriangle, Gauge, Play, RotateCcw, Square, Waves } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard, SmallStat } from "./shared";
import { Simulator } from "./types";

export function TopBar({
  sim,
  faultCount,
  warningCount,
  onColdStart,
  onRun,
  onPurge,
  onShutdown,
  onReset,
}: {
  sim: Simulator;
  faultCount: number;
  warningCount: number;
  onColdStart: () => void;
  onRun: () => void;
  onPurge: () => void;
  onShutdown: () => void;
  onReset: () => void;
}) {
  const stateTone =
    sim.state === "RUN"
      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
      : sim.state === "FAULT"
        ? "border-rose-300 bg-rose-50 text-rose-800"
        : sim.state === "READY"
          ? "border-sky-300 bg-sky-50 text-sky-800"
          : "border-amber-300 bg-amber-50 text-amber-800";

  return (
    <SectionCard
      eyebrow="Industrial Lab Console"
      title="MFC Combustion Analyzer Simulator"
      action={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge className={`border px-3 py-1.5 text-sm ${stateTone}`}>{sim.state}</Badge>
          <Badge className="border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-slate-700">
            Runtime {sim.time.toFixed(1)} s
          </Badge>
        </div>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            A clearer, lighter operator surface built for process review instead of decorative dashboard chrome.
            The hierarchy is flatter, the status colors are sharper, and the controls stay readable at a glance.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button onClick={onColdStart} className="rounded-2xl bg-sky-600 text-white hover:bg-sky-700">
              <Play className="mr-2 h-4 w-4" />
              Cold Start
            </Button>
            <Button onClick={onRun} variant="secondary" className="rounded-2xl border border-stone-300 bg-white text-slate-800 hover:bg-stone-50">
              <Activity className="mr-2 h-4 w-4" />
              Run
            </Button>
            <Button onClick={onPurge} variant="secondary" className="rounded-2xl border border-stone-300 bg-white text-slate-800 hover:bg-stone-50">
              <Waves className="mr-2 h-4 w-4" />
              Purge
            </Button>
            <Button onClick={onShutdown} variant="secondary" className="rounded-2xl border border-stone-300 bg-white text-slate-800 hover:bg-stone-50">
              <Square className="mr-2 h-4 w-4" />
              Shutdown
            </Button>
            <Button onClick={onReset} variant="outline" className="rounded-2xl border-stone-300 bg-stone-50 text-slate-800 hover:bg-stone-100">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Faults
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SmallStat label="Faults" value={String(faultCount)} emphasis />
          <SmallStat label="Warnings" value={String(warningCount)} />
          <SmallStat label="Detector" value={sim.detectorFiltered.toFixed(4)} />
          <SmallStat label="Pressure Drop" value={`${sim.totalDp.toFixed(1)} mbar`} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3 text-sm">
        <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-slate-700">
          <Gauge className="h-4 w-4 text-sky-700" />
          Heater duty {(sim.heaterDuty * 100).toFixed(1)}%
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-slate-700">
          <Activity className="h-4 w-4 text-emerald-700" />
          Combustion {(sim.combustionEff * 100).toFixed(1)}%
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-slate-700">
          <AlertTriangle className="h-4 w-4 text-amber-700" />
          PMT HV {sim.pmtHvPv.toFixed(0)} V
        </div>
      </div>
    </SectionCard>
  );
}
