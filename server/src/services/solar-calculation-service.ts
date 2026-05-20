import {
  ISolarCalculationService,
  IWeatherDataClient,
  ISubsidyCalculator,
  SolarCalculationRequest,
  SolarCalculationResponse,
  MonthlyData,
  PanelType,
  SolarCalculator,
} from 'solar-res-shared';

// ── Constants ──────────────────────────────────────────────
const PANEL_SIZE_PER_KW: Record<PanelType, number> = {
  [PanelType.Monocrystalline]: 4.8,
  [PanelType.Polycrystalline]: 5.9,
  [PanelType.ThinFilm]: 7.7,
};

const COST_PER_KW: Record<PanelType, number> = {
  [PanelType.Monocrystalline]: 62000,
  [PanelType.Polycrystalline]: 52000,
  [PanelType.ThinFilm]: 45000,
};

const DEGRADATION: Record<PanelType, number> = {
  [PanelType.Monocrystalline]: 0.005,
  [PanelType.Polycrystalline]: 0.006,
  [PanelType.ThinFilm]: 0.008,
};

const getPerformanceRatio = (panelType: PanelType) => {
  switch (panelType) {
    case PanelType.Monocrystalline: return 0.81;
    case PanelType.Polycrystalline: return 0.78;
    case PanelType.ThinFilm: return 0.75;
    default: return 0.78;
  }
};
const CO2_FACTOR = 0.82;
const USABLE_ROOF_FRACTION = 0.70;
const TARIFF_ESCALATION = 0.03;
const INVERTER_REPLACEMENT_COST_PER_KW = 8000;
const INVERTER_REPLACEMENT_YEAR = 12;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const PANEL_AREA_SQM = 1.72 * 1.13;

export class SolarCalculationService implements ISolarCalculationService {
  constructor(
    private weatherClient: IWeatherDataClient,
    private subsidyCalc: ISubsidyCalculator
  ) {}

  async calculateAsync(request: SolarCalculationRequest): Promise<SolarCalculationResponse> {
    const {
      latitude,
      longitude,
      roofAreaSqm,
      tiltDegrees = 15,
      orientationAzimuth = 180,
      panelType = PanelType.Monocrystalline,
      obstructionPercent = 10,
      tariffPerKwh = 8.0,
    } = request;

    const monthlyGhi = await this.weatherClient.getMonthlyGhiAsync(latitude, longitude);
    const usableArea = roofAreaSqm * USABLE_ROOF_FRACTION * (1 - obstructionPercent / 100);
    const rawCapacity = usableArea / PANEL_SIZE_PER_KW[panelType];
    const systemCapacity = Math.round(rawCapacity * 2) / 2;

    if (systemCapacity <= 0) {
      throw new Error('Roof area too small for any panels');
    }

    const tiltFactor = SolarCalculationService.calculateAnnualPoaRatio(
      latitude, longitude, tiltDegrees, orientationAzimuth
    );
    const numberOfPanels = Math.max(1, Math.floor(usableArea / PANEL_AREA_SQM));

    const monthlyGeneration: MonthlyData[] = [];
    let totalAnnualGen = 0;

    for (let m = 0; m < 12; m++) {
      const ghi = monthlyGhi[MONTHS[m]] || 5.0;
      const days = DAYS_IN_MONTH[m];
      const pr = getPerformanceRatio(panelType);
      const gen = ghi * tiltFactor * systemCapacity * pr * days;
      const savings = gen * tariffPerKwh;
      totalAnnualGen += gen;
      monthlyGeneration.push({
        month: MONTHS[m],
        ghiKwhPerSqmPerDay: Math.round(ghi * 100) / 100,
        generationKwh: Math.round(gen * 10) / 10,
        savingsRupees: Math.round(savings),
      });
    }

    const co2Saved = (totalAnnualGen / 1000) * CO2_FACTOR;
    const degradation = DEGRADATION[panelType];
    const totalCost = systemCapacity * COST_PER_KW[panelType];
    const subsidy = this.subsidyCalc.calculate(systemCapacity);
    const netCost = totalCost - subsidy.totalSubsidy;
    const annualSavings = totalAnnualGen * tariffPerKwh;
    const inverterCost = systemCapacity * INVERTER_REPLACEMENT_COST_PER_KW;

    let cumulativeSavings = 0;
    let paybackYear = 25;
    let paybackFound = false;

    for (let year = 1; year <= 25; year++) {
      const yearDeg = Math.pow(1 - degradation, year);
      const yearTariff = tariffPerKwh * Math.pow(1 + TARIFF_ESCALATION, year - 1);
      let yearSavings = totalAnnualGen * yearDeg * yearTariff;

      if (year === INVERTER_REPLACEMENT_YEAR) {
        yearSavings -= inverterCost;
      }
      cumulativeSavings += yearSavings;

      if (!paybackFound && cumulativeSavings >= netCost) {
        paybackYear = year;
        paybackFound = true;
      }
    }

    const twentyFiveYearSavings = cumulativeSavings;
    const roi = netCost > 0 ? ((twentyFiveYearSavings - netCost) / netCost) * 100 : 0;

    return {
      systemCapacityKw: systemCapacity,
      usableAreaSqm: Math.round(usableArea * 10) / 10,
      numberOfPanels,
      annualGenerationKwh: Math.round(totalAnnualGen),
      co2SavedTonnes: Math.round(co2Saved * 100) / 100,
      monthlyGeneration,
      financial: {
        totalInstallationCostRupees: Math.round(totalCost),
        subsidyAmountRupees: subsidy.totalSubsidy,
        netCostRupees: Math.round(netCost),
        annualSavingsRupees: Math.round(annualSavings),
        paybackYears: paybackYear,
        twentyFiveYearSavingsRupees: Math.round(twentyFiveYearSavings),
        roiPercent: Math.round(roi),
        tariffPerKwh,
        tariffEscalationPercent: TARIFF_ESCALATION * 100,
        degradationPercentPerYear: degradation * 100,
        inverterReplacementCostRupees: Math.round(inverterCost),
        inverterReplacementYear: INVERTER_REPLACEMENT_YEAR,
      },
      subsidy,
    };
  }

  /**
   * Calculate annual POA/GHI ratio using isotropic sky model.
   * Loops hours 5-19 IST on the 5th, 15th, and 25th of each month.
   */
  static calculateAnnualPoaRatio(
    latitude: number, longitude: number,
    tiltDeg: number, azimuthDeg: number
  ): number {
    const tiltRad = (tiltDeg * Math.PI) / 180;
    const azimuthRad = (azimuthDeg * Math.PI) / 180;
    const albedo = 0.2;

    let totalPoa = 0;
    let totalGhi = 0;

    const testDays = [5, 15, 25];

    for (let month = 0; month < 12; month++) {
      for (const day of testDays) {
        for (let istHour = 5; istHour <= 19; istHour++) {
          const utcHour = istHour - 5.5;
          const utcDate = new Date(Date.UTC(2024, month, day,
            Math.floor(utcHour), (utcHour % 1) * 60));

          const sunPos = SolarCalculator.calculate(utcDate, latitude, longitude);
          if (sunPos.elevation <= 0) continue;

          const zenithRad = ((90 - sunPos.elevation) * Math.PI) / 180;
          const cosZenith = Math.cos(zenithRad);
          if (cosZenith <= 0) continue;

          const ghi = 1098 * cosZenith * Math.exp(-0.057 / cosZenith);
          if (ghi <= 0) continue;

          // Dynamic diffuse fraction based on clearness index proxy (elevation)
          const clearness = 0.5 + 0.4 * Math.sin((sunPos.elevation * Math.PI) / 180);
          const diffuseFraction = Math.max(0.15, Math.min(0.8, 1 - clearness));

          const beam = ghi * (1 - diffuseFraction);
          const diffuse = ghi * diffuseFraction;

          const sunAzRad = (sunPos.azimuth * Math.PI) / 180;
          const sinElev = Math.sin((sunPos.elevation * Math.PI) / 180);
          const cosElev = Math.cos((sunPos.elevation * Math.PI) / 180);

          const cosAOI = sinElev * Math.cos(tiltRad) +
            cosElev * Math.sin(tiltRad) * Math.cos(sunAzRad - azimuthRad);

          const beamPoa = beam * Math.max(0, cosAOI) / cosZenith;
          const diffusePoa = diffuse * (1 + Math.cos(tiltRad)) / 2;
          const groundPoa = ghi * albedo * (1 - Math.cos(tiltRad)) / 2;

          totalPoa += beamPoa + diffusePoa + groundPoa;
          totalGhi += ghi;
        }
      }
    }

    if (totalGhi <= 0) return 1.0;
    return Math.max(0.6, Math.min(1.4, totalPoa / totalGhi));
  }

  /**
   * Calculate hourly POA irradiance on a tilted surface (W/m²).
   */
  static calculateHourlyPoa(
    lat: number, lng: number,
    tiltDeg: number, azimuthDeg: number,
    utcDate: Date
  ): number {
    const sunPos = SolarCalculator.calculate(utcDate, lat, lng);
    if (sunPos.elevation <= 0) return 0;

    const tiltRad = (tiltDeg * Math.PI) / 180;
    const azimuthRad = (azimuthDeg * Math.PI) / 180;

    const zenithRad = ((90 - sunPos.elevation) * Math.PI) / 180;
    const cosZenith = Math.cos(zenithRad);
    if (cosZenith <= 0) return 0;

    const ghi = 1098 * cosZenith * Math.exp(-0.057 / cosZenith);
    if (ghi <= 0) return 0;

    const clearness = 0.5 + 0.4 * Math.sin((sunPos.elevation * Math.PI) / 180);
    const diffuseFraction = Math.max(0.15, Math.min(0.8, 1 - clearness));

    const beam = ghi * (1 - diffuseFraction);
    const diffuse = ghi * diffuseFraction;

    const sunAzRad = (sunPos.azimuth * Math.PI) / 180;
    const sinElev = Math.sin((sunPos.elevation * Math.PI) / 180);
    const cosElev = Math.cos((sunPos.elevation * Math.PI) / 180);

    const cosAOI = sinElev * Math.cos(tiltRad) +
      cosElev * Math.sin(tiltRad) * Math.cos(sunAzRad - azimuthRad);

    const beamPoa = beam * Math.max(0, cosAOI) / cosZenith;
    const diffusePoa = diffuse * (1 + Math.cos(tiltRad)) / 2;
    const groundPoa = ghi * 0.2 * (1 - Math.cos(tiltRad)) / 2;

    return Math.max(0, beamPoa + diffusePoa + groundPoa);
  }
}
