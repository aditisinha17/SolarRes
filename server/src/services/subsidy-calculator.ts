import { ISubsidyCalculator, SubsidyDetails } from 'solar-res-shared';

/**
 * PM Surya Ghar Muft Bijli Yojana subsidy calculator.
 * Slab structure:
 *   - First 2 kW: ₹30,000/kW
 *   - Next 1 kW (2-3 kW): ₹18,000/kW
 *   - Maximum subsidy cap: ₹78,000
 */
export class SubsidyCalculator implements ISubsidyCalculator {
  calculate(systemCapacityKw: number): SubsidyDetails {
    let subsidy = 0;
    const parts: string[] = [];

    if (systemCapacityKw <= 0) {
      return {
        systemCapacityKw: 0,
        subsidyPerKw: 0,
        totalSubsidy: 0,
        explanation: 'No subsidy for 0 kW system.',
      };
    }

    // First 2 kW at ₹30,000/kW
    const first2 = Math.min(systemCapacityKw, 2);
    subsidy += first2 * 30000;
    parts.push(`First ${first2.toFixed(1)} kW × ₹30,000 = ₹${(first2 * 30000).toLocaleString('en-IN')}`);

    // Next 1 kW (2-3 kW) at ₹18,000/kW
    if (systemCapacityKw > 2) {
      const next1 = Math.min(systemCapacityKw - 2, 1);
      subsidy += next1 * 18000;
      parts.push(`Next ${next1.toFixed(1)} kW × ₹18,000 = ₹${(next1 * 18000).toLocaleString('en-IN')}`);
    }

    // Cap at ₹78,000
    if (subsidy > 78000) {
      subsidy = 78000;
      parts.push('Capped at maximum subsidy of ₹78,000');
    }

    const subsidyPerKw = systemCapacityKw > 0 ? Math.round(subsidy / systemCapacityKw) : 0;
    const explanation =
      `PM Surya Ghar Muft Bijli Yojana subsidy for ${systemCapacityKw.toFixed(1)} kW system:\n` +
      parts.join('\n') +
      `\nTotal subsidy: ₹${subsidy.toLocaleString('en-IN')}`;

    return {
      systemCapacityKw,
      subsidyPerKw,
      totalSubsidy: subsidy,
      explanation,
    };
  }
}
