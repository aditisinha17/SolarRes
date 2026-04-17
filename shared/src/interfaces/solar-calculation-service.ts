import {
  SolarCalculationRequest,
  SolarCalculationResponse,
  SubsidyDetails,
} from '../models/solar-calculation';
import {
  ShadowAnalysisRequest,
  ShadowAnalysisResult,
  PanelPlacementRequest,
  PanelPlacementResult,
  PremiumReportRequest,
  PremiumReportInfo,
  PanelComparisonData,
  PanelArrayAnalysisRequest,
  PanelArrayAnalysisResult,
} from '../models/premium-models';
import {
  OsmBuilding,
  BuildingEnergyRequest,
  BuildingEnergyResult,
} from '../models/osm-building-models';

// ── Solar Calculation ─────────────────────────────────────
export interface ISolarCalculationService {
  calculateAsync(request: SolarCalculationRequest): Promise<SolarCalculationResponse>;
}

// ── Premium Analysis ──────────────────────────────────────
export interface IPremiumAnalysisService {
  analyzeShadowsAsync(request: ShadowAnalysisRequest): Promise<ShadowAnalysisResult>;
  calculatePanelPlacementAsync(request: PanelPlacementRequest): Promise<PanelPlacementResult>;
  generateReportAsync(request: PremiumReportRequest): Promise<PremiumReportInfo>;
  getPanelComparisonAsync(roofArea: number, lat: number, lng: number): Promise<PanelComparisonData[]>;
  analyzeBuildingEnergyAsync(request: BuildingEnergyRequest): Promise<BuildingEnergyResult>;
  analyzePanelArrayAsync(request: PanelArrayAnalysisRequest): Promise<PanelArrayAnalysisResult>;
}

// ── OSM Building Service ──────────────────────────────────
export interface IOsmBuildingService {
  getBuildingsInRadiusAsync(lat: number, lng: number, radiusMeters: number): Promise<OsmBuilding[]>;
}

// ── Weather Data ──────────────────────────────────────────
export interface IWeatherDataClient {
  /** Returns monthly GHI as { 'Jan': 5.2, 'Feb': 5.8, ... } (kWh/m²/day) */
  getMonthlyGhiAsync(lat: number, lng: number): Promise<Record<string, number>>;
}

// ── Irradiance Provider ───────────────────────────────────
export interface IIrradianceProvider {
  providerName: string;
  getMonthlyGhiAsync(lat: number, lng: number): Promise<Record<string, number>>;
}

// ── Building Context Provider ─────────────────────────────
export interface IBuildingContextProvider {
  providerName: string;
  getBuildingsAsync(lat: number, lng: number, radiusMeters: number): Promise<OsmBuilding[]>;
}

// ── Shadow Model ──────────────────────────────────────────
export interface IShadowModel {
  modelName: string;
  calculateShadowFraction(
    target: OsmBuilding,
    neighbor: OsmBuilding,
    sunAzimuthDeg: number,
    sunElevationDeg: number
  ): number;
}

// ── Report Generator ──────────────────────────────────────
export interface IReportGenerator {
  generatePdfAsync(info: PremiumReportInfo): Promise<Buffer>;
}

// ── Report Store ──────────────────────────────────────────
export interface IReportStore {
  saveAsync(reportId: string, pdfBytes: Buffer): Promise<void>;
  getAsync(reportId: string): Promise<{ data: Buffer; filename: string } | null>;
  exists(reportId: string): boolean;
}

// ── Subsidy Calculator ────────────────────────────────────
export interface ISubsidyCalculator {
  calculate(systemCapacityKw: number): SubsidyDetails;
}
