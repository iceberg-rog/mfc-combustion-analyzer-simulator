"use client";

import React from "react";
import { SectionCard } from "./shared";
import { Simulator } from "./types";

export function TagsTab({ sim }: { sim: Simulator }) {
  const tagList = [
    ["state", sim.state],
    ["ar_sp_l_min", sim.arSp.toFixed(3)],
    ["ar_pv_l_min", sim.arPv.toFixed(3)],
    ["o2a_sp_l_min", sim.o2aSp.toFixed(3)],
    ["o2a_pv_l_min", sim.o2aPv.toFixed(3)],
    ["o2b_sp_l_min", sim.o2bSp.toFixed(3)],
    ["o2b_pv_l_min", sim.o2bPv.toFixed(3)],
    ["inj_sp_ul_min", sim.injSp.toFixed(1)],
    ["inj_pv_ul_min", sim.injPv.toFixed(1)],
    ["furnace_sp_degC", sim.furnaceSp.toFixed(1)],
    ["furnace_raw_degC", sim.furnacePv.toFixed(1)],
    ["furnace_display_degC", sim.furnacePvCalibrated.toFixed(1)],
    ["heater_duty_pct", (sim.heaterDuty * 100).toFixed(1)],
    ["lamp_mode", sim.lampMode],
    ["lamp_freq_hz", sim.lampFreqHz.toFixed(1)],
    ["pmt_hv_sp_v", sim.pmtHvSp.toFixed(1)],
    ["pmt_hv_pv_v", sim.pmtHvPv.toFixed(1)],
    ["pmt_gain", sim.pmtGain.toFixed(2)],
    ["combustion_eff_pct", (sim.combustionEff * 100).toFixed(2)],
    ["soot_ppm", sim.sootPpm.toFixed(2)],
    ["moisture_ppm", sim.moisturePpm.toFixed(2)],
    ["acid_ppm", sim.acidPpm.toFixed(2)],
    ["line_dp_mbar", sim.totalDp.toFixed(2)],
    ["detector_raw", sim.detectorRaw.toFixed(4)],
    ["detector_filtered", sim.detectorFiltered.toFixed(4)],
    ["reservoir_ul", sim.syringeReservoirUl.toFixed(0)],
  ] as const;

  return (
    <SectionCard title="Live tag table" eyebrow="Engineering values">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-3">
        {tagList.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between gap-3 rounded-[18px] border border-stone-200 bg-stone-50/80 px-4 py-3 text-sm">
            <span className="font-mono text-slate-500">{key}</span>
            <span className="font-mono text-slate-900">{value}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
