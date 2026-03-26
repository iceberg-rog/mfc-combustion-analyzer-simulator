import { ModuleStatus, Simulator } from "./types";
import { moduleState } from "./utils";

const FACTORY_RESPONSE_INTERCEPT = 0.095;
const FACTORY_RESPONSE_SLOPE = 0.0064;

export function getTotalO2(sim: Simulator) {
  return sim.o2aPv + sim.o2bPv;
}

export function getReadiness(sim: Simulator) {
  const gasTrain = sim.arPv > 0.12 && getTotalO2(sim) > 0.09;
  const thermalBlock = sim.furnacePv >= sim.furnaceSp - 22;
  const detectorChain = sim.lampIntensity > 0.6 && sim.pmtHvPv > 120;
  const injectorPath = sim.syringeReservoirUl > 500 && !sim.injectorClogged;

  return {
    gasTrain,
    thermalBlock,
    detectorChain,
    injectorPath,
  };
}

export function getModuleStatuses(sim: Simulator): Record<string, ModuleStatus> {
  return {
    ar: moduleState(sim.arEnabled, sim.arPv > 0.12, sim.arPv > 0.22, sim.forcedLowPressure),
    o2a: moduleState(sim.o2aEnabled, sim.o2aPv > 0.05, sim.o2aPv > 0.1, false),
    o2b: moduleState(sim.o2bEnabled, sim.o2bPv > 0.05, sim.o2bPv > 0.1, false),
    inj: moduleState(sim.injEnabled, sim.injSp > 0, sim.injPv > 1, sim.injectorClogged),
    furnace: moduleState(
      sim.heaterEnabled,
      sim.furnacePv > sim.furnaceSp - 22,
      sim.heaterDuty > 0.08,
      sim.forcedHeaterFail
    ),
    scrubber: moduleState(
      sim.state !== "OFF",
      sim.scrubberSat < 0.78,
      sim.state !== "OFF",
      sim.scrubberSat > 0.88
    ),
    dryer: moduleState(
      sim.state !== "OFF",
      sim.permapureSat < 0.8,
      sim.state !== "OFF",
      sim.permapureSat > 0.88
    ),
    filter: moduleState(
      sim.state !== "OFF",
      sim.filterSat < 0.82,
      sim.state !== "OFF",
      sim.filterSat > 0.88 || sim.forcedFilterClog
    ),
    lamp: moduleState(
      sim.lampMode !== "OFF",
      sim.lampMode === "STANDBY",
      sim.lampMode === "WORKING",
      sim.forcedLampAged && sim.lampIntensity < 0.56
    ),
    detector: moduleState(
      sim.lampMode !== "OFF",
      sim.pmtHvPv > 120,
      sim.state === "RUN",
      sim.pmtHvPv > 620
    ),
  };
}

export function getCalibrationFit(sim: Simulator) {
  const points = sim.injectionHistory.filter(
    (record) => record.name === "Blank" || record.name.startsWith("Cal ")
  );

  if (points.length < 2) {
    return {
      slope: FACTORY_RESPONSE_SLOPE,
      intercept: FACTORY_RESPONSE_INTERCEPT,
      r2: 1,
      points,
    };
  }

  const n = points.length;
  const sumX = points.reduce((acc, point) => acc + point.expectedPpm, 0);
  const sumY = points.reduce((acc, point) => acc + point.responseAu, 0);
  const sumXY = points.reduce((acc, point) => acc + point.expectedPpm * point.responseAu, 0);
  const sumX2 = points.reduce((acc, point) => acc + point.expectedPpm * point.expectedPpm, 0);
  const denominator = n * sumX2 - sumX * sumX;

  if (Math.abs(denominator) < 0.000001) {
    return {
      slope: FACTORY_RESPONSE_SLOPE,
      intercept: FACTORY_RESPONSE_INTERCEPT,
      r2: 1,
      points,
    };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  const meanY = sumY / n;
  const ssRes = points.reduce((acc, point) => {
    const predicted = intercept + slope * point.expectedPpm;
    return acc + (point.responseAu - predicted) ** 2;
  }, 0);
  const ssTot = points.reduce((acc, point) => acc + (point.responseAu - meanY) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : Math.max(0, Math.min(1, 1 - ssRes / ssTot));

  return {
    slope,
    intercept,
    r2,
    points,
  };
}
