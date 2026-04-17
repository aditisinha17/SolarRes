import { DefaultShadowModel } from '../../server/src/services/default-shadow-model';
import { OsmBuilding } from '../../shared/src';

describe('DefaultShadowModel', () => {
  const model = new DefaultShadowModel();

  const makeBuilding = (overrides: Partial<OsmBuilding> = {}): OsmBuilding => ({
    id: 1, centroidLatitude: 20.0, centroidLongitude: 78.0,
    heightMeters: 10, levels: 3, roofAreaSqm: 100, footprint: [],
    ...overrides,
  });

  test('ModelName is Projection2D-v1', () => {
    expect(model.modelName).toBe('Projection2D-v1');
  });

  test('No shadow below horizon (elevation <= 0)', () => {
    const target = makeBuilding({ id: 1, heightMeters: 5 });
    const neighbor = makeBuilding({ id: 2, heightMeters: 20, centroidLatitude: 20.001 });
    expect(model.calculateShadowFraction(target, neighbor, 180, 0)).toBe(0);
    expect(model.calculateShadowFraction(target, neighbor, 180, -5)).toBe(0);
  });

  test('No shadow for shorter/equal neighbor', () => {
    const target = makeBuilding({ id: 1, heightMeters: 15 });
    const shorter = makeBuilding({ id: 2, heightMeters: 10, centroidLatitude: 20.001 });
    const equal = makeBuilding({ id: 3, heightMeters: 15, centroidLatitude: 20.001 });
    expect(model.calculateShadowFraction(target, shorter, 180, 45)).toBe(0);
    expect(model.calculateShadowFraction(target, equal, 180, 45)).toBe(0);
  });

  test('Shadow when taller neighbor is aligned', () => {
    const target = makeBuilding({ id: 1, heightMeters: 5, centroidLatitude: 20.0, centroidLongitude: 78.0 });
    const tallNeighbor = makeBuilding({
      id: 2, heightMeters: 30, centroidLatitude: 20.0003, centroidLongitude: 78.0,
      roofAreaSqm: 200,
    });
    // Sun from south (azimuth 180), shadow casts north
    const frac = model.calculateShadowFraction(target, tallNeighbor, 180, 30);
    expect(frac).toBeGreaterThan(0);
  });

  test('Fraction bounded [0, 0.9]', () => {
    const target = makeBuilding({ id: 1, heightMeters: 3 });
    // Very tall, very close neighbor
    const neighbor = makeBuilding({
      id: 2, heightMeters: 100, centroidLatitude: 20.00001, centroidLongitude: 78.0,
      roofAreaSqm: 500,
    });
    const frac = model.calculateShadowFraction(target, neighbor, 0, 15);
    expect(frac).toBeLessThanOrEqual(0.9);
    expect(frac).toBeGreaterThanOrEqual(0);
  });

  test('Elevation sensitivity — higher sun = less shadow reach', () => {
    const target = makeBuilding({ id: 1, heightMeters: 5 });
    const neighbor = makeBuilding({
      id: 2, heightMeters: 25, centroidLatitude: 20.0003, centroidLongitude: 78.0,
      roofAreaSqm: 200,
    });
    const lowSun = model.calculateShadowFraction(target, neighbor, 180, 15);
    const highSun = model.calculateShadowFraction(target, neighbor, 180, 60);
    // Low sun should cast longer shadows
    expect(lowSun).toBeGreaterThanOrEqual(highSun);
  });
});
