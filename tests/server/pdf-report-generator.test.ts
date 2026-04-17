import { PdfReportGenerator } from '../../server/src/services/reporting/pdf-report-generator';
import { PremiumReportInfo } from '../../shared/src';

describe('PdfReportGenerator', () => {
  const generator = new PdfReportGenerator();

  test('generatePdfAsync returns non-empty bytes starting with %PDF', async () => {
    const info: PremiumReportInfo = {
      reportId: 'test-12345678-abcd',
      generatedAt: new Date().toISOString(),
      status: 'Ready',
      downloadUrl: '/api/premium/report/test/download',
      solarCalculation: {
        systemCapacityKw: 3,
        usableAreaSqm: 15,
        numberOfPanels: 8,
        annualGenerationKwh: 4500,
        co2SavedTonnes: 3.69,
        monthlyGeneration: [
          { month: 'Jan', ghiKwhPerSqmPerDay: 4.5, generationKwh: 350, savingsRupees: 2800 },
          { month: 'Feb', ghiKwhPerSqmPerDay: 5.2, generationKwh: 380, savingsRupees: 3040 },
          { month: 'Mar', ghiKwhPerSqmPerDay: 5.8, generationKwh: 420, savingsRupees: 3360 },
          { month: 'Apr', ghiKwhPerSqmPerDay: 6.2, generationKwh: 440, savingsRupees: 3520 },
          { month: 'May', ghiKwhPerSqmPerDay: 6.5, generationKwh: 460, savingsRupees: 3680 },
          { month: 'Jun', ghiKwhPerSqmPerDay: 5.5, generationKwh: 390, savingsRupees: 3120 },
          { month: 'Jul', ghiKwhPerSqmPerDay: 4.5, generationKwh: 340, savingsRupees: 2720 },
          { month: 'Aug', ghiKwhPerSqmPerDay: 4.8, generationKwh: 360, savingsRupees: 2880 },
          { month: 'Sep', ghiKwhPerSqmPerDay: 5.0, generationKwh: 370, savingsRupees: 2960 },
          { month: 'Oct', ghiKwhPerSqmPerDay: 5.2, generationKwh: 380, savingsRupees: 3040 },
          { month: 'Nov', ghiKwhPerSqmPerDay: 4.8, generationKwh: 360, savingsRupees: 2880 },
          { month: 'Dec', ghiKwhPerSqmPerDay: 4.0, generationKwh: 320, savingsRupees: 2560 },
        ],
        financial: {
          totalInstallationCostRupees: 186000,
          subsidyAmountRupees: 78000,
          netCostRupees: 108000,
          annualSavingsRupees: 36000,
          paybackYears: 3,
          twentyFiveYearSavingsRupees: 1200000,
          roiPercent: 1011,
          tariffPerKwh: 8,
          tariffEscalationPercent: 3,
          degradationPercentPerYear: 0.5,
          inverterReplacementCostRupees: 24000,
          inverterReplacementYear: 12,
        },
        subsidy: {
          systemCapacityKw: 3,
          subsidyPerKw: 26000,
          totalSubsidy: 78000,
          explanation: 'PM Surya Ghar subsidy',
        },
      },
      accuracy: {
        confidenceScore: 65,
        confidenceLabel: 'Moderate',
        dataSources: ['Open-Meteo', 'OSM'],
        assumptions: ['Clear-sky model'],
        limitations: ['No terrain shading'],
      },
    };

    const bytes = await generator.generatePdfAsync(info);
    expect(bytes.length).toBeGreaterThan(0);
    // PDF magic bytes
    const header = bytes.slice(0, 4).toString('ascii');
    expect(header).toBe('%PDF');
  }, 15000);
});
