"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { SectionCard } from "./shared";
import { Simulator } from "./types";

export function FaultsTab({
  sim,
  setSim,
}: {
  sim: Simulator;
  setSim: React.Dispatch<React.SetStateAction<Simulator>>;
}) {
  const faults = [
    ["Injector clog", "Blocks sample feed during RUN.", sim.injectorClogged, (value: boolean) => setSim((prev) => ({ ...prev, injectorClogged: value }))],
    ["Heater or SSR failure", "Removes effective thermal power from the furnace model.", sim.forcedHeaterFail, (value: boolean) => setSim((prev) => ({ ...prev, forcedHeaterFail: value }))],
    ["Lamp aging", "Accelerates source degradation and reduces detector headroom.", sim.forcedLampAged, (value: boolean) => setSim((prev) => ({ ...prev, forcedLampAged: value }))],
    ["Low gas pressure", "Drops argon supply pressure and can trip a hard fault.", sim.forcedLowPressure, (value: boolean) => setSim((prev) => ({ ...prev, forcedLowPressure: value }))],
    ["Filter clogging", "Forces rapid pressure-drop growth across the cleanup train.", sim.forcedFilterClog, (value: boolean) => setSim((prev) => ({ ...prev, forcedFilterClog: value }))],
  ] as const;

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <SectionCard title="Fault injection" eyebrow="Stress scenarios">
        <div className="space-y-4">
          {faults.map(([title, description, value, setter]) => (
            <div key={title} className="flex items-center justify-between gap-4 rounded-[22px] border border-stone-200 bg-stone-50/80 p-4">
              <div>
                <div className="font-medium text-slate-900">{title}</div>
                <div className="mt-1 text-sm text-slate-500">{description}</div>
              </div>
              <Switch checked={value} onCheckedChange={setter} />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Active alarms" eyebrow="Protection layer">
        <ScrollArea className="h-[380px] pr-4">
          <div className="space-y-3">
            {sim.alarms.length === 0 ? (
              <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                No active alarms.
              </div>
            ) : (
              sim.alarms.map((alarm) => (
                <div
                  key={alarm.code}
                  className={`rounded-[22px] border p-4 ${
                    alarm.severity === "FAULT"
                      ? "border-rose-200 bg-rose-50"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className={`mt-0.5 h-4 w-4 ${
                        alarm.severity === "FAULT" ? "text-rose-600" : "text-amber-600"
                      }`}
                    />
                    <div>
                      <div className="font-medium text-slate-900">{alarm.code}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-700">{alarm.text}</div>
                      <div className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">
                        {alarm.severity}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SectionCard>
    </div>
  );
}
