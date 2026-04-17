import { Router, Request, Response } from 'express';
import { IPremiumAnalysisService, IReportStore } from 'solar-res-shared';

export function createPremiumController(
  premiumService: IPremiumAnalysisService,
  reportStore: IReportStore
): Router {
  const router = Router();

  /** POST /api/premium/shadow-analysis */
  router.post('/shadow-analysis', async (req: Request, res: Response) => {
    try {
      const result = await premiumService.analyzeShadowsAsync(req.body);
      return res.json(result);
    } catch (error) {
      console.error('Shadow analysis error:', error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  /** POST /api/premium/panel-placement */
  router.post('/panel-placement', async (req: Request, res: Response) => {
    try {
      const result = await premiumService.calculatePanelPlacementAsync(req.body);
      return res.json(result);
    } catch (error) {
      console.error('Panel placement error:', error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  /** POST /api/premium/generate-report */
  router.post('/generate-report', async (req: Request, res: Response) => {
    try {
      const result = await premiumService.generateReportAsync(req.body);
      return res.json(result);
    } catch (error) {
      console.error('Report generation error:', error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  /** GET /api/premium/report/:reportId/download */
  router.get('/report/:reportId/download', async (req: Request, res: Response) => {
    try {
      const reportId = req.params.reportId as string;
      const report = await reportStore.getAsync(reportId);

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
      return res.send(report.data);
    } catch (error) {
      console.error('Report download error:', error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  /** GET /api/premium/compare-panels?roofArea=&lat=&lng= */
  router.get('/compare-panels', async (req: Request, res: Response) => {
    try {
      const roofArea = parseFloat(req.query.roofArea as string) || 100;
      const lat = parseFloat(req.query.lat as string) || 20;
      const lng = parseFloat(req.query.lng as string) || 78;

      const result = await premiumService.getPanelComparisonAsync(roofArea, lat, lng);
      return res.json(result);
    } catch (error) {
      console.error('Panel comparison error:', error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  /** POST /api/premium/panel-array-analysis */
  router.post('/panel-array-analysis', async (req: Request, res: Response) => {
    try {
      const result = await premiumService.analyzePanelArrayAsync(req.body);
      return res.json(result);
    } catch (error) {
      console.error('Panel array analysis error:', error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  /** POST /api/premium/building-energy */
  router.post('/building-energy', async (req: Request, res: Response) => {
    try {
      const result = await premiumService.analyzeBuildingEnergyAsync(req.body);
      return res.json(result);
    } catch (error) {
      console.error('Building energy error:', error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  return router;
}
