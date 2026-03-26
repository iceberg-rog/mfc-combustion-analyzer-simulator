"use client";

import React from "react";
import { getTotalO2 } from "./derived";
import { GaugeWidget, MetricCard, SectionCard, SmallStat } from "./shared";
import { Simulator } from "./types";

export function OverviewTab({ sim }: { sim: Simulator }) {
  const totalO2 = getTotalO2(sim);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <MetricCard label="Furnace raw" value={sim.furnacePv.toFixed(1)} unit="degC" helper={`Displayed ${sim.furnacePvCalibrated.toFixed(1)} degC`} />
        <MetricCard label="Detector signal" value={sim.detectorFiltered.toFixed(4)} unit="AU" helper={`Noise ${sim.noiseIndex.toFixed(3)}`} />
        <MetricCard label="Measured concentration" value={sim.measuredConcentrationPpm.toFixed(2)} unit="ppm" helper={`Live response ${sim.liveResponseAu.toFixed(4)} AU`} />
        <MetricCard label="Total oxygen" value={totalO2.toFixed(3)} unit="L/min" helper={`Ar ${sim.arPv.toFixed(3)} L/min`} />
        <MetricCard label="PMT gain" value={sim.pmtGain.toFixed(1)} unit="x" helper={`HV ${sim.pmtHvPv.toFixed(0)} V`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <GaugeWidget label="Heater duty" value={sim.heaterDuty * 100} max={100} suffix="%" color="#38bdf8" />
        <GaugeWidget label="Pressure drop" value={sim.totalDp} max={220} suffix="mbar" color="#f97316" />
        <GaugeWidget label="Combustion" value={sim.combustionEff * 100} max={100} suffix="%" color="#10b981" />
        <GaugeWidget label="Lamp intensity" value={sim.lampIntensity * 100} max={100} suffix="%" color="#facc15" />
      </div>

      <SectionCard title="Snapshot" eyebrow="Current operating picture">
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          <SmallStat label="Current state" value={sim.state} emphasis />
          <SmallStat label="Lamp mode" value={`${sim.lampMode} / ${sim.lampFreqHz.toFixed(1)} Hz`} />
          <SmallStat label="Injection" value={`${sim.injPv.toFixed(1)} uL/min`} />
          <SmallStat label="Reservoir" value={`${sim.syringeReservoirUl.toFixed(0)} uL`} />
          <SmallStat label="Expected sample" value={`${sim.sampleConcentrationPpm.toFixed(1)} ppm`} />
        </div>
      </SectionCard>
    </div>
  );
}
