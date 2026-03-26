"use client";

import React from "react";
import { Atom, Droplets, Filter, Flame, Wind, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RECIPES, SAMPLE_LIBRARY } from "./simulator-engine";
import { getModuleStatuses } from "./derived";
import { FillBar, KeyValue, ModuleTile, SectionCard, StatusBadge } from "./shared";
import { Simulator } from "./types";
import { clamp } from "./utils";

type RecipeName = keyof typeof RECIPES;

function Dial({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-2">
      <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-slate-500">
        <span>{label}</span>
        <span className="font-medium text-slate-800">
          {value.toFixed(step < 1 ? 3 : step < 10 ? 1 : 0)} {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-sky-600"
      />
    </label>
  );
}

function InlineMode({
  value,
  onChange,
}: {
  value: "AUTO" | "MANUAL";
  onChange: (value: "AUTO" | "MANUAL") => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-stone-200 bg-stone-50 p-1">
      {(["AUTO", "MANUAL"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
            value === mode ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-white"
          }`}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}

function HardwareFace({
  label,
  primary,
  secondary,
  accent,
}: {
  label: string;
  primary: string;
  secondary: string;
  accent: string;
}) {
  return (
    <div className="rounded-[22px] border border-stone-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.98)_0%,rgba(226,232,240,0.55)_100%)] p-4">
      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className="mt-3 rounded-[18px] border border-slate-200 bg-slate-950 px-4 py-3 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
        <div className={`font-mono text-2xl font-semibold tracking-[0.12em] ${accent}`}>{primary}</div>
        <div className="mt-1 font-mono text-xs uppercase tracking-[0.28em] text-slate-400">{secondary}</div>
      </div>
    </div>
  );
}

function SyringeAssembly({
  fillPct,
  stage,
  progress,
  sampleName,
}: {
  fillPct: number;
  stage: string;
  progress: number;
  sampleName: string;
}) {
  return (
    <div className="rounded-[24px] border border-stone-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.9)_100%)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Injection assembly</div>
          <div className="mt-1 text-sm font-medium text-slate-900">{sampleName}</div>
        </div>
        <StatusBadge label={stage.replaceAll("_", " ")} status={progress > 0.02 ? "active" : "ready"} />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <div className="flex h-6 w-20 items-center justify-end rounded-l-full rounded-r-md border border-slate-300 bg-slate-200 px-2">
          <div className="h-2 w-10 rounded-full bg-slate-500" />
        </div>
        <div className="relative h-16 flex-1 overflow-hidden rounded-[18px] border-2 border-sky-100 bg-[linear-gradient(180deg,rgba(219,234,254,0.5)_0%,rgba(255,255,255,1)_100%)]">
          <div
            className="absolute inset-y-1 left-1 rounded-[14px] bg-[linear-gradient(90deg,rgba(251,191,36,0.22)_0%,rgba(56,189,248,0.45)_100%)] transition-all"
            style={{ width: `${fillPct}%` }}
          />
          <div
            className="absolute inset-y-0 w-5 rounded-r-[12px] border-l-2 border-slate-500 bg-white/90 shadow-[0_0_18px_rgba(15,23,42,0.12)] transition-all"
            style={{ left: `calc(${fillPct}% - 10px)` }}
          />
        </div>
        <div className="h-7 w-10 rounded-r-full border border-slate-300 bg-slate-200" />
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-slate-500">
          <span>Sample path progress</span>
          <span>{(progress * 100).toFixed(0)}%</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {([
            ["Needle", stage === "INJECTING" || stage === "ARMED"],
            ["Injector", stage === "TRANSFER_TO_FURNACE"],
            ["Furnace", stage === "COMBUSTING"],
            ["Detector", stage === "DETECTING" || stage === "CLEARING"],
          ] as const).map(([label, active]) => (
            <div
              key={label}
              className={`rounded-2xl border px-3 py-2 text-center text-xs font-medium ${
                active ? "border-sky-200 bg-sky-50 text-sky-800" : "border-stone-200 bg-stone-50 text-slate-500"
              }`}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ModulesTab({
  sim,
  setSim,
  recipeName,
  setRecipeName,
}: {
  sim: Simulator;
  setSim: React.Dispatch<React.SetStateAction<Simulator>>;
  recipeName: RecipeName;
  setRecipeName: React.Dispatch<React.SetStateAction<RecipeName>>;
}) {
  const statuses = getModuleStatuses(sim);
  const selectedStandard =
    SAMPLE_LIBRARY.find((item) => item.id === sim.selectedStandardId) ?? SAMPLE_LIBRARY[0];
  const activeSampleName =
    SAMPLE_LIBRARY.find((item) => item.id === (sim.activeStandardId || sim.selectedStandardId))?.name ??
    selectedStandard.name;

  const applyRecipe = () => {
    const recipe = RECIPES[recipeName];
    setSim((prev) => ({
      ...prev,
      arSp: recipe.arSp,
      o2aSp: recipe.o2aSp,
      o2bSp: recipe.o2bSp,
      injSp: recipe.injSp,
      furnaceSp: recipe.furnaceSp,
      pmtHvSp: recipe.pmtHvSp,
    }));
  };

  const queueShot = () =>
    setSim((prev) => ({
      ...prev,
      sampleShotRequested: true,
      autoRunRequested: prev.state === "READY" ? true : prev.autoRunRequested,
    }));

  const refillSyringe = () =>
    setSim((prev) => ({
      ...prev,
      syringeReservoirUl: prev.syringeCapacityUl,
    }));

  const resetCleanup = () =>
    setSim((prev) => ({
      ...prev,
      scrubberSat: Math.max(0, prev.scrubberSat - 0.35),
      permapureSat: Math.max(0, prev.permapureSat - 0.35),
      filterSat: Math.max(0, prev.filterSat - 0.45),
      forcedFilterClog: false,
    }));

  const cleanOptics = () =>
    setSim((prev) => ({
      ...prev,
      opticsCleanliness: clamp(prev.opticsCleanliness + 0.1, 0.6, 1),
      forcedLampAged: false,
      lampAging: Math.max(0, prev.lampAging - 0.08),
    }));

  return (
    <div className="space-y-4">
      <SectionCard title="Integrated module console" eyebrow="Each module is controllable in place">
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-2">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Operating recipe</div>
              <select
                value={recipeName}
                onChange={(event) => setRecipeName(event.target.value as RecipeName)}
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300"
              >
                {Object.keys(RECIPES).map((recipeKey) => (
                  <option key={recipeKey} value={recipeKey}>
                    {recipeKey}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <Button
                onClick={applyRecipe}
                variant="secondary"
                className="w-full rounded-2xl border border-stone-300 bg-white text-slate-900 hover:bg-stone-50"
              >
                Apply recipe
              </Button>
            </div>
            <div className="rounded-[22px] border border-stone-200 bg-stone-50/80 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Current sample</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">{selectedStandard.name}</div>
              <div className="mt-1 text-sm text-slate-600">
                Expected {selectedStandard.expectedPpm.toFixed(1)} ppm
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[22px] border border-stone-200 bg-sky-50/80 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-sky-700/70">Measured now</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">
                {sim.measuredConcentrationPpm.toFixed(2)}
              </div>
              <div className="mt-1 text-sm text-slate-600">ppm calculated from live response</div>
            </div>
            <div className="rounded-[22px] border border-stone-200 bg-emerald-50/80 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-emerald-700/70">Live response</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{sim.detectorFiltered.toFixed(4)}</div>
              <div className="mt-1 text-sm text-slate-600">AU filtered detector output</div>
            </div>
            <div className="rounded-[22px] border border-stone-200 bg-amber-50/80 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-amber-700/70">Shot progress</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">
                {sim.injShotRemainingUl > 0
                  ? `${Math.max(0, sim.injShotVolumeUl - sim.injShotRemainingUl).toFixed(0)} / ${sim.injShotVolumeUl.toFixed(0)}`
                  : "Idle"}
              </div>
              <div className="mt-1 text-sm text-slate-600">uL delivered during active injection</div>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        <ModuleTile title="Argon MFC" icon={Wind} status={statuses.ar}>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <HardwareFace
                label="Flow controller"
                primary={sim.arPv.toFixed(3)}
                secondary="L/min actual"
                accent="text-sky-300"
              />
              <InlineMode
                value={sim.arMode}
                onChange={(value) => setSim((prev) => ({ ...prev, arMode: value }))}
              />
            </div>
            <Dial
              label="Setpoint"
              value={sim.arSp}
              min={sim.arMode === "AUTO" ? 0.15 : 0}
              max={sim.arMode === "AUTO" ? 0.65 : 1}
              step={0.005}
              suffix="L/min"
              onChange={(value) => setSim((prev) => ({ ...prev, arSp: value }))}
            />
            <KeyValue a="Supply pressure" b={`${sim.arUpstreamBar.toFixed(2)} bar`} />
            <KeyValue a="Downstream" b={`${sim.arDownstreamBar.toFixed(2)} bar`} />
            <FillBar value={sim.arPv} max={1} />
          </div>
        </ModuleTile>

        <ModuleTile title="Oxygen MFC-A" icon={Wind} status={statuses.o2a}>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <HardwareFace
                label="Flow controller"
                primary={sim.o2aPv.toFixed(3)}
                secondary="L/min actual"
                accent="text-cyan-300"
              />
              <InlineMode
                value={sim.o2aMode}
                onChange={(value) => setSim((prev) => ({ ...prev, o2aMode: value }))}
              />
            </div>
            <Dial
              label="Setpoint"
              value={sim.o2aSp}
              min={sim.o2aMode === "AUTO" ? 0.05 : 0}
              max={sim.o2aMode === "AUTO" ? 0.28 : 0.4}
              step={0.005}
              suffix="L/min"
              onChange={(value) => setSim((prev) => ({ ...prev, o2aSp: value }))}
            />
            <KeyValue
              a="Contribution"
              b={`${((sim.o2aPv / Math.max(sim.o2aPv + sim.o2bPv, 0.001)) * 100).toFixed(1)} %`}
            />
            <KeyValue a="Valve status" b={sim.o2aPv > 0.03 ? "Open and regulating" : "Nearly closed"} />
            <FillBar value={sim.o2aPv} max={0.4} />
          </div>
        </ModuleTile>

        <ModuleTile title="Oxygen MFC-B" icon={Wind} status={statuses.o2b}>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <HardwareFace
                label="Flow controller"
                primary={sim.o2bPv.toFixed(3)}
                secondary="L/min actual"
                accent="text-cyan-300"
              />
              <InlineMode
                value={sim.o2bMode}
                onChange={(value) => setSim((prev) => ({ ...prev, o2bMode: value }))}
              />
            </div>
            <Dial
              label="Setpoint"
              value={sim.o2bSp}
              min={sim.o2bMode === "AUTO" ? 0.03 : 0}
              max={sim.o2bMode === "AUTO" ? 0.22 : 0.4}
              step={0.005}
              suffix="L/min"
              onChange={(value) => setSim((prev) => ({ ...prev, o2bSp: value }))}
            />
            <KeyValue
              a="Contribution"
              b={`${((sim.o2bPv / Math.max(sim.o2aPv + sim.o2bPv, 0.001)) * 100).toFixed(1)} %`}
            />
            <KeyValue a="Valve status" b={sim.o2bPv > 0.03 ? "Open and regulating" : "Nearly closed"} />
            <FillBar value={sim.o2bPv} max={0.4} />
          </div>
        </ModuleTile>

        <ModuleTile title="Syringe / Injector" icon={Droplets} status={statuses.inj}>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <SyringeAssembly
                  fillPct={(sim.syringeReservoirUl / Math.max(sim.syringeCapacityUl, 1)) * 100}
                  stage={sim.sampleStage}
                  progress={sim.sampleStageProgress}
                  sampleName={activeSampleName}
                />
              </div>
              <InlineMode
                value={sim.injMode}
                onChange={(value) =>
                  setSim((prev) => ({
                    ...prev,
                    injMode: value,
                    manualPushActive: value === "MANUAL" ? prev.manualPushActive : false,
                  }))
                }
              />
            </div>

            <label className="block space-y-2">
              <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                <span>Sample standard</span>
                <span className="font-medium text-slate-800">{selectedStandard.kind}</span>
              </div>
              <select
                value={sim.selectedStandardId}
                onChange={(event) =>
                  setSim((prev) => ({
                    ...prev,
                    selectedStandardId: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300"
              >
                {SAMPLE_LIBRARY.map((standard) => (
                  <option key={standard.id} value={standard.id}>
                    {standard.name}
                  </option>
                ))}
              </select>
            </label>

            <Dial
              label="Injection speed"
              value={sim.injSp}
              min={sim.injMode === "AUTO" ? 20 : 0}
              max={sim.injMode === "AUTO" ? 220 : 260}
              step={1}
              suffix="uL/min"
              onChange={(value) => setSim((prev) => ({ ...prev, injSp: value }))}
            />
            <Dial
              label="Shot volume"
              value={sim.injShotVolumeUl}
              min={10}
              max={1500}
              step={10}
              suffix="uL"
              onChange={(value) => setSim((prev) => ({ ...prev, injShotVolumeUl: value }))}
            />
            <Dial
              label="Syringe capacity"
              value={sim.syringeCapacityUl}
              min={500}
              max={20000}
              step={100}
              suffix="uL"
              onChange={(value) =>
                setSim((prev) => ({
                  ...prev,
                  syringeCapacityUl: value,
                  syringeReservoirUl: Math.min(prev.syringeReservoirUl, value),
                }))
              }
            />

            {sim.injMode === "MANUAL" ? (
              <div className="rounded-[22px] border border-amber-200 bg-amber-50/60 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-amber-700/70">Manual plunger</div>
                <div className="mt-3 space-y-3">
                  <Dial
                    label="Hand force"
                    value={sim.manualPushForce * 100}
                    min={5}
                    max={100}
                    step={1}
                    suffix="%"
                    onChange={(value) =>
                      setSim((prev) => ({
                        ...prev,
                        manualPushForce: value / 100,
                      }))
                    }
                  />
                  <button
                    type="button"
                    onPointerDown={() => setSim((prev) => ({ ...prev, manualPushActive: true }))}
                    onPointerUp={() => setSim((prev) => ({ ...prev, manualPushActive: false }))}
                    onPointerLeave={() => setSim((prev) => ({ ...prev, manualPushActive: false }))}
                    onPointerCancel={() => setSim((prev) => ({ ...prev, manualPushActive: false }))}
                    className={`w-full rounded-[22px] px-4 py-4 text-sm font-semibold transition ${
                      sim.manualPushActive
                        ? "bg-amber-600 text-white shadow-[0_16px_40px_rgba(217,119,6,0.22)]"
                        : "bg-white text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100"
                    }`}
                  >
                    {sim.manualPushActive ? "Plunger pressed" : "Press and hold plunger"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  onClick={queueShot}
                  className="rounded-2xl bg-amber-500 text-white hover:bg-amber-600"
                  disabled={sim.injShotRemainingUl > 0}
                >
                  Queue programmed shot
                </Button>
                <Button
                  onClick={refillSyringe}
                  variant="secondary"
                  className="rounded-2xl border border-stone-300 bg-white text-slate-900 hover:bg-stone-50"
                >
                  Refill syringe
                </Button>
              </div>
            )}

            {sim.injMode === "MANUAL" ? (
              <Button
                onClick={refillSyringe}
                variant="secondary"
                className="rounded-2xl border border-stone-300 bg-white text-slate-900 hover:bg-stone-50"
              >
                Refill syringe
              </Button>
            ) : null}

            <KeyValue a="Reservoir" b={`${sim.syringeReservoirUl.toFixed(0)} / ${sim.syringeCapacityUl.toFixed(0)} uL`} />
            <KeyValue a="Sample stage" b={sim.sampleStage.replaceAll("_", " ")} />
            <KeyValue a="Shot pending" b={sim.sampleShotRequested ? "Queued" : "No"} />
            <KeyValue a="In injector" b={`${sim.samplePlugInletUl.toFixed(1)} uL`} />
            <KeyValue a="In furnace" b={`${sim.samplePlugFurnaceUl.toFixed(1)} uL`} />
            <KeyValue a="At detector" b={`${sim.samplePlugDetectorUl.toFixed(1)} uL`} />
            <KeyValue a="Active sample" b={selectedStandard.notes} />
            <FillBar value={sim.syringeReservoirUl} max={Math.max(sim.syringeCapacityUl, 1)} />
          </div>
        </ModuleTile>

        <ModuleTile title="Furnace / Quartz Tube" icon={Flame} status={statuses.furnace}>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <HardwareFace
                label="Thermal block"
                primary={sim.furnacePvCalibrated.toFixed(1)}
                secondary="degC displayed"
                accent="text-orange-300"
              />
              <InlineMode
                value={sim.furnaceMode}
                onChange={(value) => setSim((prev) => ({ ...prev, furnaceMode: value }))}
              />
            </div>
            <Dial
              label="Temperature setpoint"
              value={sim.furnaceSp}
              min={sim.furnaceMode === "AUTO" ? 760 : 400}
              max={sim.furnaceMode === "AUTO" ? 980 : 1050}
              step={5}
              suffix="degC"
              onChange={(value) => setSim((prev) => ({ ...prev, furnaceSp: value }))}
            />
            <Dial
              label="Display offset"
              value={sim.furnaceTempOffset}
              min={-120}
              max={120}
              step={1}
              suffix="degC"
              onChange={(value) => setSim((prev) => ({ ...prev, furnaceTempOffset: value }))}
            />
            <Dial
              label="Thermal boost"
              value={sim.thermalBoost}
              min={0.85}
              max={2.4}
              step={0.01}
              suffix="x"
              onChange={(value) => setSim((prev) => ({ ...prev, thermalBoost: value }))}
            />
            <KeyValue a="Raw thermocouple" b={`${sim.furnacePv.toFixed(1)} degC`} />
            <KeyValue a="SSR train" b={`SSR1 ${sim.ssr1 ? "ON" : "OFF"} / SSR2 ${sim.ssr2 ? "ON" : "OFF"}`} />
            <FillBar value={sim.heaterDuty * 100} max={100} />
          </div>
        </ModuleTile>

        <ModuleTile title="Lamp / PMT Detector" icon={Atom} status={statuses.detector}>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <HardwareFace
                label="Optical detector"
                primary={sim.detectorFiltered.toFixed(4)}
                secondary="AU filtered"
                accent="text-emerald-300"
              />
              <StatusBadge label={sim.lampMode} status={statuses.lamp} />
            </div>
            <Dial
              label="PMT high voltage"
              value={sim.pmtHvSp}
              min={0}
              max={650}
              step={5}
              suffix="V"
              onChange={(value) => setSim((prev) => ({ ...prev, pmtHvSp: value }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                onClick={cleanOptics}
                variant="secondary"
                className="rounded-2xl border border-stone-300 bg-white text-slate-900 hover:bg-stone-50"
              >
                Clean optics
              </Button>
              <Button
                onClick={() =>
                  setSim((prev) => ({
                    ...prev,
                    lampAging: 0,
                    forcedLampAged: false,
                  }))
                }
                variant="secondary"
                className="rounded-2xl border border-stone-300 bg-white text-slate-900 hover:bg-stone-50"
              >
                Reset lamp age
              </Button>
            </div>
            <KeyValue a="Lamp frequency" b={`${sim.lampFreqHz.toFixed(1)} Hz`} />
            <KeyValue a="Lamp intensity" b={`${(sim.lampIntensity * 100).toFixed(1)} %`} />
            <KeyValue a="Measured concentration" b={`${sim.measuredConcentrationPpm.toFixed(2)} ppm`} />
            <KeyValue a="PMT gain" b={`${sim.pmtGain.toFixed(1)} x`} />
          </div>
        </ModuleTile>

        <ModuleTile title="Cleanup Train" icon={Filter} status={statuses.filter}>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <HardwareFace
                label="Differential pressure"
                primary={sim.totalDp.toFixed(1)}
                secondary="mbar total"
                accent="text-rose-300"
              />
              <div className="rounded-[22px] border border-stone-200 bg-stone-50/90 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                  <Zap className="h-4 w-4 text-emerald-700" />
                  Service actions
                </div>
                <div className="mt-4 grid gap-3">
                  <Button
                    onClick={resetCleanup}
                    variant="secondary"
                    className="rounded-2xl border border-stone-300 bg-white text-slate-900 hover:bg-stone-50"
                  >
                    Regenerate train
                  </Button>
                </div>
              </div>
            </div>
            <KeyValue a="Scrubber load" b={`${(sim.scrubberSat * 100).toFixed(1)} %`} />
            <KeyValue a="Dryer load" b={`${(sim.permapureSat * 100).toFixed(1)} %`} />
            <KeyValue a="Filter load" b={`${(sim.filterSat * 100).toFixed(1)} %`} />
            <KeyValue a="Pressure split" b={`${sim.scrubberDp.toFixed(1)} / ${sim.permapureDp.toFixed(1)} / ${sim.filterDp.toFixed(1)} mbar`} />
            <FillBar value={sim.totalDp} max={220} />
          </div>
        </ModuleTile>
      </div>
    </div>
  );
}
