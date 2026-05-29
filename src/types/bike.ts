/**
 * Bike model types.
 *
 * BikeModel carries both the marketing/display fields the landing uses and a
 * rich, mostly-optional manufacturer spec block (BikeSpecSheet) drawn from the
 * real ENGWE / ADO spec sheets — so the data (and later the DB) "complies to"
 * the actual bikes. Mirrors the backend `BikeModel` / `BikeSpec` entities.
 */

export type BikeStatus = "in" | "low" | "wait";
export type BadgeVariant = "popular" | "cargo" | "light";

export interface ModelBadge {
  text: string;
  variant: BadgeVariant;
}

/** Compact key/value used in spec chips and the showcase spec table. */
export interface SpecItem {
  k: string;
  v: string;
  u?: string;
}

/** Full manufacturer spec sheet (every field optional — bikes differ). */
export interface BikeSpecSheet {
  bikeType?: string;
  motorBrand?: string;
  motorPowerW?: number;
  peakPowerW?: number;
  torqueNm?: number;
  batteryVoltage?: number;
  batteryAh?: number;
  batteryWh?: number;
  dualBattery?: boolean;
  chargingHours?: string;
  /** Manufacturer range estimate in km — always treat as an estimate, never a hard promise. */
  rangeKm?: number;
  rangeIsEstimate?: boolean;
  topSpeedKmh?: number;
  display?: string;
  sensor?: string;
  driveSystem?: string;
  transmission?: string;
  pedalAssist?: string;
  throttle?: string;
  brakes?: string;
  suspension?: string;
  tyres?: string;
  frame?: string;
  wheels?: string;
  lighting?: string;
  smartFeatures?: string;
  ridingModes?: string;
  maxClimbDeg?: number;
  riderHeightMinCm?: number;
  riderHeightMaxCm?: number;
  netWeightKg?: number;
  grossWeightKg?: number;
  maxLoadKg?: number;
  rearRackKg?: number;
  workingTempC?: string;
  certification?: string;
  sku?: string;
  sourceUrl?: string;
}

export interface BikeModel {
  id: string;
  slug: string;
  name: string;
  brand: string;
  tagline: string;
  /** Primary transparent product shot (card + hero). */
  img: string;
  /** Optional photo gallery for the detail page. */
  gallery?: string[];
  badge: ModelBadge;
  /** Marketing pills — no fixed-km range promises (per business rules). */
  pills: string[];
  /** Uniform term pricing: every bike starts here on a 30-day plan. */
  fromDay: number;
  from30: number;
  availability: number;
  status: BikeStatus;
  popular: boolean;
  showcase?: boolean;
  blurb?: string;
  /** Highlight specs (used in the showcase spec table + detail highlights). */
  specs: SpecItem[];
  /** Full manufacturer sheet (detail page + backend compliance). */
  spec?: BikeSpecSheet;
  colors?: string[];
  isActive?: boolean;
  sortOrder?: number;
}
