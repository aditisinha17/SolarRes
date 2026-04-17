import PDFDocument from 'pdfkit';
import { IReportGenerator, PremiumReportInfo } from 'solar-res-shared';

/**
 * Generates PDF reports using PDFKit.
 * A4 layout with branding, metrics, tables, and analysis sections.
 */
export class PdfReportGenerator implements IReportGenerator {
  async generatePdfAsync(info: PremiumReportInfo): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', bufferPages: true, margins: { top: 40, bottom: 40, left: 40, right: 40 } });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 80;
      const orange = '#FF6B35';
      const dark = '#1a1a2e';
      const gray = '#666666';

      // ── Header ──────────────────────────────────
      doc.fontSize(28).fillColor(orange).text('SolarRes', { align: 'left' });
      doc.fontSize(10).fillColor(gray)
        .text(`Report ID: ${info.reportId.substring(0, 8)}`, { align: 'left' })
        .text(`Generated: ${new Date(info.generatedAt).toLocaleDateString('en-IN')}`, { align: 'left' });

      if (info.accuracy) {
        const badge = info.accuracy.confidenceScore >= 70 ? '🟢' :
          info.accuracy.confidenceScore >= 50 ? '🟡' : '🔴';
        doc.text(`Confidence: ${badge} ${info.accuracy.confidenceScore}% (${info.accuracy.confidenceLabel})`, { align: 'left' });
      }

      doc.moveDown(1.5);

      // ── System Overview ─────────────────────────
      if (info.solarCalculation) {
        const sc = info.solarCalculation;
        doc.fontSize(16).fillColor(dark).text('System Overview', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#333333');

        const metrics = [
          ['System Capacity', `${sc.systemCapacityKw} kW`],
          ['Annual Generation', `${sc.annualGenerationKwh.toLocaleString('en-IN')} kWh`],
          ['Number of Panels', `${sc.numberOfPanels}`],
          ['CO₂ Saved', `${sc.co2SavedTonnes} tonnes/year`],
        ];

        for (const [label, value] of metrics) {
          doc.text(`${label}: ${value}`);
        }
        doc.moveDown();

        // ── Financial Summary ───────────────────────
        doc.fontSize(16).fillColor(dark).text('Financial Analysis', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#333333');

        const fin = sc.financial;
        const finRows = [
          ['Total Installation Cost', formatINR(fin.totalInstallationCostRupees)],
          ['PM Surya Ghar Subsidy', `- ${formatINR(fin.subsidyAmountRupees)}`],
          ['Net Cost', formatINR(fin.netCostRupees)],
          ['Annual Savings', formatINR(fin.annualSavingsRupees)],
          ['Payback Period', `${fin.paybackYears} years`],
          ['25-Year Savings', formatINR(fin.twentyFiveYearSavingsRupees)],
          ['ROI', `${fin.roiPercent}%`],
        ];

        for (const [label, value] of finRows) {
          doc.text(`${label}: ${value}`);
        }
        doc.moveDown();

        // ── Monthly Generation Table ────────────────
        doc.fontSize(16).fillColor(dark).text('Monthly Generation', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(9).fillColor('#333333');
        doc.text('Month     | GHI (kWh/m²/day) | Generation (kWh) | Savings (₹)');
        doc.text('──────────┼──────────────────┼──────────────────┼────────────');

        for (const m of sc.monthlyGeneration) {
          doc.text(
            `${m.month.padEnd(10)}| ${m.ghiKwhPerSqmPerDay.toFixed(2).padStart(16)} | ` +
            `${m.generationKwh.toFixed(0).padStart(16)} | ${m.savingsRupees.toFixed(0).padStart(10)}`
          );
        }
        doc.moveDown();
      }

      // ── Shadow Analysis ─────────────────────────
      if (info.shadowAnalysis) {
        doc.addPage();
        const sa = info.shadowAnalysis;
        doc.fontSize(16).fillColor(dark).text('Shadow Analysis', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#333333');
        doc.text(sa.analysisSummary);
        doc.moveDown(0.5);

        doc.fontSize(9);
        doc.text('Hour | Elevation | Azimuth | Irradiance (W/m²) | Shaded %');
        doc.text('─────┼───────────┼─────────┼───────────────────┼─────────');
        for (const h of sa.hourlyProfile) {
          doc.text(
            `${String(h.hour).padStart(4)} | ${h.sunElevation.toFixed(1).padStart(9)} | ` +
            `${h.sunAzimuth.toFixed(1).padStart(7)} | ${String(h.irradianceWPerSqm).padStart(17)} | ${String(h.shadedPercent).padStart(7)}%`
          );
        }
        doc.moveDown();
      }

      // ── Panel Placement ─────────────────────────
      if (info.panelPlacement) {
        const pp = info.panelPlacement;
        doc.fontSize(16).fillColor(dark).text('Panel Placement', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#333333');
        doc.text(`Panels Placed: ${pp.totalPanelsPlaced}`);
        doc.text(`Coverage: ${pp.coveragePercent}%`);
        doc.text(`Estimated Capacity: ${pp.estimatedCapacityKw} kW`);
        doc.text(`Strategy: ${pp.placementStrategy}`);
        doc.moveDown();
      }

      // ── Panel Comparison ────────────────────────
      if (info.panelComparison && info.panelComparison.length > 0) {
        doc.fontSize(16).fillColor(dark).text('Panel Comparison', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(9).fillColor('#333333');

        for (const pc of info.panelComparison) {
          doc.text(`${pc.panelTypeName}: ${pc.efficiencyPercent}% eff, ₹${pc.costPerKw}/kW, ${pc.warrantyYears}yr warranty — ${pc.bestFor}`);
        }
        doc.moveDown();
      }

      // ── Building Energy ─────────────────────────
      if (info.buildingEnergy) {
        const be = info.buildingEnergy;
        doc.fontSize(16).fillColor(dark).text('Building Energy Analysis', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#333333');
        doc.text(`Annual Generation (with shadow): ${be.annualEnergyWithShadowKwh.toLocaleString('en-IN')} kWh`);
        doc.text(`Shadow Loss: ${be.shadowLossPercent}%`);
        doc.text(`Buildings Analyzed: ${be.totalBuildingsAnalyzed}`);

        if (be.neighborShadowImpacts.length > 0) {
          doc.moveDown(0.5);
          doc.fontSize(9);
          doc.text('Top Shadow Sources:');
          for (const n of be.neighborShadowImpacts.slice(0, 10)) {
            doc.text(`  ${n.directionLabel} (${n.distanceMeters}m): ${n.heightMeters}m tall, ${n.shadowContributionPercent}% contribution`);
          }
        }
        doc.moveDown();
      }

      // ── Footer ──────────────────────────────────
      doc.addPage();
      doc.fontSize(14).fillColor(dark).text('Notes & Disclaimer', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(8).fillColor(gray);

      if (info.accuracy) {
        doc.text('Data Sources: ' + info.accuracy.dataSources.join(', '));
        doc.moveDown(0.3);
        doc.text('Assumptions: ' + info.accuracy.assumptions.join('; '));
        doc.moveDown(0.3);
        doc.text('Limitations: ' + info.accuracy.limitations.join('; '));
        doc.moveDown(0.5);
      }

      doc.text(
        'DISCLAIMER: This report provides estimates based on historical solar irradiance data ' +
        'and simplified models. Actual solar generation will vary based on weather conditions, ' +
        'equipment quality, installation quality, and maintenance. Subsidy amounts are subject to ' +
        'change as per government policy. Consult a certified solar installer before making decisions.',
        { width: pageWidth }
      );

      // Page numbers
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor(gray)
          .text(`Page ${i + 1} of ${pages.count}`, 40, doc.page.height - 30, { align: 'center', width: pageWidth });
      }

      doc.end();
    });
  }
}

function formatINR(value: number): string {
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)} Cr`;
  } else if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)} L`;
  }
  return `₹${value.toLocaleString('en-IN')}`;
}
