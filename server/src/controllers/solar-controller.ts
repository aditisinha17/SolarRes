import { Router, Request, Response } from 'express';
import { ISolarCalculationService, SolarCalculationRequest } from 'solar-res-shared';

export function createSolarController(solarService: ISolarCalculationService): Router {
  const router = Router();

  /**
   * POST /api/solar/calculate
   * Calculates solar generation estimate for given roof parameters.
   */
  router.post('/calculate', async (req: Request, res: Response) => {
    try {
      const body: SolarCalculationRequest = req.body;

      // Validate
      if (!body.roofAreaSqm || body.roofAreaSqm <= 0) {
        return res.status(400).json({ error: 'roofAreaSqm must be greater than 0' });
      }
      if (body.latitude == null || body.latitude < -90 || body.latitude > 90) {
        return res.status(400).json({ error: 'latitude must be between -90 and 90' });
      }
      if (body.longitude == null || body.longitude < -180 || body.longitude > 180) {
        return res.status(400).json({ error: 'longitude must be between -180 and 180' });
      }

      const result = await solarService.calculateAsync(body);
      return res.json(result);
    } catch (error) {
      console.error('Solar calculation error:', error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  return router;
}
