import {
  Alarm,
  InjectionRecord,
  LogEntry,
  Recipe,
  SampleStandard,
  Simulator,
  SystemState,
} from "./types";
import { clamp, expEase, randn, sigmoid } from "./utils";

export const RECIPES: Record<string, Recipe> = {
  standard: {
    arSp: 0.34,
    o2aSp: 0.17,
    o2bSp: 0.11,
    injSp: 92,
    furnaceSp: 870,
    pmtHvSp: 430,
  },
  fast: {
    arSp: 0.3,
    o2aSp: 0.21,
    o2bSp: 0.14,
    injSp: 118,
    furnaceSp: 915,
    pmtHvSp: 465,
  },
  gentle: {
    arSp: 0.41,
    o2aSp: 0.14,
    o2bSp: 0.09,
    injSp: 72,
    furnaceSp: 825,
    pmtHvSp: 405,
  },
};

export const SAMPLE_LIBRARY: SampleStandard[] = [
  {
    id: "blank",
    name: "Blank",
    kind: "blank",
    expectedPpm: 0,
    notes: "Zero standard for baseline confirmation.",
    acceptancePct: 2,
  },
  {
    id: "cal-low",
    name: "Cal 20 ppm",
    kind: "calibration",
    expectedPpm: 20,
    notes: "Low calibration standard.",
    acceptancePct: 5,
  },
  {
    id: "cal-mid",
    name: "Cal 50 ppm",
    kind: "calibration",
    expectedPpm: 50,
    notes: "Mid calibration standard.",
    acceptancePct: 4,
  },
  {
    id: "cal-high",
    name: "Cal 100 ppm",
    kind: "calibration",
    expectedPpm: 100,
    notes: "High calibration standard.",
    acceptancePct: 4,
  },
  {
    id: "qc-check",
    name: "QC 75 ppm",
    kind: "sample",
    expectedPpm: 75,
    notes: "Independent check standard.",
    acceptancePct: 6,
  },
];

const FACTORY_RESPONSE_INTERCEPT = 0.095;
const FACTORY_RESPONSE_SLOPE = 0.0064;
const TREND_LIMIT = 360;
const LOG_LIMIT = 140;
const HISTORY_LIMIT = 36;

function cloneSimulator(prev: Simulator): Simulator {
  return {
    ...prev,
    alarms: [...prev.alarms],
    alarmHistory: [...prev.alarmHistory],
    eventLog: [...prev.eventLog],
    trends: [...prev.trends],
    injectionHistory: [...prev.injectionHistory],
  };
}

function makeLog(kind: LogEntry["kind"], time: number, message: string): LogEntry {
  return {
    id: Math.round(time * 1000) + Math.floor(Math.random() * 1000),
    t: Number(time.toFixed(1)),
    kind,
    message,
  };
}

function pushLog(list: LogEntry[], entry: LogEntry, limit = LOG_LIMIT) {
  list.unshift(entry);
  if (list.length > limit) list.length = limit;
}

function setState(sim: Simulator, next: SystemState) {
  if (sim.state !== next) {
    pushLog(sim.eventLog, makeLog("STATE", sim.time, `State changed: ${sim.state} -> ${next}`));
    sim.state = next;
    sim.stateTimer = 0;
  }
}

function computePressureFactor(upstream: number, downstream: number) {
  return clamp((upstream - downstream) / 1.4, 0, 1);
}

function updateActuator(
  pv: number,
  sp: number,
  enabled: boolean,
  dt: number,
  tau: number,
  max: number,
  pressureFactor = 1
) {
  const target = enabled ? clamp(sp, 0, max) * pressureFactor : 0;
  return clamp(expEase(pv, target, dt, tau) + randn() * max * 0.0011, 0, max);
}

function clampSetpoints(sim: Simulator) {
  const auto = {
    ar: [0.15, 0.65],
    o2a: [0.05, 0.28],
    o2b: [0.03, 0.22],
    inj: [20, 220],
    furnace: [760, 980],
  } as const;

  const manual = {
    ar: [0, 1],
    o2a: [0, 0.4],
    o2b: [0, 0.4],
    inj: [0, 260],
    furnace: [400, 1050],
  } as const;

  const arBounds = sim.arMode === "AUTO" ? auto.ar : manual.ar;
  const o2aBounds = sim.o2aMode === "AUTO" ? auto.o2a : manual.o2a;
  const o2bBounds = sim.o2bMode === "AUTO" ? auto.o2b : manual.o2b;
  const injBounds = sim.injMode === "AUTO" ? auto.inj : manual.inj;
  const furnaceBounds = sim.furnaceMode === "AUTO" ? auto.furnace : manual.furnace;

  sim.arSp = clamp(sim.arSp, arBounds[0], arBounds[1]);
  sim.o2aSp = clamp(sim.o2aSp, o2aBounds[0], o2aBounds[1]);
  sim.o2bSp = clamp(sim.o2bSp, o2bBounds[0], o2bBounds[1]);
  sim.injSp = clamp(sim.injSp, injBounds[0], injBounds[1]);
  sim.furnaceSp = clamp(sim.furnaceSp, furnaceBounds[0], furnaceBounds[1]);
  sim.pmtHvSp = clamp(sim.pmtHvSp, 0, 650);
  sim.furnaceTempOffset = clamp(sim.furnaceTempOffset, -120, 120);
  sim.thermalBoost = clamp(sim.thermalBoost, 0.85, 2.4);
  sim.injShotVolumeUl = clamp(sim.injShotVolumeUl, 10, 1500);
  sim.manualPushForce = clamp(sim.manualPushForce, 0.05, 1);
  sim.syringeCapacityUl = clamp(sim.syringeCapacityUl, 500, 20000);
  sim.syringeReservoirUl = clamp(sim.syringeReservoirUl, 0, sim.syringeCapacityUl);
}

function getStandard(standardId: string) {
  return SAMPLE_LIBRARY.find((item) => item.id === standardId) ?? SAMPLE_LIBRARY[0];
}

function getCalibrationFit(sim: Simulator) {
  const calibrationPoints = sim.injectionHistory.filter(
    (record) => record.expectedPpm >= 0 && (record.name === "Blank" || record.name.startsWith("Cal "))
  );

  if (calibrationPoints.length < 2) {
    return {
      slope: FACTORY_RESPONSE_SLOPE,
      intercept: FACTORY_RESPONSE_INTERCEPT,
      r2: 1,
      points: calibrationPoints,
    };
  }

  const n = calibrationPoints.length;
  const sumX = calibrationPoints.reduce((acc, point) => acc + point.expectedPpm, 0);
  const sumY = calibrationPoints.reduce((acc, point) => acc + point.responseAu, 0);
  const sumXY = calibrationPoints.reduce((acc, point) => acc + point.expectedPpm * point.responseAu, 0);
  const sumX2 = calibrationPoints.reduce((acc, point) => acc + point.expectedPpm * point.expectedPpm, 0);
  const denominator = n * sumX2 - sumX * sumX;

  if (Math.abs(denominator) < 0.000001) {
    return {
      slope: FACTORY_RESPONSE_SLOPE,
      intercept: FACTORY_RESPONSE_INTERCEPT,
      r2: 1,
      points: calibrationPoints,
    };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  const meanY = sumY / n;
  const ssRes = calibrationPoints.reduce((acc, point) => {
    const predicted = intercept + slope * point.expectedPpm;
    return acc + (point.responseAu - predicted) ** 2;
  }, 0);
  const ssTot = calibrationPoints.reduce((acc, point) => acc + (point.responseAu - meanY) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : clamp(1 - ssRes / ssTot, 0, 1);

  return {
    slope,
    intercept,
    r2,
    points: calibrationPoints,
  };
}

function estimateConcentrationFromResponse(sim: Simulator, responseAu: number) {
  const fit = getCalibrationFit(sim);
  if (fit.slope <= 0.000001) return 0;
  return Math.max(0, (responseAu - fit.intercept) / fit.slope);
}

function reconcileAlarms(sim: Simulator, nextAlarms: Alarm[]) {
  const oldCodes = new Set(sim.alarms.map((alarm) => alarm.code));
  const newCodes = new Set(nextAlarms.map((alarm) => alarm.code));

  nextAlarms.forEach((alarm) => {
    if (!oldCodes.has(alarm.code)) {
      pushLog(
        sim.alarmHistory,
        makeLog("ALARM", sim.time, `${alarm.code} ${alarm.severity}: ${alarm.text}`)
      );
    }
  });

  sim.alarms.forEach((alarm) => {
    if (!newCodes.has(alarm.code)) {
      pushLog(sim.eventLog, makeLog("EVENT", sim.time, `Alarm cleared: ${alarm.code}`));
    }
  });

  sim.alarms = nextAlarms;
}

function buildInjectionRecord(
  sim: Simulator,
  standard: SampleStandard,
  responseAu: number
): InjectionRecord {
  const measuredPpm = estimateConcentrationFromResponse(sim, responseAu);
  const recoveryPct =
    standard.expectedPpm <= 0
      ? Math.max(0, 100 - measuredPpm * 5)
      : (measuredPpm / standard.expectedPpm) * 100;
  const deviationPct =
    standard.expectedPpm <= 0
      ? measuredPpm
      : Math.abs((measuredPpm - standard.expectedPpm) / standard.expectedPpm) * 100;

  const status: InjectionRecord["status"] =
    deviationPct <= standard.acceptancePct
      ? "PASS"
      : deviationPct <= standard.acceptancePct * 1.8
        ? "WARN"
        : "FAIL";

  return {
    id: Math.round(sim.time * 1000),
    t: Number(sim.time.toFixed(1)),
    standardId: standard.id,
    name: standard.name,
    expectedPpm: standard.expectedPpm,
    measuredPpm: Number(measuredPpm.toFixed(2)),
    responseAu: Number(responseAu.toFixed(4)),
    recoveryPct: Number(recoveryPct.toFixed(2)),
    volumeUl: Number(sim.injShotVolumeUl.toFixed(1)),
    flowUlMin: Number(sim.injSp.toFixed(1)),
    status,
  };
}

export function createInitialSimulator(): Simulator {
  return {
    time: 0,
    state: "OFF",
    stateTimer: 0,

    arSp: RECIPES.standard.arSp,
    arPv: 0,
    arEnabled: false,
    arMode: "AUTO",
    arUpstreamBar: 5.2,
    arDownstreamBar: 0.6,

    o2aSp: RECIPES.standard.o2aSp,
    o2aPv: 0,
    o2aEnabled: false,
    o2aMode: "AUTO",

    o2bSp: RECIPES.standard.o2bSp,
    o2bPv: 0,
    o2bEnabled: false,
    o2bMode: "AUTO",

    injSp: RECIPES.standard.injSp,
    injPv: 0,
    injEnabled: false,
    injMode: "AUTO",
    selectedStandardId: "cal-mid",
    activeStandardId: "",
    injShotVolumeUl: 250,
    injShotRemainingUl: 0,
    sampleShotRequested: false,
    manualPushActive: false,
    manualPushForce: 0.55,
    syringeReservoirUl: 3000,
    syringeCapacityUl: 5000,
    injectorClogged: false,
    sampleStage: "IDLE",
    sampleStageProgress: 0,
    samplePlugInletUl: 0,
    samplePlugFurnaceUl: 0,
    samplePlugDetectorUl: 0,

    furnaceSp: RECIPES.standard.furnaceSp,
    furnacePv: 29,
    furnacePvCalibrated: 29,
    furnaceTempOffset: 0,
    heaterDuty: 0,
    heaterEnabled: false,
    furnaceMode: "AUTO",
    ssr1: false,
    ssr2: false,
    thermalBoost: 1.2,
    thermocoupleHealthy: true,
    furnaceIntegral: 0,

    combustionEff: 0,
    sootPpm: 0,
    moisturePpm: 0,
    acidPpm: 0,
    reactionIndex: 0,

    scrubberSat: 0,
    scrubberDp: 5,
    permapureSat: 0,
    permapureDp: 5,
    filterSat: 0,
    filterDp: 5,
    totalDp: 15,

    lampMode: "OFF",
    lampFreqHz: 0,
    lampIntensity: 0,
    lampAging: 0,
    pmtHvSp: RECIPES.standard.pmtHvSp,
    pmtHvPv: 0,
    pmtGain: 1,
    detectorRaw: 0,
    detectorFiltered: 0,
    liveResponseAu: FACTORY_RESPONSE_INTERCEPT,
    measuredConcentrationPpm: 0,
    sampleConcentrationPpm: 0,
    opticsCleanliness: 1,
    noiseIndex: 0,

    warmupAggressive: true,
    autoRunRequested: false,

    forcedHeaterFail: false,
    forcedLampAged: false,
    forcedLowPressure: false,
    forcedFilterClog: false,

    alarms: [],
    alarmHistory: [],
    eventLog: [],
    trends: [],
    injectionHistory: [],
  };
}

export function runSimulatorStep(prev: Simulator, dt: number): Simulator {
  const sim = cloneSimulator(prev);
  const selectedStandard = getStandard(sim.selectedStandardId);
  const activeStandard = getStandard(sim.activeStandardId || sim.selectedStandardId);
  const sampleWasActive =
    prev.injShotRemainingUl > 0 ||
    prev.samplePlugInletUl > 0.5 ||
    prev.samplePlugFurnaceUl > 0.5 ||
    prev.samplePlugDetectorUl > 0.5;

  sim.time += dt;
  sim.stateTimer += dt;
  clampSetpoints(sim);

  sim.arUpstreamBar = expEase(sim.arUpstreamBar, sim.forcedLowPressure ? 1.2 : 5.2, dt, 0.9);
  sim.arDownstreamBar = expEase(sim.arDownstreamBar, 0.55 + sim.totalDp / 220, dt, 0.8);

  if (sim.sampleShotRequested && ["READY", "RUN"].includes(sim.state) && sim.injShotRemainingUl <= 0) {
    if (sim.syringeReservoirUl >= sim.injShotVolumeUl) {
      sim.activeStandardId = sim.selectedStandardId;
      sim.injShotRemainingUl = sim.injShotVolumeUl;
      sim.sampleShotRequested = false;
      sim.sampleStage = "ARMED";
      sim.sampleStageProgress = 0;
      if (sim.state === "READY") setState(sim, "RUN");
      pushLog(
        sim.eventLog,
        makeLog(
          "EVENT",
          sim.time,
          `Injection started: ${selectedStandard.name}, ${sim.injShotVolumeUl.toFixed(0)} uL`
        )
      );
    } else {
      sim.sampleShotRequested = false;
      pushLog(sim.eventLog, makeLog("EVENT", sim.time, "Injection request rejected: syringe volume low"));
    }
  }

  if (
    sim.injMode === "MANUAL" &&
    sim.manualPushActive &&
    ["READY", "RUN"].includes(sim.state) &&
    sim.injShotRemainingUl <= 0 &&
    sim.syringeReservoirUl > 0
  ) {
    sim.activeStandardId = sim.selectedStandardId;
    sim.injShotRemainingUl = Math.min(sim.injShotVolumeUl, sim.syringeReservoirUl);
    sim.sampleStage = "ARMED";
    sim.sampleStageProgress = 0;
    if (sim.state === "READY") setState(sim, "RUN");
    pushLog(
      sim.eventLog,
      makeLog(
        "EVENT",
        sim.time,
        `Manual injection engaged: ${selectedStandard.name}, ${sim.injShotRemainingUl.toFixed(0)} uL armed`
      )
    );
  }

  if (sim.state === "OFF") {
    sim.arEnabled = false;
    sim.o2aEnabled = false;
    sim.o2bEnabled = false;
    sim.injEnabled = false;
    sim.heaterEnabled = false;
    sim.lampMode = "OFF";
    sim.furnaceIntegral *= 0.992;

    if (sim.scrubberSat > 0) sim.scrubberSat = clamp(sim.scrubberSat - dt * 0.00004, 0, 1);
    if (sim.permapureSat > 0) sim.permapureSat = clamp(sim.permapureSat - dt * 0.00005, 0, 1);
  }

  if (sim.state === "SELF_TEST") {
    sim.arEnabled = false;
    sim.o2aEnabled = false;
    sim.o2bEnabled = false;
    sim.injEnabled = false;
    sim.heaterEnabled = false;
    sim.lampMode = "OFF";
    if (sim.stateTimer > 1.8) setState(sim, "PURGE");
  }

  if (sim.state === "PURGE") {
    sim.arEnabled = true;
    sim.o2aEnabled = true;
    sim.o2bEnabled = true;
    sim.injEnabled = false;
    sim.heaterEnabled = !sim.forcedHeaterFail;
    sim.lampMode = "STANDBY";

    if (sim.arMode === "AUTO") sim.arSp = Math.max(sim.arSp, 0.42);
    if (sim.o2aMode === "AUTO") sim.o2aSp = Math.max(sim.o2aSp, 0.09);
    if (sim.o2bMode === "AUTO") sim.o2bSp = Math.max(sim.o2bSp, 0.06);

    if (sim.stateTimer > 4.2) setState(sim, "WARMUP");
  }

  if (sim.state === "WARMUP") {
    sim.arEnabled = true;
    sim.o2aEnabled = true;
    sim.o2bEnabled = true;
    sim.injEnabled = false;
    sim.heaterEnabled = !sim.forcedHeaterFail;
    sim.lampMode = "STANDBY";
  }

  if (sim.state === "READY") {
    sim.arEnabled = true;
    sim.o2aEnabled = true;
    sim.o2bEnabled = true;
    sim.injEnabled = false;
    sim.heaterEnabled = !sim.forcedHeaterFail;
    sim.lampMode = "STANDBY";

    if (sim.autoRunRequested) {
      sim.autoRunRequested = false;
      setState(sim, "RUN");
    }
  }

  if (sim.state === "RUN") {
    sim.arEnabled = true;
    sim.o2aEnabled = true;
    sim.o2bEnabled = true;
    sim.injEnabled =
      !sim.injectorClogged &&
      sim.syringeReservoirUl > 0 &&
      sim.injShotRemainingUl > 0 &&
      (sim.injMode === "AUTO" || sim.manualPushActive);
    sim.heaterEnabled = !sim.forcedHeaterFail;
    sim.lampMode = "WORKING";

    if (sim.injShotRemainingUl <= 0 && sim.stateTimer > 6 && !sim.autoRunRequested) {
      setState(sim, "READY");
    }
  }

  if (sim.state === "SHUTDOWN") {
    sim.injEnabled = false;
    sim.arEnabled = true;
    sim.o2aEnabled = true;
    sim.o2bEnabled = true;
    sim.lampMode = "STANDBY";
    if (sim.stateTimer > 5.5) sim.heaterEnabled = false;
    if (sim.stateTimer > 11.5) setState(sim, "OFF");
  }

  if (sim.state === "FAULT") {
    sim.injEnabled = false;
    sim.arEnabled = true;
    sim.o2aEnabled = true;
    sim.o2bEnabled = true;
    sim.heaterEnabled = false;
    sim.lampMode = "STANDBY";
  }

  const arPressureFactor = computePressureFactor(sim.arUpstreamBar, sim.arDownstreamBar);
  sim.arPv = updateActuator(sim.arPv, sim.arSp, sim.arEnabled, dt, 1, 1, arPressureFactor);
  sim.o2aPv = updateActuator(sim.o2aPv, sim.o2aSp, sim.o2aEnabled, dt, 0.9, 0.4);
  sim.o2bPv = updateActuator(sim.o2bPv, sim.o2bSp, sim.o2bEnabled, dt, 0.95, 0.4);

  const manualTarget = 25 + sim.manualPushForce * 235;
  const injTarget =
    sim.injEnabled && !sim.injectorClogged && sim.syringeReservoirUl > 0
      ? sim.injMode === "MANUAL"
        ? manualTarget
        : sim.injSp
      : 0;
  sim.injPv = clamp(expEase(sim.injPv, injTarget, dt, 0.85), 0, 280);
  const deliveredThisStep = Math.min(sim.injPv * (dt / 60), sim.syringeReservoirUl, sim.injShotRemainingUl);
  sim.syringeReservoirUl = Math.max(0, sim.syringeReservoirUl - deliveredThisStep);
  sim.injShotRemainingUl = Math.max(0, sim.injShotRemainingUl - deliveredThisStep);

  const totalGas = sim.arPv + sim.o2aPv + sim.o2bPv;
  const ambient = 25;
  const measuredTemp = sim.thermocoupleHealthy ? sim.furnacePv : sim.furnacePv - 80;
  const tempError = sim.furnaceSp - measuredTemp;

  if (sim.heaterEnabled) {
    sim.furnaceIntegral = clamp(sim.furnaceIntegral + tempError * dt, -500, 1500);
  } else {
    sim.furnaceIntegral *= 0.98;
  }

  const warmupBoost =
    sim.warmupAggressive && (sim.state === "PURGE" || sim.state === "WARMUP")
      ? clamp(1 + tempError / 260, 1, 2.05)
      : 1;

  const kp = sim.furnaceMode === "AUTO" ? 0.0029 : 0.0024;
  const ki = sim.furnaceMode === "AUTO" ? 0.00047 : 0.00034;
  const bias = tempError > 14 ? 0.1 : 0;
  const dutyRaw = sim.heaterEnabled
    ? clamp((kp * tempError + ki * sim.furnaceIntegral + bias) * warmupBoost, 0, 1)
    : 0;

  sim.heaterDuty = expEase(sim.heaterDuty, dutyRaw, dt, 0.35);
  sim.ssr1 = sim.heaterDuty > 0.08;
  sim.ssr2 = sim.heaterDuty > 0.44;

  const heaterPower =
    (sim.forcedHeaterFail ? 0 : 7100) * sim.heaterDuty * sim.thermalBoost * warmupBoost;
  const losses = 4.9 * (sim.furnacePv - ambient) + 1.8 * totalGas + 0.08 * sim.injPv;
  sim.furnacePv = clamp(sim.furnacePv + ((heaterPower - losses) / 1500) * dt, ambient, 1200);
  sim.furnacePvCalibrated = sim.furnacePv + sim.furnaceTempOffset;

  const o2Total = sim.o2aPv + sim.o2bPv;
  const oxygenFactor = clamp(o2Total / 0.2, 0, 1.4);
  const tempFactor = sigmoid((sim.furnacePv - 690) / 36);
  const inertPenalty = 1 / (1 + sim.arPv / 1.8);
  if (deliveredThisStep > 0) {
    sim.samplePlugInletUl += deliveredThisStep;
  }

  const gasSweep = clamp((sim.arPv + o2Total) / 0.55, 0.18, 1.8);
  const inletToFurnace = Math.min(
    sim.samplePlugInletUl,
    sim.samplePlugInletUl * dt * (0.62 + gasSweep * 0.95)
  );
  sim.samplePlugInletUl -= inletToFurnace;
  sim.samplePlugFurnaceUl += inletToFurnace;

  const furnaceToDetector = Math.min(
    sim.samplePlugFurnaceUl,
    sim.samplePlugFurnaceUl * dt * (0.24 + tempFactor * 0.88 + oxygenFactor * 0.18)
  );
  sim.samplePlugFurnaceUl -= furnaceToDetector;
  sim.samplePlugDetectorUl += furnaceToDetector;

  const detectorBleed = Math.min(
    sim.samplePlugDetectorUl,
    sim.samplePlugDetectorUl * dt * (0.12 + gasSweep * 0.18)
  );
  sim.samplePlugDetectorUl -= detectorBleed;

  const detectorOccupancy = clamp(sim.samplePlugDetectorUl / Math.max(sim.injShotVolumeUl * 0.18, 18), 0, 1.6);
  const furnaceAssist = clamp(sim.samplePlugFurnaceUl / Math.max(sim.injShotVolumeUl * 0.3, 22), 0, 1.25);
  const standardTargetPpm =
    activeStandard.expectedPpm *
    clamp(detectorOccupancy * 1.08 + furnaceAssist * 0.52, 0, activeStandard.expectedPpm > 0 ? 1.22 : 0.18);

  sim.sampleConcentrationPpm = expEase(sim.sampleConcentrationPpm, standardTargetPpm, dt, 0.28);
  if (sim.samplePlugInletUl + sim.samplePlugFurnaceUl + sim.samplePlugDetectorUl < 0.5 && sim.injShotRemainingUl <= 0) {
    sim.sampleConcentrationPpm = Math.max(0, sim.sampleConcentrationPpm - dt * 6.5);
  }

  const concentrationFactor = sim.sampleConcentrationPpm / 100;
  const effTarget = clamp(
    0.05 + 0.94 * oxygenFactor * tempFactor * (1 / (1 + concentrationFactor * 0.3)),
    0,
    0.995
  );
  sim.combustionEff = expEase(sim.combustionEff, effTarget, dt, 1.1);
  const incomplete = 1 - sim.combustionEff;

  sim.sootPpm = expEase(sim.sootPpm, incomplete * sim.sampleConcentrationPpm * 0.22, dt, 1.4);
  sim.moisturePpm = expEase(
    sim.moisturePpm,
    sim.injPv * 6.4 + concentrationFactor * 12 + incomplete * 35,
    dt,
    1.35
  );
  sim.acidPpm = expEase(sim.acidPpm, concentrationFactor * 6 + incomplete * 10, dt, 1.8);
  sim.reactionIndex = expEase(
    sim.reactionIndex,
    sim.sampleConcentrationPpm * sim.combustionEff * inertPenalty,
    dt,
    0.75
  );

  sim.scrubberSat = clamp(sim.scrubberSat + sim.acidPpm * dt * 0.0000018, 0, 1);
  const scrubberEff = clamp(0.94 * (1 - 0.78 * sim.scrubberSat), 0.16, 0.96);
  const acidAfter = sim.acidPpm * (1 - scrubberEff);
  sim.scrubberDp = 5 + 58 * sim.scrubberSat;

  sim.permapureSat = clamp(sim.permapureSat + sim.moisturePpm * dt * 0.0000011, 0, 1);
  const dryEff = clamp(0.965 * (1 - 0.82 * sim.permapureSat), 0.14, 0.975);
  const moistureAfter = sim.moisturePpm * (1 - dryEff);
  sim.permapureDp = 5 + 46 * sim.permapureSat;

  if (sim.forcedFilterClog) sim.filterSat = clamp(sim.filterSat + dt * 0.01, 0, 1);
  sim.filterSat = clamp(sim.filterSat + sim.sootPpm * dt * 0.00000155, 0, 1);
  const filterEff = clamp(0.985 * (1 - 0.9 * sim.filterSat), 0.12, 0.99);
  const sootAfter = sim.sootPpm * (1 - filterEff);
  sim.filterDp = 5 + 100 * sim.filterSat;
  sim.totalDp = sim.scrubberDp + sim.permapureDp + sim.filterDp;

  sim.lampAging = sim.forcedLampAged
    ? clamp(sim.lampAging + dt * 0.0028, 0, 0.55)
    : clamp(sim.lampAging + dt * 0.0000012, 0, 0.35);

  const lampTargetFreq = sim.lampMode === "OFF" ? 0 : sim.lampMode === "STANDBY" ? 60 : 110;
  const lampBaseIntensity = sim.lampMode === "OFF" ? 0 : sim.lampMode === "STANDBY" ? 0.67 : 1;
  sim.lampFreqHz = expEase(sim.lampFreqHz, lampTargetFreq, dt, 0.5);
  sim.lampIntensity = expEase(
    sim.lampIntensity,
    lampBaseIntensity * (1 - sim.lampAging),
    dt,
    0.8
  );

  sim.pmtHvPv = expEase(sim.pmtHvPv, sim.lampMode === "OFF" ? 0 : sim.pmtHvSp, dt, 0.55);
  sim.pmtGain = Math.max(1, Math.pow(Math.max(sim.pmtHvPv, 1) / 100, 2.82));

  sim.opticsCleanliness = clamp(sim.opticsCleanliness - sootAfter * dt * 0.00000048, 0.6, 1);
  const attenuation = Math.max(
    0.04,
    sim.opticsCleanliness *
      Math.exp(-0.00062 * moistureAfter - 0.0024 * sootAfter - 0.00045 * acidAfter)
  );
  const instrumentHealth =
    sim.lampIntensity *
    attenuation *
    clamp(sim.pmtGain / Math.pow(sim.pmtHvSp / 100, 2.82), 0.7, 1.25) *
    clamp(sim.combustionEff * 1.05, 0.3, 1);
  const usefulSignal =
    FACTORY_RESPONSE_INTERCEPT +
    sim.sampleConcentrationPpm * FACTORY_RESPONSE_SLOPE * instrumentHealth;
  const noise = randn() * 0.015 * (1 + moistureAfter * 0.00022 + incomplete * 0.25);
  sim.noiseIndex = Math.abs(noise) * 10;
  sim.liveResponseAu = usefulSignal;
  sim.detectorRaw = usefulSignal + noise;
  sim.detectorFiltered = expEase(sim.detectorFiltered, sim.detectorRaw, dt, 0.38);
  sim.measuredConcentrationPpm = estimateConcentrationFromResponse(sim, sim.detectorFiltered);

  if (sim.injShotRemainingUl > 0.5 || sim.injPv > 5) {
    sim.sampleStage = "INJECTING";
    sim.sampleStageProgress = clamp(1 - sim.injShotRemainingUl / Math.max(sim.injShotVolumeUl, 1), 0, 1);
  } else if (sim.samplePlugInletUl > 0.5) {
    sim.sampleStage = "TRANSFER_TO_FURNACE";
    sim.sampleStageProgress = clamp(sim.samplePlugInletUl / Math.max(sim.injShotVolumeUl, 1), 0, 1);
  } else if (sim.samplePlugFurnaceUl > 0.5) {
    sim.sampleStage = "COMBUSTING";
    sim.sampleStageProgress = clamp(sim.samplePlugFurnaceUl / Math.max(sim.injShotVolumeUl * 0.7, 1), 0, 1);
  } else if (sim.samplePlugDetectorUl > 0.5 || sim.sampleConcentrationPpm > 0.2) {
    sim.sampleStage = "DETECTING";
    sim.sampleStageProgress = clamp(sim.sampleConcentrationPpm / Math.max(activeStandard.expectedPpm, 1), 0, 1);
  } else if (sim.activeStandardId) {
    sim.sampleStage = "CLEARING";
    sim.sampleStageProgress = clamp(sim.sampleConcentrationPpm / Math.max(activeStandard.expectedPpm, 1), 0, 1);
  } else {
    sim.sampleStage = sim.sampleShotRequested ? "ARMED" : "IDLE";
    sim.sampleStageProgress = 0;
  }

  if (sim.sampleStage !== prev.sampleStage) {
    if (sim.sampleStage === "DETECTING" && sim.activeStandardId) {
      pushLog(
        sim.eventLog,
        makeLog("EVENT", sim.time, `Sample reached detector: ${activeStandard.name}`)
      );
    }

    if (sim.sampleStage === "CLEARING" && sim.activeStandardId) {
      pushLog(
        sim.eventLog,
        makeLog("EVENT", sim.time, `Sample clearing started: ${activeStandard.name}`)
      );
    }
  }

  const gasReady = sim.arPv > 0.12 && o2Total > 0.09;
  const furnaceReady = sim.furnacePv >= sim.furnaceSp - 22;
  const lampReady = sim.lampIntensity > 0.6;
  const pmtReady = sim.pmtHvPv > 120;
  const injectorReady = sim.syringeReservoirUl > sim.injShotVolumeUl && !sim.injectorClogged;

  if (
    sim.state === "WARMUP" &&
    gasReady &&
    furnaceReady &&
    lampReady &&
    pmtReady &&
    injectorReady &&
    sim.stateTimer > 2.5
  ) {
    setState(sim, "READY");
  }

  const sampleIsClear =
    sim.injShotRemainingUl <= 0 &&
    sim.samplePlugInletUl < 0.5 &&
    sim.samplePlugFurnaceUl < 0.5 &&
    sim.samplePlugDetectorUl < 0.5 &&
    sim.sampleConcentrationPpm < 0.2 &&
    sim.injPv < 1;

  if (sampleWasActive && sampleIsClear && sim.activeStandardId) {
    const completedStandard = getStandard(sim.activeStandardId);
    const record = buildInjectionRecord(sim, completedStandard, sim.detectorFiltered);
    sim.injectionHistory.unshift(record);
    if (sim.injectionHistory.length > HISTORY_LIMIT) sim.injectionHistory.length = HISTORY_LIMIT;
    pushLog(
      sim.eventLog,
      makeLog(
        "EVENT",
        sim.time,
        `Injection completed: ${record.name}, measured ${record.measuredPpm.toFixed(2)} ppm (${record.status})`
      )
    );
    sim.activeStandardId = "";
    sim.sampleStage = "IDLE";
    sim.sampleStageProgress = 0;
  }

  const runGrace = sim.state === "RUN" && sim.stateTimer < 3.5;
  const nextAlarms = [
    {
      code: "A001",
      text: "Argon flow below permissive",
      severity: "WARN" as const,
      active: sim.arEnabled && sim.arPv < 0.06,
    },
    {
      code: "A002",
      text: "Total oxygen flow low",
      severity: "WARN" as const,
      active: ["WARMUP", "READY", "RUN"].includes(sim.state) && o2Total < 0.06,
    },
    {
      code: "A003",
      text: "Injection commanded but no sample feed",
      severity: "FAULT" as const,
      active: sim.state === "RUN" && !runGrace && sim.injShotRemainingUl > 0 && sim.injPv < 5,
    },
    {
      code: "A004",
      text: "Furnace below operating band",
      severity: "WARN" as const,
      active: ["WARMUP", "READY", "RUN"].includes(sim.state) && sim.furnacePv < sim.furnaceSp - 80,
    },
    {
      code: "A005",
      text: "Furnace overtemperature",
      severity: "FAULT" as const,
      active: sim.furnacePv > 1085,
    },
    {
      code: "A006",
      text: "Scrubber nearing saturation",
      severity: "WARN" as const,
      active: sim.scrubberSat > 0.78,
    },
    {
      code: "A007",
      text: "Dryer nearing saturation",
      severity: "WARN" as const,
      active: sim.permapureSat > 0.8,
    },
    {
      code: "A008",
      text: "Particle filter clogged",
      severity: "FAULT" as const,
      active: sim.state !== "OFF" && (sim.filterSat > 0.88 || sim.totalDp > 188),
    },
    {
      code: "A009",
      text: "Lamp intensity below detector threshold",
      severity: "FAULT" as const,
      active: sim.state === "RUN" && !runGrace && sim.lampIntensity < 0.56,
    },
    {
      code: "A010",
      text: "PMT high voltage high",
      severity: "WARN" as const,
      active: sim.lampMode !== "OFF" && sim.pmtHvPv > 620,
    },
    {
      code: "A011",
      text: "Detector signal unstable",
      severity: "WARN" as const,
      active: Math.abs(sim.detectorRaw - sim.detectorFiltered) > 0.42,
    },
    {
      code: "A012",
      text: "Gas supply pressure low",
      severity: "FAULT" as const,
      active: sim.state !== "OFF" && sim.arEnabled && sim.arUpstreamBar < 2,
    },
    {
      code: "A013",
      text: "Heater power train failure",
      severity: "FAULT" as const,
      active:
        ["PURGE", "WARMUP", "READY", "RUN", "SHUTDOWN"].includes(sim.state) &&
        sim.forcedHeaterFail,
    },
    {
      code: "A014",
      text: "Syringe volume low",
      severity: "WARN" as const,
      active: sim.syringeReservoirUl < sim.injShotVolumeUl,
    },
  ] satisfies Alarm[];

  const activeAlarms: Alarm[] = nextAlarms.filter((alarm) => alarm.active);
  reconcileAlarms(sim, activeAlarms);

  if (
    activeAlarms.some((alarm) => alarm.severity === "FAULT") &&
    !["OFF", "SHUTDOWN", "FAULT"].includes(sim.state)
  ) {
    setState(sim, "FAULT");
  }

  sim.trends.push({
    t: Number(sim.time.toFixed(1)),
    furnace: Number(sim.furnacePv.toFixed(2)),
    furnaceCal: Number(sim.furnacePvCalibrated.toFixed(2)),
    detector: Number(sim.detectorFiltered.toFixed(4)),
    response: Number(sim.liveResponseAu.toFixed(4)),
    measured: Number(sim.measuredConcentrationPpm.toFixed(2)),
    o2: Number(o2Total.toFixed(4)),
    inj: Number(sim.injPv.toFixed(2)),
    eff: Number((sim.combustionEff * 100).toFixed(2)),
    dp: Number(sim.totalDp.toFixed(2)),
  });
  if (sim.trends.length > TREND_LIMIT) sim.trends.shift();

  return sim;
}
