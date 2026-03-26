"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createInitialSimulator,
  RECIPES,
  runSimulatorStep,
} from "@/components/simulator/simulator-engine";
import { clamp } from "@/components/simulator/utils";
import { Simulator } from "@/components/simulator/types";
import { TopBar } from "@/components/simulator/top-bar";
import { SidebarPanel } from "@/components/simulator/sidebar";
import { OverviewTab } from "@/components/simulator/overview-tab";
import { ProcessTab } from "@/components/simulator/process-tab";
import { ModulesTab } from "@/components/simulator/modules-tab";
import { TrendsTab } from "@/components/simulator/trends-tab";
import { FaultsTab } from "@/components/simulator/faults-tab";
import { CalibrationTab } from "@/components/simulator/calibration-tab";
import { ResultsTab } from "@/components/simulator/results-tab";

const TABS = [
  ["overview", "Overview"],
  ["process", "Process"],
  ["modules", "Modules"],
  ["trends", "Trends"],
  ["calibration", "Calibration"],
  ["results", "Results"],
  ["faults", "Faults"],
] as const;

export default function Page() {
  const [sim, setSim] = useState<Simulator>(createInitialSimulator());
  const [recipeName, setRecipeName] = useState<keyof typeof RECIPES>("standard");

  const frameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);

  useEffect(() => {
    const loop = (ts: number) => {
      if (lastTickRef.current == null) lastTickRef.current = ts;
      const dt = clamp((ts - lastTickRef.current) / 1000, 0.016, 0.08);
      lastTickRef.current = ts;
      setSim((prev) => runSimulatorStep(prev, dt));
      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const faultCount = useMemo(
    () => sim.alarms.filter((alarm) => alarm.severity === "FAULT").length,
    [sim.alarms]
  );
  const warningCount = sim.alarms.length - faultCount;

  const startSequence = () =>
    setSim((prev) => {
      if (prev.state === "OFF" || prev.state === "FAULT") {
        return {
          ...prev,
          state: "SELF_TEST",
          stateTimer: 0,
          autoRunRequested: false,
        };
      }
      return prev;
    });

  const goRun = () =>
    setSim((prev) => {
      if (prev.state === "READY") return { ...prev, autoRunRequested: true };
      if (prev.state === "OFF" || prev.state === "FAULT") {
        return {
          ...prev,
          state: "SELF_TEST",
          stateTimer: 0,
          autoRunRequested: true,
        };
      }
      return prev;
    });

  const purge = () =>
    setSim((prev) => {
      if (prev.state === "SHUTDOWN") return prev;
      return {
        ...prev,
        state: "PURGE",
        stateTimer: 0,
        autoRunRequested: false,
      };
    });

  const shutdown = () =>
    setSim((prev) => ({
      ...prev,
      state: "SHUTDOWN",
      stateTimer: 0,
      autoRunRequested: false,
    }));

  const resetFault = () =>
    setSim((prev) => ({
      ...prev,
      state: prev.state === "FAULT" ? "PURGE" : prev.state,
      stateTimer: 0,
      activeStandardId: "",
      injShotRemainingUl: 0,
      sampleShotRequested: false,
      manualPushActive: false,
      sampleStage: "IDLE",
      sampleStageProgress: 0,
      samplePlugInletUl: 0,
      samplePlugFurnaceUl: 0,
      samplePlugDetectorUl: 0,
      injectorClogged: false,
      forcedHeaterFail: false,
      forcedLampAged: false,
      forcedLowPressure: false,
      forcedFilterClog: false,
      autoRunRequested: false,
    }));

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-[1840px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <TopBar
          sim={sim}
          faultCount={faultCount}
          warningCount={warningCount}
          onColdStart={startSequence}
          onRun={goRun}
          onPurge={purge}
          onShutdown={shutdown}
          onReset={resetFault}
        />

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex w-full flex-nowrap gap-2 overflow-x-auto rounded-[30px] border border-stone-200 bg-white/90 p-2 shadow-[0_18px_70px_rgba(148,163,184,0.12)] backdrop-blur">
            {TABS.map(([value, label]) => (
              <TabsTrigger
                key={value}
                value={value}
                className="min-w-fit rounded-2xl border border-transparent px-4 py-2.5 text-sm text-slate-500 data-active:border-sky-200 data-active:bg-sky-600 data-active:text-white"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_380px]">
            <div className="space-y-6">
              <TabsContent value="overview" className="mt-0">
                <OverviewTab sim={sim} />
              </TabsContent>

              <TabsContent value="process" className="mt-0">
                <ProcessTab sim={sim} />
              </TabsContent>

              <TabsContent value="modules" className="mt-0">
                <ModulesTab
                  sim={sim}
                  setSim={setSim}
                  recipeName={recipeName}
                  setRecipeName={setRecipeName}
                />
              </TabsContent>

              <TabsContent value="trends" className="mt-0">
                <TrendsTab sim={sim} />
              </TabsContent>

              <TabsContent value="calibration" className="mt-0">
                <CalibrationTab sim={sim} setSim={setSim} />
              </TabsContent>

              <TabsContent value="results" className="mt-0">
                <ResultsTab sim={sim} />
              </TabsContent>

              <TabsContent value="faults" className="mt-0">
                <FaultsTab sim={sim} setSim={setSim} />
              </TabsContent>
            </div>

            <div className="xl:sticky xl:top-6 xl:self-start">
              <SidebarPanel sim={sim} />
            </div>
          </div>
        </Tabs>
      </div>
    </main>
  );
}
