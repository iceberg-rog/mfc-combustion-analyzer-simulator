"use client";

import React from "react";
import { getModuleStatuses } from "./derived";
import { SectionCard, SmallStat, StatusBadge } from "./shared";
import { ModuleStatus, Simulator } from "./types";

function ProcessNode({
  title,
  subtitle,
  status,
  accent,
}: {
  title: string;
  subtitle: string;
  status: ModuleStatus;
  accent: string;
}) {
  return (
    <div className={`rounded-[24px] border bg-white/90 p-5 ${accent}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
        </div>
        <StatusBadge label={status} status={status} />
      </div>
    </div>
  );
}

function FlowLine({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-stone-200">
        <div className={`h-full rounded-full transition-all ${active ? "w-full bg-sky-600" : "w-1/3 bg-stone-400"}`} />
      </div>
      <span className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</span>
    </div>
  );
}

export function ProcessTab({ sim }: { sim: Simulator }) {
  const statuses = getModuleStatuses(sim);

  return (
    <SectionCard title="Process mimic" eyebrow="Flow and treatment train">
      <div className="grid gap-4 2xl:grid-cols-[0.95fr_1.1fr_0.95fr]">
        <div className="space-y-3">
          <ProcessNode title="Argon MFC" subtitle={`SP ${sim.arSp.toFixed(3)} / PV ${sim.arPv.toFixed(3)} L/min`} status={statuses.ar} accent="border-sky-400/20" />
          <ProcessNode title="Oxygen MFC-A" subtitle={`SP ${sim.o2aSp.toFixed(3)} / PV ${sim.o2aPv.toFixed(3)} L/min`} status={statuses.o2a} accent="border-cyan-400/20" />
          <ProcessNode title="Oxygen MFC-B" subtitle={`SP ${sim.o2bSp.toFixed(3)} / PV ${sim.o2bPv.toFixed(3)} L/min`} status={statuses.o2b} accent="border-cyan-400/20" />
          <ProcessNode title="Injector" subtitle={`SP ${sim.injSp.toFixed(1)} / PV ${sim.injPv.toFixed(1)} uL/min`} status={statuses.inj} accent="border-amber-400/20" />
        </div>

        <div className="space-y-4 rounded-[28px] border border-stone-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(244,240,232,0.9)_100%)] p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <SmallStat label="State" value={sim.state} emphasis />
            <SmallStat label="Lamp" value={`${sim.lampMode} / ${sim.lampIntensity.toFixed(2)}`} />
            <SmallStat label="Detector" value={sim.detectorFiltered.toFixed(4)} />
            <SmallStat label="Total dP" value={`${sim.totalDp.toFixed(1)} mbar`} />
          </div>

          <div className="space-y-3">
            <FlowLine active={sim.arPv > 0.08} label="argon" />
            <FlowLine active={sim.o2aPv > 0.03} label="oxygen-a" />
            <FlowLine active={sim.o2bPv > 0.03} label="oxygen-b" />
            <FlowLine active={sim.injPv > 1} label="sample" />
            <FlowLine active={sim.state !== "OFF"} label="cleanup" />
            <FlowLine active={sim.lampMode !== "OFF"} label="optics" />
          </div>

          <div className="rounded-[24px] border border-orange-200 bg-orange-50/80 p-5">
            <div className="text-sm font-semibold text-slate-900">Furnace and quartz tube</div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <SmallStat label="Displayed temp" value={`${sim.furnacePvCalibrated.toFixed(1)} degC`} />
              <SmallStat label="Raw temp" value={`${sim.furnacePv.toFixed(1)} degC`} />
              <SmallStat label="Heater duty" value={`${(sim.heaterDuty * 100).toFixed(1)} %`} />
            </div>
            <div className="mt-4">
              <StatusBadge label="furnace" status={statuses.furnace} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <ProcessNode title="Scrubber" subtitle={`Sat ${(sim.scrubberSat * 100).toFixed(1)}% / dP ${sim.scrubberDp.toFixed(1)} mbar`} status={statuses.scrubber} accent="border-emerald-400/20" />
          <ProcessNode title="Dryer" subtitle={`Sat ${(sim.permapureSat * 100).toFixed(1)}% / dP ${sim.permapureDp.toFixed(1)} mbar`} status={statuses.dryer} accent="border-emerald-400/20" />
          <ProcessNode title="Particle filter" subtitle={`Load ${(sim.filterSat * 100).toFixed(1)}% / dP ${sim.filterDp.toFixed(1)} mbar`} status={statuses.filter} accent="border-rose-400/20" />
          <ProcessNode title="Lamp head" subtitle={`${sim.lampMode} / ${sim.lampFreqHz.toFixed(1)} Hz`} status={statuses.lamp} accent="border-amber-400/20" />
          <ProcessNode title="PMT detector" subtitle={`HV ${sim.pmtHvPv.toFixed(0)} V / Gain ${sim.pmtGain.toFixed(1)}x`} status={statuses.detector} accent="border-sky-400/20" />
        </div>
      </div>
    </SectionCard>
  );
}
