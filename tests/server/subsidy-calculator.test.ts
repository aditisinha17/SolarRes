import { SubsidyCalculator } from '../../server/src/services/subsidy-calculator';

describe('SubsidyCalculator', () => {
  const calc = new SubsidyCalculator();

  test('0 kW returns 0 subsidy', () => {
    const result = calc.calculate(0);
    expect(result.totalSubsidy).toBe(0);
  });

  test('1 kW at ₹30,000/kW', () => {
    const result = calc.calculate(1);
    expect(result.totalSubsidy).toBe(30000);
  });

  test('2 kW = ₹60,000', () => {
    const result = calc.calculate(2);
    expect(result.totalSubsidy).toBe(60000);
  });

  test('3 kW = ₹60,000 + ₹18,000 = ₹78,000', () => {
    const result = calc.calculate(3);
    expect(result.totalSubsidy).toBe(78000);
  });

  test('5 kW capped at ₹78,000', () => {
    const result = calc.calculate(5);
    expect(result.totalSubsidy).toBe(78000);
  });

  test('explanation includes slab details', () => {
    const result = calc.calculate(3);
    expect(result.explanation).toContain('PM Surya Ghar');
    expect(result.explanation).toContain('30,000');
  });
});
