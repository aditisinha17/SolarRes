import axios, { AxiosInstance } from 'axios';
import { Platform } from 'react-native';

// Types imported inline to avoid shared lib bundling issues in RN
export interface SolarCalculationRequest {
  latitude: number; longitude: number; roofAreaSqm: number;
  tiltDegrees?: number; orientationAzimuth?: number; panelType?: string;
  monthlyBillRupees?: number; obstructionPercent?: number; tariffPerKwh?: number;
}
export interface SolarCalculationResponse {
  systemCapacityKw: number; usableAreaSqm: number; numberOfPanels: number;
  annualGenerationKwh: number; co2SavedTonnes: number;
  monthlyGeneration: MonthlyData[]; financial: FinancialSummary; subsidy: SubsidyDetails;
}
export interface MonthlyData { month: string; ghiKwhPerSqmPerDay: number; generationKwh: number; savingsRupees: number; }
export interface FinancialSummary {
  totalInstallationCostRupees: number; subsidyAmountRupees: number; netCostRupees: number;
  annualSavingsRupees: number; paybackYears: number; twentyFiveYearSavingsRupees: number;
  roiPercent: number; tariffPerKwh: number; tariffEscalationPercent: number;
  degradationPercentPerYear: number; inverterReplacementCostRupees: number; inverterReplacementYear: number;
}
export interface SubsidyDetails { systemCapacityKw: number; subsidyPerKw: number; totalSubsidy: number; explanation: string; }
export interface ShadowAnalysisResult { sunAzimuth: number; sunElevation: number; shadedAreaPercent: number; effectiveIrradianceKwhPerSqm: number; hourlyProfile: any[]; analysisSummary: string; accuracy: any; }
export interface PanelPlacementResult { totalPanelsPlaced: number; coveragePercent: number; estimatedCapacityKw: number; panels: any[]; placementStrategy: string; accuracy: any; }
export interface PremiumReportInfo { reportId: string; generatedAt: string; status: string; downloadUrl: string; solarCalculation?: SolarCalculationResponse; accuracy?: any; }
export interface PanelComparisonData { panelTypeName: string; efficiencyPercent: number; costPerKw: number; areaPerKw: number; warrantyYears: number; degradationPerYear: number; temperatureCoefficient: number; bestFor: string; solarCalculation?: SolarCalculationResponse; }
export interface BuildingEnergyResult { targetBuilding: any; neighborBuildings: any[]; totalBuildingsAnalyzed: number; annualEnergyWithShadowKwh: number; annualEnergyWithoutShadowKwh: number; shadowLossPercent: number; monthlyShadowEnergy: any[]; neighborShadowImpacts: any[]; analysisSummary: string; }

const BASE_URL = Platform.select({
  android: 'http://10.0.2.2:5029',
  default: 'http://localhost:5029',
});

class SolarApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Solar ─────────────────────────────────────
  async calculate(request: SolarCalculationRequest): Promise<SolarCalculationResponse> {
    const { data } = await this.client.post('/api/solar/calculate', request);
    return data;
  }

  // ── Premium ───────────────────────────────────
  async analyzeShadows(request: any): Promise<ShadowAnalysisResult> {
    const { data } = await this.client.post('/api/premium/shadow-analysis', request);
    return data;
  }

  async calculatePanelPlacement(request: any): Promise<PanelPlacementResult> {
    const { data } = await this.client.post('/api/premium/panel-placement', request);
    return data;
  }

  async generateReport(request: any): Promise<PremiumReportInfo> {
    const { data } = await this.client.post('/api/premium/generate-report', request);
    return data;
  }

  async downloadReport(reportId: string): Promise<string> {
    const { data } = await this.client.get(`/api/premium/report/${reportId}/download`, {
      responseType: 'arraybuffer',
    });
    // Convert to base64 for RN handling
    const base64 = Buffer.from(data).toString('base64');
    return `data:application/pdf;base64,${base64}`;
  }

  async comparePanels(roofArea: number, lat: number, lng: number): Promise<PanelComparisonData[]> {
    const { data } = await this.client.get('/api/premium/compare-panels', {
      params: { roofArea, lat, lng },
    });
    return data;
  }

  async analyzePanelArray(request: any): Promise<any> {
    const { data } = await this.client.post('/api/premium/panel-array-analysis', request);
    return data;
  }

  async analyzeBuildingEnergy(request: any): Promise<BuildingEnergyResult> {
    const { data } = await this.client.post('/api/premium/building-energy', request);
    return data;
  }

  // ── Leads ─────────────────────────────────────
  async submitLead(lead: any): Promise<any> {
    const { data } = await this.client.post('/api/leads', lead);
    return data;
  }
}

export const apiClient = new SolarApiClient();
export default apiClient;
