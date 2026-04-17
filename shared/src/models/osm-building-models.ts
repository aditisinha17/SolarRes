export interface OsmBuilding {
  id: number;
  centroidLatitude: number;
  centroidLongitude: number;
  heightMeters: number;
  levels: number;
  roofAreaSqm: number;
  /** Footprint as array of [lat, lng] pairs */
  footprint: number[][];
  name?: string;
  buildingType?: string;
}

export interface BuildingEnergyRequest {
  latitude: number;
  longitude: number;
  radiusMeters?: number;          // default 200
  targetBuildingOsmId?: number;
  panelEfficiency?: number;       // default 0.21
}

export interface BuildingEnergyResult {
  targetBuilding: OsmBuilding;
  neighborBuildings: OsmBuilding[];
  totalBuildingsAnalyzed: number;
  annualEnergyWithShadowKwh: number;
  annualEnergyWithoutShadowKwh: number;
  shadowLossPercent: number;
  usableRoofSqm: number;
  systemCapacityKw: number;
  monthlyShadowEnergy: MonthlyShadowEnergy[];
  representativeDayProfile: HourlyEnergyProfile[];
  neighborShadowImpacts: NeighborShadowImpact[];
  analysisSummary: string;
}

export interface HourlyEnergyProfile {
  hour: number;
  irradianceWPerSqm: number;
  shadowFraction: number;
  effectiveIrradianceWPerSqm: number;
}

export interface MonthlyShadowEnergy {
  monthName: string;
  monthNumber: number;
  avgShadedPercent: number;
  effectiveIrradianceKwhPerSqm: number;
  generationWithShadowKwh: number;
  generationWithoutShadowKwh: number;
  shadowLossPercent: number;
  peakSunHours: number;
}

export interface NeighborShadowImpact {
  buildingId: number;
  name?: string;
  distanceMeters: number;
  heightMeters: number;
  shadowContributionPercent: number;
  directionDegrees: number;
  directionLabel: string; // compass label
}
