"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RECIPES } from "./simulator-engine";
import { SectionCard, SmallStat } from "./shared";
import { Simulator } from "./types";
import { clamp, formatSigned, sanitizeNumber } from "./utils";

export function ControlTab({
  sim,
  setSim,
  recipeName,
  setRecipeName,
}: {
  sim: Simulator;
  setSim: React.Dispatch<React.SetStateAction<Simulator>>;
  recipeName: keyof typeof RECIPES;
  setRecipeName: (recipe: keyof typeof RECIPES) => void;
}) {
  const applyRecipe = (name: keyof typeof RECIPES) => {
    const recipe = RECIPES[name];
    setRecipeName(name);
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

  const numberField = (
    label: string,
    value: number,
    unit: string,
    setter: (value: number) => void,
    min: number,
    max: number,
    step = 0.01
  ) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <Input
          type="number"
          value={value}
          step={step}
          onChange={(event) =>
            setter(clamp(sanitizeNumber(event.target.value, value), min, max))
          }
          className="h-11 border-stone-300 bg-white pr-20 text-slate-900"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
          {unit}
        </span>
      </div>
    </div>
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
      <SectionCard title="Method and setpoints" eyebrow="Control surface">
        <div className="flex flex-wrap gap-3">
          {(["standard", "fast", "gentle"] as Array<keyof typeof RECIPES>).map((name) => (
            <Button
              key={name}
              variant={recipeName === name ? "default" : "secondary"}
              onClick={() => applyRecipe(name)}
              className={`rounded-2xl capitalize ${
                recipeName === name
                  ? "bg-sky-600 text-white hover:bg-sky-700"
                  : "border border-stone-300 bg-white text-slate-800 hover:bg-stone-50"
              }`}
            >
              {name}
            </Button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {numberField("Argon setpoint", sim.arSp, "L/min", (value) => setSim((prev) => ({ ...prev, arSp: value })), 0, 1, 0.01)}
          {numberField("O2-A setpoint", sim.o2aSp, "L/min", (value) => setSim((prev) => ({ ...prev, o2aSp: value })), 0, 0.4, 0.01)}
          {numberField("O2-B setpoint", sim.o2bSp, "L/min", (value) => setSim((prev) => ({ ...prev, o2bSp: value })), 0, 0.4, 0.01)}
          {numberField("Injection setpoint", sim.injSp, "uL/min", (value) => setSim((prev) => ({ ...prev, injSp: value })), 0, 260, 1)}
          {numberField("Furnace setpoint", sim.furnaceSp, "degC", (value) => setSim((prev) => ({ ...prev, furnaceSp: value })), 400, 1050, 1)}
          {numberField("Display offset", sim.furnaceTempOffset, "degC", (value) => setSim((prev) => ({ ...prev, furnaceTempOffset: value })), -120, 120, 0.5)}
          {numberField("PMT HV setpoint", sim.pmtHvSp, "V", (value) => setSim((prev) => ({ ...prev, pmtHvSp: value })), 0, 650, 1)}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <SmallStat label="Raw furnace" value={`${sim.furnacePv.toFixed(1)} degC`} />
          <SmallStat label="Displayed furnace" value={`${sim.furnacePvCalibrated.toFixed(1)} degC`} />
          <SmallStat label="Offset" value={`${formatSigned(sim.furnaceTempOffset, 1)} degC`} />
        </div>
      </SectionCard>

      <SectionCard title="Dynamic tuning" eyebrow="Thermal response">
        <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
          Furnace control is now decoupled from the display offset. READY permissives and alarms use raw thermal state.
        </div>

        <div className="mt-5 flex items-center justify-between rounded-[22px] border border-stone-200 bg-stone-50/80 p-4">
          <div>
            <div className="text-sm font-medium text-slate-800">Aggressive warmup</div>
            <div className="text-xs text-slate-500">Adds heater bias while the furnace is far below target.</div>
          </div>
          <Switch
            checked={sim.warmupAggressive}
            onCheckedChange={(checked) => setSim((prev) => ({ ...prev, warmupAggressive: checked }))}
          />
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Thermal boost</span>
            <span>{sim.thermalBoost.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min={0.85}
            max={2.4}
            step={0.01}
            value={sim.thermalBoost}
            onChange={(event) =>
              setSim((prev) => ({
                ...prev,
                thermalBoost: clamp(sanitizeNumber(event.target.value, prev.thermalBoost), 0.85, 2.4),
              }))
            }
            className="w-full accent-sky-600"
          />
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <SmallStat label="Warmup margin" value={`${Math.max(0, sim.furnaceSp - sim.furnacePv).toFixed(1)} degC`} />
          <SmallStat label="Heater duty" value={`${(sim.heaterDuty * 100).toFixed(1)} %`} />
          <SmallStat
            label="Ramp quality"
            value={
              sim.furnacePv >= sim.furnaceSp - 15
                ? "Locked"
                : sim.furnacePv >= sim.furnaceSp - 60
                  ? "Approaching"
                  : "Heating"
            }
          />
        </div>
      </SectionCard>
    </div>
  );
}
