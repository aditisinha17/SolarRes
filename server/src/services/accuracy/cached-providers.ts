import NodeCache from 'node-cache';
import { IIrradianceProvider, IBuildingContextProvider, IWeatherDataClient, IOsmBuildingService, OsmBuilding } from 'solar-res-shared';

/**
 * Cached wrapper around an IWeatherDataClient.
 * Cache key: ghi:{lat}_{lng} (2 decimal rounding)
 */
export class CachedIrradianceProvider implements IIrradianceProvider {
  readonly providerName = 'OpenMeteo-Cached';
  private cache: NodeCache;

  constructor(
    private inner: IWeatherDataClient,
    ttlMinutes: number = 1440
  ) {
    this.cache = new NodeCache({ stdTTL: ttlMinutes * 60 });
  }

  async getMonthlyGhiAsync(lat: number, lng: number): Promise<Record<string, number>> {
    const key = `ghi:${lat.toFixed(2)}_${lng.toFixed(2)}`;
    const cached = this.cache.get<Record<string, number>>(key);
    if (cached) return cached;

    const result = await this.inner.getMonthlyGhiAsync(lat, lng);
    this.cache.set(key, result);
    return result;
  }
}

/**
 * Cached wrapper around IOsmBuildingService.
 * Cache key: bldg:{lat}_{lng}_{radius}
 */
export class CachedBuildingContextProvider implements IBuildingContextProvider {
  readonly providerName = 'OsmOverpass-Cached';
  private cache: NodeCache;

  constructor(
    private inner: IOsmBuildingService,
    ttlMinutes: number = 1440
  ) {
    this.cache = new NodeCache({ stdTTL: ttlMinutes * 60 });
  }

  async getBuildingsAsync(lat: number, lng: number, radiusMeters: number): Promise<OsmBuilding[]> {
    const key = `bldg:${lat.toFixed(2)}_${lng.toFixed(2)}_${radiusMeters}`;
    const cached = this.cache.get<OsmBuilding[]>(key);
    if (cached) return cached;

    const result = await this.inner.getBuildingsInRadiusAsync(lat, lng, radiusMeters);
    this.cache.set(key, result);
    return result;
  }
}
