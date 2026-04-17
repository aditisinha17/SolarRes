import axios from 'axios';
import { IWeatherDataClient } from 'solar-res-shared';

/** Fallback GHI values for India (kWh/m²/day) when API fails */
const FALLBACK_GHI: Record<string, number> = {
  Jan: 4.5, Feb: 5.2, Mar: 5.8, Apr: 6.2, May: 6.5, Jun: 5.5,
  Jul: 4.5, Aug: 4.8, Sep: 5.0, Oct: 5.2, Nov: 4.8, Dec: 4.0,
};

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Fetches historical solar irradiance data from Open-Meteo Archive API.
 * Converts daily shortwave_radiation_sum from MJ/m² to kWh/m² (× 0.2778)
 * and aggregates to monthly averages.
 */
export class OpenMeteoClient implements IWeatherDataClient {
  private baseUrl = 'https://archive-api.open-meteo.com/v1/archive';

  async getMonthlyGhiAsync(lat: number, lng: number): Promise<Record<string, number>> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          latitude: lat.toFixed(4),
          longitude: lng.toFixed(4),
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          daily: 'shortwave_radiation_sum',
          timezone: 'Asia/Kolkata',
        },
        timeout: 15000,
      });

      const data = response.data;
      if (!data?.daily?.time || !data?.daily?.shortwave_radiation_sum) {
        console.warn('OpenMeteo: Invalid response structure, using fallback');
        return { ...FALLBACK_GHI };
      }

      const times: string[] = data.daily.time;
      const radiation: (number | null)[] = data.daily.shortwave_radiation_sum;

      // Group by month and compute averages
      const monthSums: number[] = new Array(12).fill(0);
      const monthCounts: number[] = new Array(12).fill(0);

      for (let i = 0; i < times.length; i++) {
        const val = radiation[i];
        if (val == null || val < 0) continue;

        const date = new Date(times[i]);
        const monthIdx = date.getMonth();
        // Convert MJ/m² to kWh/m²
        monthSums[monthIdx] += val * 0.2778;
        monthCounts[monthIdx]++;
      }

      const result: Record<string, number> = {};
      for (let m = 0; m < 12; m++) {
        const avgGhi = monthCounts[m] > 0 ? monthSums[m] / monthCounts[m] : FALLBACK_GHI[MONTH_ABBR[m]];
        result[MONTH_ABBR[m]] = Math.round(avgGhi * 100) / 100;
      }

      return result;
    } catch (error) {
      console.warn('OpenMeteo API failed, using India average fallback:', (error as Error).message);
      return { ...FALLBACK_GHI };
    }
  }
}
