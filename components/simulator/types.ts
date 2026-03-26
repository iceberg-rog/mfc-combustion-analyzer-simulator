export type SystemState =
  | "OFF"
  | "SELF_TEST"
  | "PURGE"
  | "WARMUP"
  | "READY"
  | "RUN"
  | "SHUTDOWN"
  | "FAULT";

export type LampMode = "OFF" | "STANDBY" | "WORKING";
export type ControlMode = "AUTO" | "MANUAL";
export type AlarmSeverity = "WARN" | "FAULT";
export type ModuleStatus = "off" | "ready" | "active" | "fault";

export type Alarm = {
  code: string;
  text: string;
  severity: AlarmSeverity;
  active: boolean;
};

export type LogEntry = {
  id: number;
  t: number;
  kind: "STATE" | "ALARM" | "EVENT";
  message: string;
};

export type TrendPoint = {
  t: number;
  furnace: number;
  furnaceCal: number;
  detector: number;
  response: number;
  measured: number;
  o2: number;
  inj: number;
  eff: number;
  dp: number;
};

export type SampleStandard = {
  id: string;
  name: string;
  kind: "blank" | "calibration" | "sample";
  expectedPpm: number;
  notes: string;
  acceptancePct: number;
};

export type SampleStage =
  | "IDLE"
  | "ARMED"
  | "INJECTING"
  | "TRANSFER_TO_FURNACE"
  | "COMBUSTING"
  | "DETECTING"
  | "CLEARING";

export type InjectionRecord = {
  id: number;
  t: number;
  standardId: string;
  name: string;
  expectedPpm: number;
  measuredPpm: number;
  responseAu: number;
  recoveryPct: number;
  volumeUl: number;
  flowUlMin: number;
  status: "PASS" | "WARN" | "FAIL";
};

export type Recipe = {
  arSp: number;
  o2aSp: number;
  o2bSp: number;
  injSp: number;
  furnaceSp: number;
  pmtHvSp: number;
};

export type Simulator = {
  time: number;
  state: SystemState;
  stateTimer: number;

  arSp: number;
  arPv: number;
  arEnabled: boolean;
  arMode: ControlMode;
  arUpstreamBar: number;
  arDownstreamBar: number;

  o2aSp: number;
  o2aPv: number;
  o2aEnabled: boolean;
  o2aMode: ControlMode;

  o2bSp: number;
  o2bPv: number;
  o2bEnabled: boolean;
  o2bMode: ControlMode;

  injSp: number;
  injPv: number;
  injEnabled: boolean;
  injMode: ControlMode;
  selectedStandardId: string;
  activeStandardId: string;
  injShotVolumeUl: number;
  injShotRemainingUl: number;
  sampleShotRequested: boolean;
  manualPushActive: boolean;
  manualPushForce: number;
  syringeReservoirUl: number;
  syringeCapacityUl: number;
  injectorClogged: boolean;
  sampleStage: SampleStage;
  sampleStageProgress: number;
  samplePlugInletUl: number;
  samplePlugFurnaceUl: number;
  samplePlugDetectorUl: number;

  furnaceSp: number;
  furnacePv: number;
  furnacePvCalibrated: number;
  furnaceTempOffset: number;
  heaterDuty: number;
  heaterEnabled: boolean;
  furnaceMode: ControlMode;
  ssr1: boolean;
  ssr2: boolean;
  thermalBoost: number;
  thermocoupleHealthy: boolean;
  furnaceIntegral: number;

  combustionEff: number;
  sootPpm: number;
  moisturePpm: number;
  acidPpm: number;
  reactionIndex: number;

  scrubberSat: number;
  scrubberDp: number;
  permapureSat: number;
  permapureDp: number;
  filterSat: number;
  filterDp: number;
  totalDp: number;

  lampMode: LampMode;
  lampFreqHz: number;
  lampIntensity: number;
  lampAging: number;
  pmtHvSp: number;
  pmtHvPv: number;
  pmtGain: number;
  detectorRaw: number;
  detectorFiltered: number;
  liveResponseAu: number;
  measuredConcentrationPpm: number;
  sampleConcentrationPpm: number;
  opticsCleanliness: number;
  noiseIndex: number;

  warmupAggressive: boolean;
  autoRunRequested: boolean;

  forcedHeaterFail: boolean;
  forcedLampAged: boolean;
  forcedLowPressure: boolean;
  forcedFilterClog: boolean;

  alarms: Alarm[];
  alarmHistory: LogEntry[];
  eventLog: LogEntry[];
  trends: TrendPoint[];
  injectionHistory: InjectionRecord[];
};
