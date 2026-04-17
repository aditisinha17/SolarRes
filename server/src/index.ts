import express from 'express';
import cors from 'cors';
import path from 'path';

// Services
import { SubsidyCalculator } from './services/subsidy-calculator';
import { OpenMeteoClient } from './services/open-meteo-client';
import { OsmBuildingService } from './services/osm-building-service';
import { SolarCalculationService } from './services/solar-calculation-service';
import { DefaultShadowModel } from './services/default-shadow-model';
import { PremiumAnalysisService } from './services/premium-analysis-service';
import { CachedIrradianceProvider, CachedBuildingContextProvider } from './services/accuracy/cached-providers';
import { PdfReportGenerator } from './services/reporting/pdf-report-generator';
import { FileReportStore } from './persistence/file-report-store';

// Controllers
import { createSolarController } from './controllers/solar-controller';
import { createPremiumController } from './controllers/premium-controller';
import { createLeadsController } from './controllers/leads-controller';

// ── Configuration ─────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '5029', 10);
const REPORT_STORAGE_PATH = process.env.REPORT_STORAGE_PATH || '';
const WEATHER_TTL = parseInt(process.env.WEATHER_TTL_MINUTES || '1440', 10);
const BUILDING_TTL = parseInt(process.env.BUILDING_TTL_MINUTES || '1440', 10);

// ── DI Wiring ─────────────────────────────────────────────
const subsidyCalculator = new SubsidyCalculator();
const openMeteoClient = new OpenMeteoClient();
const osmBuildingService = new OsmBuildingService();

const cachedIrradiance = new CachedIrradianceProvider(openMeteoClient, WEATHER_TTL);
const cachedBuildings = new CachedBuildingContextProvider(osmBuildingService, BUILDING_TTL);
const shadowModel = new DefaultShadowModel();

const solarCalcService = new SolarCalculationService(cachedIrradiance, subsidyCalculator);
const reportGenerator = new PdfReportGenerator();
const reportStore = new FileReportStore(REPORT_STORAGE_PATH);

const premiumService = new PremiumAnalysisService(
  cachedBuildings,
  shadowModel,
  solarCalcService,
  reportGenerator,
  reportStore
);

// ── Express App ───────────────────────────────────────────
const app = express();

// Middleware
app.use(cors({ origin: '*', methods: '*', allowedHeaders: '*' }));
app.use(express.json({ limit: '5mb' }));

// Serve static files (CesiumJS map, etc.)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Health checks
app.get('/health', (_req, res) => res.json({ status: 'Healthy', timestamp: new Date().toISOString() }));
app.get('/alive', (_req, res) => res.json({ status: 'Alive' }));

// Routes
app.use('/api/solar', createSolarController(solarCalcService));
app.use('/api/premium', createPremiumController(premiumService, reportStore));
app.use('/api/leads', createLeadsController());

// ── Start Server ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║   ☀️  SolarRes API Server                         ║
  ║   Running on http://localhost:${PORT}               ║
  ║   Health: http://localhost:${PORT}/health            ║
  ╚═══════════════════════════════════════════════════╝
  `);
});

export default app;
