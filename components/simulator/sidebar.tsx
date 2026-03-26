"use client";

import React from "react";
import { ListTree, Settings2, ShieldAlert, Thermometer } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getReadiness } from "./derived";
import { SectionCard, SmallStat } from "./shared";
import { Simulator, SystemState } from "./types";
import { clamp, kpiTone } from "./utils";

export function SidebarPanel({ sim }: { sim: Simulator }) {
  const states: SystemState[] = ["OFF", "SELF_TEST", "PURGE", "WARMUP", "READY", "RUN", "SHUTDOWN", "FAULT"];
  const readiness = getReadiness(sim);

  const readinessItems = [
    ["Gas train", readiness.gasTrain],
    ["Thermal block", readiness.thermalBlock],
    ["Detector chain", readiness.detectorChain],
    ["Injector path", readiness.injectorPath],
  ] as const;

  return (
    <div className="space-y-6">
      <SectionCard title="State Machine" eyebrow="Sequencing">
        <div className="space-y-3">
          {states.map((state) => (
            <div
              key={state}
              className={`rounded-[20px] border px-4 py-3 text-sm ${
                sim.state === state
                  ? "border-sky-200 bg-sky-50 text-sky-900"
                  : "border-stone-200 bg-stone-50/80 text-slate-500"
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                <ListTree className="h-4 w-4" />
                {state}
              </div>
              <div className="mt-2 text-xs leading-5 text-inherit/80">
                {state === "OFF" && "Safe idle. Flows and detector outputs are disabled."}
                {state === "SELF_TEST" && "Short startup validation before gas purge begins."}
                {state === "PURGE" && "Carrier and oxygen lines flush, lamp enters standby, furnace starts heating."}
                {state === "WARMUP" && "Waiting for thermal, gas, optics, and injector permissives."}
                {state === "READY" && "System is stabilized and waiting for RUN authorization."}
                {state === "RUN" && "Injection, furnace, and detector are actively producing process data."}
                {state === "SHUTDOWN" && "Orderly stop sequence with staged heater cool-down."}
                {state === "FAULT" && "Latched protective state. Injection is disabled until reset."}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Readiness Matrix" eyebrow="Permissives">
        <div className="space-y-3">
          {readinessItems.map(([label, ready]) => (
            <div
              key={label}
              className={`rounded-[20px] border px-4 py-3 text-sm ${
                ready
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span>{label}</span>
                <span className="text-xs font-semibold tracking-[0.18em] uppercase">
                  {ready ? "ready" : "hold"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Quality and Load" eyebrow="Health">
        <div className="space-y-4">
          {[
            ["Combustion efficiency", sim.combustionEff * 100, 100, 92, 80, false, "%"],
            ["Moisture carryover", sim.moisturePpm, 600, 140, 280, true, "ppm"],
            ["Soot loading", sim.sootPpm, 140, 15, 40, true, "ppm"],
            ["Total pressure drop", sim.totalDp, 220, 50, 110, true, "mbar"],
          ].map(([label, value, scale, good, warn, reverse, suffix]) => (
            <div key={label as string}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-600">{label}</span>
                <span className={kpiTone(value as number, good as number, warn as number, reverse as boolean)}>
                  {(value as number).toFixed(1)} {suffix as string}
                </span>
              </div>
              <Progress value={clamp(((value as number) / (scale as number)) * 100, 0, 100)} className="h-2" />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Operator Notes" eyebrow="Context">
        <div className="grid gap-3">
          <SmallStat label="Display offset" value={`${sim.furnaceTempOffset.toFixed(1)} degC`} />
          <SmallStat label="Lamp intensity" value={sim.lampIntensity.toFixed(2)} />
          <SmallStat label="Noise index" value={sim.noiseIndex.toFixed(3)} />
        </div>
        <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
          <div className="flex gap-3 rounded-[20px] border border-stone-200 bg-stone-50/80 p-4">
            <Thermometer className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            Furnace control and READY permissives use raw thermal state, while the offset only shifts the displayed temperature.
          </div>
          <div className="flex gap-3 rounded-[20px] border border-stone-200 bg-stone-50/80 p-4">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
            Injection and lamp faults wait through a short RUN grace period so startup transients do not trip the system immediately.
          </div>
          <div className="flex gap-3 rounded-[20px] border border-stone-200 bg-stone-50/80 p-4">
            <Settings2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
            AUTO mode keeps setpoints inside a realistic operating envelope. MANUAL mode allows wider operator ranges.
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
