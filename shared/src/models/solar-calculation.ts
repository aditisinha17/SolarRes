import { PanelType } from '../enums/panel-type';

export interface SolarCalculationRequest {
  /** Latitude (-90 to 90) */
  latitude: number;
  /** Longitude (-180 to 180) */
  longitude: number;
  /** Roof area in square meters (1 to 10000) */
  roofAreaSqm: number;
  /** Tilt angle in degrees (0 to 60, default 15) */
  tiltDegrees?: number;
  /** Orientation azimuth (0 to 360, default 180 = South) */
  orientationAzimuth?: number;
  /** Panel type (default Monocrystalline) */
  panelType?: PanelType;
  /** Monthly electricity bill in Rupees (0 to 100000, default 2000) */
  monthlyBillRupees?: number;
  /** Obstruction percentage (0 to 50, default 10) */
  obstructionPercent?: number;
  /** Tariff per kWh in Rupees (1 to 20, default 8.0) */
  tariffPerKwh?: number;
}

export interface SolarCalculationResponse {
  systemCapacityKw: number;
  usableAreaSqm: number;
  numberOfPanels: number;
  annualGenerationKwh: number;
  co2SavedTonnes: number;
  monthlyGeneration: MonthlyData[];
  financial: FinancialSummary;
  subsidy: SubsidyDetails;
}

export interface MonthlyData {
  month: string;
  ghiKwhPerSqmPerDay: number;
  generationKwh: number;
  savingsRupees: number;
}

export interface FinancialSummary {
  totalInstallationCostRupees: number;
  subsidyAmountRupees: number;
  netCostRupees: number;
  annualSavingsRupees: number;
  paybackYears: number;
  twentyFiveYearSavingsRupees: number;
  roiPercent: number;
  tariffPerKwh: number;
  tariffEscalationPercent: number;
  degradationPercentPerYear: number;
  inverterReplacementCostRupees: number;
  inverterReplacementYear: number;
}

export interface SubsidyDetails {
  systemCapacityKw: number;
  subsidyPerKw: number;
  totalSubsidy: number;
  explanation: string;
}
