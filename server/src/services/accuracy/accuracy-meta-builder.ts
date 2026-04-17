import { PremiumAccuracyMeta } from 'solar-res-shared';

/**
 * Static factory methods to build PremiumAccuracyMeta for various analysis types.
 * Confidence scores are higher when real OSM/3D data is available.
 */
export class AccuracyMetaBuilder {
  static forShadowAnalysis(hasBuildingData: boolean, buildingCount: number): PremiumAccuracyMeta {
    let score = 45;
    if (hasBuildingData) score += 20;
    if (buildingCount > 5) score += 10;
    if (buildingCount > 15) score += 5;
    score = Math.min(85, score);

    return {
      confidenceScore: score,
      confidenceLabel: scoreToLabel(score),
      dataSources: [
        'Open-Meteo historical irradiance (2024)',
        ...(hasBuildingData ? ['OpenStreetMap building footprints & heights'] : []),
        'Jean Meeus solar position algorithm',
      ],
      assumptions: [
        'Clear-sky irradiance model (1098 × cos(z) × exp(-0.057/cos(z)))',
        '30% diffuse fraction, 0.2 ground albedo',
        'Isotropic sky diffuse model',
        'Default 3m per floor for buildings without height data',
      ],
      limitations: [
        'No terrain/topography shading',
        '2D shadow projection (not volumetric)',
        'Weather variability not modeled',
        ...(hasBuildingData ? [] : ['No real building data — using synthetic model']),
      ],
    };
  }

  static forPanelPlacement(hasFootprint: boolean, panelCount: number): PremiumAccuracyMeta {
    let score = 50;
    if (hasFootprint) score += 25;
    if (panelCount > 0 && panelCount <= 50) score += 5;
    score = Math.min(85, score);

    return {
      confidenceScore: score,
      confidenceLabel: scoreToLabel(score),
      dataSources: [
        ...(hasFootprint ? ['OSM building footprint polygon'] : ['Rectangular area estimate']),
        'Standard 72-cell panel dimensions (1.72m × 1.13m)',
      ],
      assumptions: [
        '15% roof setback on each side',
        '0.3m spacing between panels',
        'Flat roof surface assumed',
      ],
      limitations: [
        'No roof obstacle detection',
        'Does not account for roof pitch/slope',
        ...(hasFootprint ? [] : ['No real footprint — using rectangular grid']),
      ],
    };
  }

  static forPanelArrayAnalysis(has3dShadowData: boolean, panelCount: number): PremiumAccuracyMeta {
    let score = 55;
    if (has3dShadowData) score += 20;
    if (panelCount > 3) score += 5;
    score = Math.min(90, score);

    return {
      confidenceScore: score,
      confidenceLabel: scoreToLabel(score),
      dataSources: [
        'Per-panel hourly POA calculation',
        ...(has3dShadowData ? ['Client-side Cesium ray-casting shadow data'] : []),
        'Jean Meeus solar position algorithm',
      ],
      assumptions: [
        'Clear-sky irradiance model',
        'Performance ratio of 0.78',
        'Annual degradation of 0.5%',
      ],
      limitations: [
        'Single-year analysis extrapolated',
        ...(has3dShadowData ? [] : ['No 3D shadow data — uniform exposure assumed']),
      ],
    };
  }

  static forReport(
    hasBuildingData: boolean,
    hasShadowData: boolean,
    componentScores: number[]
  ): PremiumAccuracyMeta {
    const avgScore = componentScores.length > 0
      ? Math.round(componentScores.reduce((a, b) => a + b, 0) / componentScores.length)
      : 50;
    const score = Math.min(90, avgScore);

    return {
      confidenceScore: score,
      confidenceLabel: scoreToLabel(score),
      dataSources: [
        'Open-Meteo historical irradiance',
        'Jean Meeus solar position algorithm',
        ...(hasBuildingData ? ['OpenStreetMap building data'] : []),
        ...(hasShadowData ? ['2D shadow projection model'] : []),
      ],
      assumptions: [
        'PM Surya Ghar subsidy rates (2025)',
        'India Q1 2025 panel pricing',
        '3% annual tariff escalation',
        'Inverter replacement at year 12',
      ],
      limitations: [
        'Estimates only — actual generation depends on weather, maintenance, and local conditions',
        'Subsidy amounts subject to government policy changes',
      ],
    };
  }
}

function scoreToLabel(score: number): string {
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Moderate';
  return 'Low';
}
