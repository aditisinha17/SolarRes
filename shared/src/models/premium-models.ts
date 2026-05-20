import { PanelType } from '../enums/panel-type';
import { SolarCalculationResponse } from './solar-calculation';
import { BuildingEnergyResult } from './osm-building-models';

// ── Accuracy ──────────────────────────────────────────────
export interface PremiumAccuracyMeta {
  confidenceScore: number; // 0-100
  confidenceLabel: string;
  dataSources: string[];
  assumptions: string[];
  limitations: string[];
}

// ── Shadow Analysis ───────────────────────────────────────
export interface ShadowAnalysisRequest {
  latitude: number;
  longitude: number;
  roofAreaSqm: number;
  buildingHeightMeters?: number; // default 3
  analysisMonth?: number;        // 1-12
  analysisHour?: number;         // 0-24
}

export interface ShadowAnalysisResult {
  sunAzimuth: number;
  sunElevation: number;
  shadedAreaPercent: number;
  effectiveIrradianceKwhPerSqm: number;
  hourlyProfile: HourlyShadowData[];
  analysisSummary: string;
  accuracy: PremiumAccuracyMeta;
}

export interface HourlyShadowData {
  hour: number;
  shadedPercent: number;
  sunElevation: number;
  sunAzimuth: number;
  irradianceWPerSqm: number;
}

// ── Panel Placement ───────────────────────────────────────
export interface PanelPlacementRequest {
  latitude: number;
  longitude: number;
  roofAreaSqm: number;
  numberOfPanels?: number;   // default 10
  tiltDegrees?: number;
  orientationAzimuth?: number;
  panelType?: PanelType;
}

export interface PanelPlacementResult {
  totalPanelsPlaced: number;
  coveragePercent: number;
  estimatedCapacityKw: number;
  panels: PanelPosition[];
  placementStrategy: string;
  accuracy: PremiumAccuracyMeta;
}

export interface PanelPosition {
  index: number;
  latitudeOffset: number;
  longitudeOffset: number;
  rotationDegrees: number;
  widthMeters: number;  // default 1.0
  heightMeters: number; // default 2.0
  isOptimal: boolean;
}

// ── Premium Report ────────────────────────────────────────
export interface PremiumReportRequest {
  latitude: number;
  longitude: number;
  roofAreaSqm: number;
  tiltDegrees?: number;
  orientationAzimuth?: number;
  panelType?: PanelType;
  monthlyBillRupees?: number;
  obstructionPercent?: number;
  numberOfPanels?: number;
  buildingHeightMeters?: number;
}

export interface PremiumReportInfo {
  reportId: string;
  generatedAt: string;
  status: string;
  downloadUrl: string;
  solarCalculation?: SolarCalculationResponse;
  shadowAnalysis?: ShadowAnalysisResult;
  panelPlacement?: PanelPlacementResult;
  buildingEnergy?: BuildingEnergyResult;
  panelComparison?: PanelComparisonData[];
  accuracy?: PremiumAccuracyMeta;
}

// ── Panel Array Analysis ──────────────────────────────────
export interface PanelArrayAnalysisRequest {
  latitude: number;
  longitude: number;
  panels: PanelConfig[];
}

export interface PanelConfig {
  panelId: string;
  tiltDegrees: number;
  azimuthDegrees: number;
  widthMeters?: number;      // 0.3-3.0, default 1.72
  heightMeters?: number;     // default 1.13
  efficiencyPercent?: number; // 5-25, default 21
  hourlyShadowFractions?: HourlyShadowFraction[];
}

export interface HourlyShadowFraction {
  hour: number;
  shadowFraction: number; // 0-1
}

export interface PanelArrayAnalysisResult {
  totalCapacityKw: number;
  totalAnnualGenerationKwh: number;
  totalAnnualSavingsRupees: number;
  averageShadowLossPercent: number;
  paybackYears: number;
  perPanelResults: PerPanelResult[];
}

export interface PerPanelResult {
  panelId: string;
  capacityKw: number;
  annualGenerationKwh: number;
  avgShadowFraction: number;
  effectiveIrradianceKwhPerSqm: number;
}

// ── Panel Comparison ──────────────────────────────────────
export interface PanelComparisonData {
  panelTypeName: string;
  efficiencyPercent: number;
  costPerKw: number;
  areaPerKw: number;
  warrantyYears: number;
  degradationPerYear: number;
  temperatureCoefficient: number;
  bestFor: string;
  solarCalculation?: SolarCalculationResponse;
  npvRupees?: number;
  dynamicRoiPercent?: number;
}

// ── Building Energy (re-export from osm-building-models) ─
export { BuildingEnergyResult } from './osm-building-models';
