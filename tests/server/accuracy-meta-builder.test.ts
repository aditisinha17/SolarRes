import { AccuracyMetaBuilder } from '../../server/src/services/accuracy/accuracy-meta-builder';

describe('AccuracyMetaBuilder', () => {
  describe('forShadowAnalysis', () => {
    test('score ranges — no building data', () => {
      const meta = AccuracyMetaBuilder.forShadowAnalysis(false, 0);
      expect(meta.confidenceScore).toBeGreaterThanOrEqual(40);
      expect(meta.confidenceScore).toBeLessThanOrEqual(55);
      expect(meta.confidenceLabel).toBeDefined();
    });

    test('building data increases score', () => {
      const without = AccuracyMetaBuilder.forShadowAnalysis(false, 0);
      const withData = AccuracyMetaBuilder.forShadowAnalysis(true, 10);
      expect(withData.confidenceScore).toBeGreaterThan(without.confidenceScore);
    });

    test('has correct data sources without building data', () => {
      const meta = AccuracyMetaBuilder.forShadowAnalysis(false, 0);
      expect(meta.dataSources).toContainEqual(expect.stringContaining('Open-Meteo'));
      expect(meta.limitations).toContainEqual(expect.stringContaining('synthetic'));
    });

    test('has OSM data source when building data present', () => {
      const meta = AccuracyMetaBuilder.forShadowAnalysis(true, 5);
      expect(meta.dataSources).toContainEqual(expect.stringContaining('OpenStreetMap'));
    });
  });

  describe('forPanelPlacement', () => {
    test('footprint increases score', () => {
      const without = AccuracyMetaBuilder.forPanelPlacement(false, 10);
      const withFp = AccuracyMetaBuilder.forPanelPlacement(true, 10);
      expect(withFp.confidenceScore).toBeGreaterThan(without.confidenceScore);
    });
  });

  describe('forReport', () => {
    test('aggregates component scores', () => {
      const meta = AccuracyMetaBuilder.forReport(true, true, [70, 60, 80]);
      expect(meta.confidenceScore).toBeGreaterThanOrEqual(65);
      expect(meta.confidenceScore).toBeLessThanOrEqual(75);
    });

    test('handles empty component scores', () => {
      const meta = AccuracyMetaBuilder.forReport(false, false, []);
      expect(meta.confidenceScore).toBe(50);
    });
  });
});
