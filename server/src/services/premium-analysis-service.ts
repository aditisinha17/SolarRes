import { v4 as uuidv4 } from 'uuid';
import {
  IPremiumAnalysisService,
  IBuildingContextProvider,
  IShadowModel,
  ISolarCalculationService,
  IReportGenerator,
  IReportStore,
  ShadowAnalysisRequest,
  ShadowAnalysisResult,
  HourlyShadowData,
  PanelPlacementRequest,
  PanelPlacementResult,
  PanelPosition,
  PremiumReportRequest,
  PremiumReportInfo,
  PanelComparisonData,
  PanelArrayAnalysisRequest,
  PanelArrayAnalysisResult,
  PerPanelResult,
  PanelConfig,
  HourlyShadowFraction,
  BuildingEnergyRequest,
  BuildingEnergyResult,
  MonthlyShadowEnergy,
  NeighborShadowImpact,
  HourlyEnergyProfile,
  OsmBuilding,
  PanelType,
  SolarCalculator,
} from 'solar-res-shared';
import { AccuracyMetaBuilder } from './accuracy/accuracy-meta-builder';
import { SolarCalculationService } from './solar-calculation-service';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const IST_OFFSET = 5.5;

export class PremiumAnalysisService implements IPremiumAnalysisService {
  constructor(
    private buildingProvider: IBuildingContextProvider,
    private shadowModel: IShadowModel,
    private solarCalcService: ISolarCalculationService,
    private reportGenerator: IReportGenerator,
    private reportStore: IReportStore
  ) {}

  // ── Shadow Analysis ─────────────────────────────────────
  async analyzeShadowsAsync(request: ShadowAnalysisRequest): Promise<ShadowAnalysisResult> {
    const { latitude, longitude, roofAreaSqm, buildingHeightMeters = 3, analysisMonth = 6 } = request;

    const buildings = await this.buildingProvider.getBuildingsAsync(latitude, longitude, 200);
    const hasBuildingData = buildings.length > 0;

    // Find or create target building
    let target = findNearestBuilding(buildings, latitude, longitude);
    if (!target) {
      target = {
        id: 0, centroidLatitude: latitude, centroidLongitude: longitude,
        heightMeters: buildingHeightMeters, levels: Math.round(buildingHeightMeters / 3),
        roofAreaSqm, footprint: [],
      };
    }

    const neighbors = buildings.filter((b: OsmBuilding) => b.id !== target!.id);

    // Build hourly profile (6AM - 6PM IST)
    const hourlyProfile: HourlyShadowData[] = [];
    let totalShaded = 0;
    let profileCount = 0;

    for (let istHour = 6; istHour <= 18; istHour += 0.5) {
      const utcMinutes = Math.round((istHour - IST_OFFSET) * 60);
      const utcDate = new Date(Date.UTC(2024, analysisMonth - 1, 15,
        Math.floor(utcMinutes / 60), utcMinutes % 60));

      const sunPos = SolarCalculator.calculate(utcDate, latitude, longitude);

      let maxShadow = 0;
      for (const neighbor of neighbors) {
        const frac = this.shadowModel.calculateShadowFraction(
          target!, neighbor, sunPos.azimuth, sunPos.elevation);
        maxShadow = Math.max(maxShadow, frac);
      }

      // Clear-sky irradiance
      const zenithRad = ((90 - Math.max(0, sunPos.elevation)) * Math.PI) / 180;
      const cosZ = Math.cos(zenithRad);
      const irradiance = sunPos.elevation > 0 && cosZ > 0
        ? 1098 * cosZ * Math.exp(-0.057 / cosZ) : 0;

      hourlyProfile.push({
        hour: istHour,
        shadedPercent: Math.round(maxShadow * 100),
        sunElevation: Math.round(sunPos.elevation * 10) / 10,
        sunAzimuth: Math.round(sunPos.azimuth * 10) / 10,
        irradianceWPerSqm: Math.round(irradiance),
      });

      if (irradiance > 0) {
        totalShaded += maxShadow;
        profileCount++;
      }
    }

    const avgShaded = profileCount > 0 ? totalShaded / profileCount : 0;

    // Mid-day sun position for summary
    const midUtc = new Date(Date.UTC(2024, analysisMonth - 1, 15, 6, 30)); // 12 IST
    const midSun = SolarCalculator.calculate(midUtc, latitude, longitude);

    return {
      sunAzimuth: Math.round(midSun.azimuth * 10) / 10,
      sunElevation: Math.round(midSun.elevation * 10) / 10,
      shadedAreaPercent: Math.round(avgShaded * 100),
      effectiveIrradianceKwhPerSqm: Math.round((1 - avgShaded) * 5.5 * 100) / 100,
      hourlyProfile,
      analysisSummary: `Shadow analysis for ${MONTHS[analysisMonth - 1]}: ` +
        `${neighbors.length} neighboring buildings analyzed. ` +
        `Average ${Math.round(avgShaded * 100)}% shadow during daylight hours.`,
      accuracy: AccuracyMetaBuilder.forShadowAnalysis(hasBuildingData, buildings.length),
    };
  }

  // ── Building Energy ─────────────────────────────────────
  async analyzeBuildingEnergyAsync(request: BuildingEnergyRequest): Promise<BuildingEnergyResult> {
    const { latitude, longitude, radiusMeters = 200, panelEfficiency = 0.21 } = request;

    const buildings = await this.buildingProvider.getBuildingsAsync(latitude, longitude, radiusMeters);

    let target = request.targetBuildingOsmId
      ? buildings.find((b: OsmBuilding) => b.id === request.targetBuildingOsmId)
      : findNearestBuilding(buildings, latitude, longitude);

    if (!target) {
      target = {
        id: 0, centroidLatitude: latitude, centroidLongitude: longitude,
        heightMeters: 9, levels: 3, roofAreaSqm: 100, footprint: [],
      };
    }

    const neighbors = buildings.filter((b: OsmBuilding) => b.id !== target!.id);
    const usableRoof = target.roofAreaSqm * 0.7;
    const systemCapacity = usableRoof * panelEfficiency / 1000 * 200; // rough sizing

    // 12-month × hourly analysis
    const monthlyShadowEnergy: MonthlyShadowEnergy[] = [];
    let annualWithShadow = 0;
    let annualWithoutShadow = 0;
    const neighborShadowSums: Map<number, number> = new Map();

    for (let m = 0; m < 12; m++) {
      let monthWithShadow = 0;
      let monthWithout = 0;
      let monthShaded = 0;
      let monthHours = 0;

      for (let istHour = 6; istHour <= 18; istHour += 0.5) {
        const utcMinutes = Math.round((istHour - IST_OFFSET) * 60);
        const utcDate = new Date(Date.UTC(2024, m, 15,
          Math.floor(utcMinutes / 60), utcMinutes % 60));

        const sunPos = SolarCalculator.calculate(utcDate, latitude, longitude);
        if (sunPos.elevation <= 0) continue;

        const zenithRad = ((90 - sunPos.elevation) * Math.PI) / 180;
        const cosZ = Math.cos(zenithRad);
        if (cosZ <= 0) continue;

        const ghi = 1098 * cosZ * Math.exp(-0.057 / cosZ);
        if (ghi <= 0) continue;

        let maxShadow = 0;
        for (const n of neighbors) {
          const frac = this.shadowModel.calculateShadowFraction(target!, n, sunPos.azimuth, sunPos.elevation);
          if (frac > 0) {
            neighborShadowSums.set(n.id, (neighborShadowSums.get(n.id) || 0) + frac);
          }
          maxShadow = Math.max(maxShadow, frac);
        }

        const energyNoShadow = ghi * panelEfficiency * usableRoof / 1000;
        const energyWithShadow = energyNoShadow * (1 - maxShadow);

        monthWithout += energyNoShadow * 0.5;
        monthWithShadow += energyWithShadow * 0.5;
        monthShaded += maxShadow;
        monthHours += 0.5;
      }

      const days = DAYS_IN_MONTH[m];
      const genWithout = monthWithout * days / 13; // normalize from hourly samples
      const genWith = monthWithShadow * days / 13;

      annualWithoutShadow += genWithout;
      annualWithShadow += genWith;

      monthlyShadowEnergy.push({
        monthName: MONTHS[m],
        monthNumber: m + 1,
        avgShadedPercent: monthHours > 0 ? Math.round((monthShaded / monthHours) * 100) : 0,
        effectiveIrradianceKwhPerSqm: Math.round((genWith / Math.max(1, usableRoof)) * 100) / 100,
        generationWithShadowKwh: Math.round(genWith),
        generationWithoutShadowKwh: Math.round(genWithout),
        shadowLossPercent: genWithout > 0 ? Math.round(((genWithout - genWith) / genWithout) * 100) : 0,
        peakSunHours: monthHours > 0 ? Math.round((monthHours * 0.8) * 10) / 10 : 0,
      });
    }

    // Representative June day profile
    const representativeDayProfile: HourlyEnergyProfile[] = [];
    for (let istHour = 5; istHour <= 19; istHour += 0.5) {
      const utcMinutes = Math.round((istHour - IST_OFFSET) * 60);
      const utcDate = new Date(Date.UTC(2024, 5, 15, Math.floor(utcMinutes / 60), utcMinutes % 60));
      const sunPos = SolarCalculator.calculate(utcDate, latitude, longitude);

      const zenithRad = ((90 - Math.max(0, sunPos.elevation)) * Math.PI) / 180;
      const cosZ = Math.cos(zenithRad);
      const irr = sunPos.elevation > 0 && cosZ > 0 ? 1098 * cosZ * Math.exp(-0.057 / cosZ) : 0;

      let shadow = 0;
      for (const n of neighbors) {
        shadow = Math.max(shadow,
          this.shadowModel.calculateShadowFraction(target!, n, sunPos.azimuth, sunPos.elevation));
      }

      representativeDayProfile.push({
        hour: istHour,
        irradianceWPerSqm: Math.round(irr),
        shadowFraction: Math.round(shadow * 100) / 100,
        effectiveIrradianceWPerSqm: Math.round(irr * (1 - shadow)),
      });
    }

    // Top 20 neighbor impacts
    const shadowLoss = annualWithoutShadow > 0
      ? ((annualWithoutShadow - annualWithShadow) / annualWithoutShadow) * 100 : 0;

    const totalShadowSum = Array.from(neighborShadowSums.values()).reduce((a: number, b: number) => a + b, 0) || 1;

    const neighborImpacts: NeighborShadowImpact[] = neighbors
      .map((n: OsmBuilding) => {
        const contribution = neighborShadowSums.get(n.id) || 0;
        const dist = haversineDistance(
          target!.centroidLatitude, target!.centroidLongitude,
          n.centroidLatitude, n.centroidLongitude);
        const bearing = calculateBearing(
          target!.centroidLatitude, target!.centroidLongitude,
          n.centroidLatitude, n.centroidLongitude);

        return {
          buildingId: n.id,
          name: n.name,
          distanceMeters: Math.round(dist),
          heightMeters: n.heightMeters,
          shadowContributionPercent: Math.round((contribution / totalShadowSum) * 100),
          directionDegrees: Math.round(bearing),
          directionLabel: bearingToCompass(bearing),
        };
      })
      .sort((a: NeighborShadowImpact, b: NeighborShadowImpact) => b.shadowContributionPercent - a.shadowContributionPercent)
      .slice(0, 20);

    return {
      targetBuilding: target,
      neighborBuildings: neighbors.slice(0, 20),
      totalBuildingsAnalyzed: buildings.length,
      annualEnergyWithShadowKwh: Math.round(annualWithShadow),
      annualEnergyWithoutShadowKwh: Math.round(annualWithoutShadow),
      shadowLossPercent: Math.round(shadowLoss * 10) / 10,
      usableRoofSqm: Math.round(usableRoof * 10) / 10,
      systemCapacityKw: Math.round(systemCapacity * 10) / 10,
      monthlyShadowEnergy,
      representativeDayProfile,
      neighborShadowImpacts: neighborImpacts,
      analysisSummary: `Analyzed ${buildings.length} buildings within ${radiusMeters}m radius. ` +
        `Shadow loss: ${Math.round(shadowLoss)}%. ` +
        `${neighborImpacts.filter(n => n.shadowContributionPercent > 5).length} significant shadow sources.`,
    };
  }

  // ── Panel Placement ─────────────────────────────────────
  async calculatePanelPlacementAsync(request: PanelPlacementRequest): Promise<PanelPlacementResult> {
    const {
      latitude, longitude, roofAreaSqm,
      numberOfPanels = 10,
      tiltDegrees = 15,
      orientationAzimuth = 180,
      panelType = PanelType.Monocrystalline,
    } = request;

    const panelW = 1.72;
    const panelH = 1.13;
    const spacing = 0.3;

    const buildings = await this.buildingProvider.getBuildingsAsync(latitude, longitude, 50);
    const target = findNearestBuilding(buildings, latitude, longitude);
    const hasFootprint = !!target && target.footprint.length >= 3;

    const panels: PanelPosition[] = [];

    if (hasFootprint && target) {
      // Place panels within footprint polygon (15% setback)
      const fp = target.footprint;
      const centLat = target.centroidLatitude;
      const centLon = target.centroidLongitude;

      // Setback: push vertices 1 meter towards centroid
      const scaledFp = fp.map((p: number[]) => {
        const dLat = centLat - p[0];
        const dLng = centLon - p[1];
        const distDeg = Math.sqrt(dLat * dLat + dLng * dLng);
        const moveDeg = 1.0 / 111320; // approx 1 meter in degrees
        if (distDeg < moveDeg * 2) return [centLat, centLon];
        const ratio = moveDeg / distDeg;
        return [
          p[0] + dLat * ratio,
          p[1] + dLng * ratio,
        ];
      });

      // Find optimal orientation based on longest edge
      let longestEdgeLength = 0;
      let optimalAzimuth = orientationAzimuth;

      for (let i = 0; i < fp.length; i++) {
        const p1 = fp[i];
        const p2 = fp[(i + 1) % fp.length];
        const dist = haversineDistance(p1[0], p1[1], p2[0], p2[1]);
        if (dist > longestEdgeLength) {
          longestEdgeLength = dist;
          const bearing = calculateBearing(p1[0], p1[1], p2[0], p2[1]);
          const normal1 = (bearing + 90) % 360;
          const normal2 = (bearing + 270) % 360;
          // Choose the normal that faces closest to South (180)
          optimalAzimuth = Math.abs(normal1 - 180) < Math.abs(normal2 - 180) ? normal1 : normal2;
        }
      }

      // Grid within bounding box
      const lats = scaledFp.map((p: number[]) => p[0]);
      const lngs = scaledFp.map((p: number[]) => p[1]);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

      const latStep = (panelH + spacing) / 111320;
      const cosLat = Math.cos((centLat * Math.PI) / 180);
      const lngStep = (panelW + spacing) / (111320 * cosLat);

      let placed = 0;
      for (let lat = minLat; lat <= maxLat && placed < numberOfPanels; lat += latStep) {
        for (let lng = minLng; lng <= maxLng && placed < numberOfPanels; lng += lngStep) {
          if (pointInPolygon(lat, lng, scaledFp)) {
            panels.push({
              index: placed,
              latitudeOffset: lat - centLat,
              longitudeOffset: lng - centLon,
              rotationDegrees: Math.round(optimalAzimuth),
              widthMeters: panelW,
              heightMeters: panelH,
              isOptimal: true,
            });
            placed++;
          }
        }
      }
    } else {
      // Rectangular grid placement
      const cols = Math.ceil(Math.sqrt(numberOfPanels * (panelW / panelH)));
      const rows = Math.ceil(numberOfPanels / cols);
      let placed = 0;

      for (let r = 0; r < rows && placed < numberOfPanels; r++) {
        for (let c = 0; c < cols && placed < numberOfPanels; c++) {
          panels.push({
            index: placed,
            latitudeOffset: r * (panelH + spacing) / 111320,
            longitudeOffset: c * (panelW + spacing) / (111320 * Math.cos((latitude * Math.PI) / 180)),
            rotationDegrees: orientationAzimuth,
            widthMeters: panelW,
            heightMeters: panelH,
            isOptimal: r === 0,
          });
          placed++;
        }
      }
    }

    const efficiencyMap: Record<PanelType, number> = {
      [PanelType.Monocrystalline]: 0.21,
      [PanelType.Polycrystalline]: 0.17,
      [PanelType.ThinFilm]: 0.13,
    };

    const panelAreaTotal = panels.length * panelW * panelH;
    const capacity = panelAreaTotal * efficiencyMap[panelType] / 1000 * 200;
    const coverage = roofAreaSqm > 0 ? (panelAreaTotal / roofAreaSqm) * 100 : 0;

    return {
      totalPanelsPlaced: panels.length,
      coveragePercent: Math.round(coverage * 10) / 10,
      estimatedCapacityKw: Math.round(capacity * 10) / 10,
      panels,
      placementStrategy: hasFootprint ? 'OSM footprint polygon with 1m setback and edge alignment' : 'Rectangular grid',
      accuracy: AccuracyMetaBuilder.forPanelPlacement(hasFootprint, panels.length),
    };
  }

  // ── Panel Array Analysis ────────────────────────────────
  async analyzePanelArrayAsync(request: PanelArrayAnalysisRequest): Promise<PanelArrayAnalysisResult> {
    const { latitude, longitude, panels } = request;
    const perPanelResults: PerPanelResult[] = [];

    let totalCapacity = 0;
    let totalGeneration = 0;
    const tariff = 8.0;

    for (const panel of panels) {
      const w = panel.widthMeters || 1.72;
      const h = panel.heightMeters || 1.13;
      const eff = (panel.efficiencyPercent || 21) / 100;
      const panelArea = w * h;
      const capacity = panelArea * eff / 1000 * 200;

      let annualPoa = 0;
      let shadowSum = 0;
      let shadowCount = 0;

      // Loop each month, 15th day, hours 5-19 IST
      for (let m = 0; m < 12; m++) {
        for (let istHour = 5; istHour <= 19; istHour++) {
          const utcHour = istHour - IST_OFFSET;
          const utcDate = new Date(Date.UTC(2024, m, 15,
            Math.floor(utcHour), (utcHour % 1) * 60));

          const poa = SolarCalculationService.calculateHourlyPoa(
            latitude, longitude, panel.tiltDegrees, panel.azimuthDegrees, utcDate);

          // Apply shadow fraction if provided
          let shadowFrac = 0;
          if (panel.hourlyShadowFractions) {
            const match = panel.hourlyShadowFractions.find((f: HourlyShadowFraction) => f.hour === istHour);
            if (match) shadowFrac = match.shadowFraction;
          }

          annualPoa += poa * (1 - shadowFrac) * DAYS_IN_MONTH[m] / 13;
          shadowSum += shadowFrac;
          shadowCount++;
        }
      }

      const annualGen = annualPoa * panelArea / 1000 * 0.78;
      const avgShadow = shadowCount > 0 ? shadowSum / shadowCount : 0;

      perPanelResults.push({
        panelId: panel.panelId,
        capacityKw: Math.round(capacity * 100) / 100,
        annualGenerationKwh: Math.round(annualGen),
        avgShadowFraction: Math.round(avgShadow * 1000) / 1000,
        effectiveIrradianceKwhPerSqm: Math.round(annualPoa * (1 - avgShadow)),
      });

      totalCapacity += capacity;
      totalGeneration += annualGen;
    }

    const has3dData = panels.some((p: PanelConfig) => p.hourlyShadowFractions && p.hourlyShadowFractions.length > 0);
    const avgShadowLoss = perPanelResults.length > 0
      ? perPanelResults.reduce((s: number, p: PerPanelResult) => s + p.avgShadowFraction, 0) / perPanelResults.length * 100 : 0;

    const annualSavings = totalGeneration * tariff;
    const systemCost = totalCapacity * 62000;
    const payback = annualSavings > 0 ? Math.ceil(systemCost / annualSavings) : 25;

    return {
      totalCapacityKw: Math.round(totalCapacity * 100) / 100,
      totalAnnualGenerationKwh: Math.round(totalGeneration),
      totalAnnualSavingsRupees: Math.round(annualSavings),
      averageShadowLossPercent: Math.round(avgShadowLoss * 10) / 10,
      paybackYears: Math.min(25, payback),
      perPanelResults,
    };
  }

  // ── Report Generation ───────────────────────────────────
  async generateReportAsync(request: PremiumReportRequest): Promise<PremiumReportInfo> {
    const reportId = uuidv4();

    // Run all analyses
    const solarCalc = await this.solarCalcService.calculateAsync({
      latitude: request.latitude,
      longitude: request.longitude,
      roofAreaSqm: request.roofAreaSqm,
      tiltDegrees: request.tiltDegrees,
      orientationAzimuth: request.orientationAzimuth,
      panelType: request.panelType,
      monthlyBillRupees: request.monthlyBillRupees,
      obstructionPercent: request.obstructionPercent,
    });

    const shadowAnalysis = await this.analyzeShadowsAsync({
      latitude: request.latitude,
      longitude: request.longitude,
      roofAreaSqm: request.roofAreaSqm,
      buildingHeightMeters: request.buildingHeightMeters,
    });

    const panelPlacement = await this.calculatePanelPlacementAsync({
      latitude: request.latitude,
      longitude: request.longitude,
      roofAreaSqm: request.roofAreaSqm,
      numberOfPanels: request.numberOfPanels,
      tiltDegrees: request.tiltDegrees,
      panelType: request.panelType,
    });

    let buildingEnergy: BuildingEnergyResult | undefined;
    try {
      buildingEnergy = await this.analyzeBuildingEnergyAsync({
        latitude: request.latitude,
        longitude: request.longitude,
      });
    } catch { /* optional */ }

    const panelComparison = await this.getPanelComparisonAsync(
      request.roofAreaSqm, request.latitude, request.longitude);

    const componentScores = [
      shadowAnalysis.accuracy.confidenceScore,
      panelPlacement.accuracy.confidenceScore,
    ];

    const reportInfo: PremiumReportInfo = {
      reportId,
      generatedAt: new Date().toISOString(),
      status: 'Generating',
      downloadUrl: `/api/premium/report/${reportId}/download`,
      solarCalculation: solarCalc,
      shadowAnalysis,
      panelPlacement,
      buildingEnergy,
      panelComparison,
      accuracy: AccuracyMetaBuilder.forReport(
        shadowAnalysis.accuracy.dataSources.some((s: string) => s.includes('OSM')),
        true,
        componentScores
      ),
    };

    // Generate PDF
    const pdfBytes = await this.reportGenerator.generatePdfAsync(reportInfo);
    await this.reportStore.saveAsync(reportId, pdfBytes);

    reportInfo.status = 'Ready';
    return reportInfo;
  }

  // ── Panel Comparison ────────────────────────────────────
  async getPanelComparisonAsync(roofArea: number, lat: number, lng: number): Promise<PanelComparisonData[]> {
    const types: { type: PanelType; eff: number; cost: number; area: number; warranty: number; deg: number; tempCoef: number; best: string }[] = [
      { type: PanelType.Monocrystalline, eff: 21, cost: 62000, area: 4.8, warranty: 25, deg: 0.5, tempCoef: -0.35, best: 'Maximum efficiency, limited roof space' },
      { type: PanelType.Polycrystalline, eff: 17, cost: 52000, area: 5.9, warranty: 25, deg: 0.6, tempCoef: -0.40, best: 'Budget-friendly, moderate performance' },
      { type: PanelType.ThinFilm, eff: 13, cost: 45000, area: 7.7, warranty: 20, deg: 0.8, tempCoef: -0.20, best: 'Hot climates, curved surfaces, low cost' },
    ];

    const comparisons: PanelComparisonData[] = [];
    for (const t of types) {
      let solarCalc;
      try {
        solarCalc = await this.solarCalcService.calculateAsync({
          latitude: lat, longitude: lng, roofAreaSqm: roofArea, panelType: t.type,
        });
      } catch { /* skip */ }

      let npv = undefined;
      let dynamicRoi = undefined;

      if (solarCalc) {
        const netCost = solarCalc.financial.netCostRupees;
        const discountRate = 0.08;
        let cumulativeNpv = -netCost;
        let cumulativeSavings = 0;

        for (let year = 1; year <= t.warranty; year++) {
          const yearDeg = Math.pow(1 - (t.deg / 100), year);
          const yearTariff = solarCalc.financial.tariffPerKwh * Math.pow(1 + (solarCalc.financial.tariffEscalationPercent / 100), year - 1);
          let yearSavings = solarCalc.annualGenerationKwh * yearDeg * yearTariff;

          if (year === solarCalc.financial.inverterReplacementYear) {
            yearSavings -= solarCalc.financial.inverterReplacementCostRupees;
          }
          cumulativeSavings += yearSavings;
          cumulativeNpv += yearSavings / Math.pow(1 + discountRate, year);
        }

        npv = Math.round(cumulativeNpv);
        dynamicRoi = netCost > 0 ? Math.round(((cumulativeSavings - netCost) / netCost) * 100) : 0;
      }

      comparisons.push({
        panelTypeName: t.type,
        efficiencyPercent: t.eff,
        costPerKw: t.cost,
        areaPerKw: t.area,
        warrantyYears: t.warranty,
        degradationPerYear: t.deg,
        temperatureCoefficient: t.tempCoef,
        bestFor: t.best,
        solarCalculation: solarCalc,
        npvRupees: npv,
        dynamicRoiPercent: dynamicRoi,
      });
    }

    return comparisons;
  }
}

// ── Helper Functions ────────────────────────────────────

function findNearestBuilding(buildings: OsmBuilding[], lat: number, lng: number): OsmBuilding | undefined {
  if (buildings.length === 0) return undefined;
  let nearest = buildings[0];
  let minDist = Infinity;
  for (const b of buildings) {
    const d = haversineDistance(lat, lng, b.centroidLatitude, b.centroidLongitude);
    if (d < minDist) { minDist = d; nearest = b; }
  }
  return nearest;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x = Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

const COMPASS_DIRS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];

function bearingToCompass(bearing: number): string {
  const idx = Math.round(bearing / 22.5) % 16;
  return COMPASS_DIRS[idx];
}

function pointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0];
    const xj = polygon[j][1], yj = polygon[j][0];
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
