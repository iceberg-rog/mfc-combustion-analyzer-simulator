"use client";

import React from "react";
import { Droplets, Flame, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "./shared";
import { ControlMode, Simulator } from "./types";

export function ModesTab({
  sim,
  setSim,
}: {
  sim: Simulator;
  setSim: React.Dispatch<React.SetStateAction<Simulator>>;
}) {
  const modes: Array<[
    string,
    string,
    ControlMode,
    (value: ControlMode) => void,
    React.ComponentType<{ className?: string }>
  ]> = [
    ["Argon control", "AUTO keeps purge and run setpoints inside the normal gas envelope.", sim.arMode, (value) => setSim((prev) => ({ ...prev, arMode: value })), Wind],
    ["Oxygen-A control", "AUTO protects oxidizer permissives during startup and purge.", sim.o2aMode, (value) => setSim((prev) => ({ ...prev, o2aMode: value })), Wind],
    ["Oxygen-B control", "AUTO maintains the secondary oxygen leg in a realistic range.", sim.o2bMode, (value) => setSim((prev) => ({ ...prev, o2bMode: value })), Wind],
    ["Injector control", "MANUAL allows wider injection setpoints for stress testing the detector chain.", sim.injMode, (value) => setSim((prev) => ({ ...prev, injMode: value })), Droplets],
    ["Furnace control", "AUTO uses the tighter thermal envelope and more aggressive PI tuning.", sim.furnaceMode, (value) => setSim((prev) => ({ ...prev, furnaceMode: value })), Flame],
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {modes.map(([label, description, mode, setter, Icon]) => (
        <SectionCard
          key={label}
          title={label}
          eyebrow="Mode"
          action={
            <Badge className="border border-stone-200 bg-stone-50 px-3 py-1.5 text-slate-700">
              {mode}
            </Badge>
          }
        >
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
              <Icon className="h-5 w-5 text-sky-700" />
            </div>
            <p className="text-sm leading-6 text-slate-600">{description}</p>
          </div>

          <div className="mt-5 flex gap-2">
            <Button
              variant={mode === "AUTO" ? "default" : "secondary"}
              onClick={() => setter("AUTO")}
              className={`rounded-2xl ${
                mode === "AUTO"
                  ? "bg-sky-600 text-white hover:bg-sky-700"
                  : "border border-stone-300 bg-white text-slate-800 hover:bg-stone-50"
              }`}
            >
              AUTO
            </Button>
            <Button
              variant={mode === "MANUAL" ? "default" : "secondary"}
              onClick={() => setter("MANUAL")}
              className={`rounded-2xl ${
                mode === "MANUAL"
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : "border border-stone-300 bg-white text-slate-800 hover:bg-stone-50"
              }`}
            >
              MANUAL
            </Button>
          </div>
        </SectionCard>
      ))}
    </div>
  );
}
