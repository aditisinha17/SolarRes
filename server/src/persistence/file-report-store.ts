import fs from 'fs';
import path from 'path';
import os from 'os';
import { IReportStore } from 'solar-res-shared';

/**
 * File-based report storage.
 * Stores PDFs at configured BasePath or %TEMP%/SolarRes/Reports.
 */
export class FileReportStore implements IReportStore {
  private basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath && basePath.length > 0
      ? basePath
      : path.join(os.tmpdir(), 'SolarRes', 'Reports');

    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  async saveAsync(reportId: string, pdfBytes: Buffer): Promise<void> {
    const filePath = path.join(this.basePath, `${reportId}.pdf`);
    await fs.promises.writeFile(filePath, pdfBytes);
  }

  async getAsync(reportId: string): Promise<{ data: Buffer; filename: string } | null> {
    const filePath = path.join(this.basePath, `${reportId}.pdf`);
    if (!fs.existsSync(filePath)) return null;

    const data = await fs.promises.readFile(filePath);
    return { data, filename: `SolarRes-Report-${reportId.substring(0, 8)}.pdf` };
  }

  exists(reportId: string): boolean {
    return fs.existsSync(path.join(this.basePath, `${reportId}.pdf`));
  }
}
