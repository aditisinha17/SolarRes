import { Router, Request, Response } from 'express';
import { LeadRequest } from 'solar-res-shared';

/** In-memory lead storage (MVP) */
const leads: LeadRequest[] = [];

export function createLeadsController(): Router {
  const router = Router();

  /** POST /api/leads — Submit a lead */
  router.post('/', (req: Request, res: Response) => {
    try {
      const lead: LeadRequest = req.body;

      if (!lead.name || !lead.phone || !lead.email || !lead.city) {
        return res.status(400).json({ error: 'name, phone, email, and city are required' });
      }

      leads.push(lead);
      return res.status(201).json({ message: 'Lead submitted successfully', id: leads.length });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  /** GET /api/leads/count — Get lead count */
  router.get('/count', (_req: Request, res: Response) => {
    return res.json({ count: leads.length });
  });

  return router;
}
