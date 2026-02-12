
import { PropertyConfig, MonthlyProjection, RentalStrategy } from '../types';

const SEASONALITY_ADR = [1.0, 1.05, 1.15, 0.95, 0.9, 1.25, 1.35, 1.3, 1.0, 0.85, 0.9, 1.3];
const SEASONALITY_OCC = [0.95, 1.0, 1.1, 0.8, 0.7, 1.2, 1.3, 1.25, 0.9, 0.75, 0.85, 1.2];

export const calculateMonthlyProjections = (
  config: PropertyConfig,
  years: number = 20,
  strategy: RentalStrategy = 'STR',
  selectedAmenities: { adrBoost: number; occBoost: number }[] = []
): MonthlyProjection[] => {
  const projections: MonthlyProjection[] = [];
  const totalMonths = years * 12;

  // NOTE: Amenity boosts are already applied in finalConfig, so we don't apply them again here
  // This prevents double-counting of occupancy and ADR boosts

  const baseOccupancy = config.occupancyPercent > 1 ? config.occupancyPercent / 100 : config.occupancyPercent;
  const downPayment = (config.price * config.downPaymentPercent) / 100;
  const loanAmount = config.price - downPayment;

  const monthlyMortgageRate = config.mortgageRate / 100 / 12;
  const mortgagePayment = loanAmount * (monthlyMortgageRate * Math.pow(1 + monthlyMortgageRate, 360)) / (Math.pow(1 + monthlyMortgageRate, 360) - 1);

  const totalUpfront = downPayment + config.upgradeCost + config.loanCosts + config.furnishingsCost;
  let helocBalance = totalUpfront * (config.helocFundingPercent / 100);
  const monthlyHelocRate = config.helocRate / 100 / 12;

  let currentMortgageBalance = loanAmount;
  let cumulativeNetCash = 0;
  let cumulativeCashFlowAfterDebt = 0;

  const daysInMonth = 30.42;

  for (let m = 0; m < totalMonths; m++) {
    const monthIndex = m % 12;
    const yearIndex = Math.floor(m / 12);

    // Apply annual growth rates
    const rentGrowthFactor = Math.pow(1 + (config.annualRentGrowthRate || 3) / 100, yearIndex);
    const expenseGrowthFactor = Math.pow(1 + (config.annualExpenseInflationRate || 2) / 100, yearIndex);

    let revenue = 0;
    let appliedOccupancyFraction = 0;
    let appliedRate = 0;
    let mgmtPct = config.mgmtFeePercent;
    let hostFeePct = config.hostFeePercent;
    let turns = 0;
    let cleaningIncome = 0;
    let cleaningExpense = 0;
    let opex = config.fixedOpexMonthly * expenseGrowthFactor;

    if (strategy === 'STR') {
      // Use baseOccupancy and config.adr directly (already include amenity boosts from finalConfig)
      appliedOccupancyFraction = Math.min(0.98, baseOccupancy * SEASONALITY_OCC[monthIndex]);
      appliedRate = config.adr * rentGrowthFactor * SEASONALITY_ADR[monthIndex];
      const nights = daysInMonth * appliedOccupancyFraction;
      revenue = appliedRate * nights;
      turns = nights / 3.8;
      cleaningIncome = config.cleaningFeeIncome * expenseGrowthFactor * turns;
      cleaningExpense = config.cleaningExpense * expenseGrowthFactor * turns;
    } else if (strategy === 'MTR') {
      appliedOccupancyFraction = 0.90;
      revenue = config.mtrMonthlyRent * rentGrowthFactor;
      appliedRate = revenue / (daysInMonth * appliedOccupancyFraction);
      mgmtPct = Math.min(15, config.mgmtFeePercent);
      hostFeePct = 3;
      turns = 0.33;
      cleaningExpense = (200 * expenseGrowthFactor) * turns;
    } else { // LTR
      appliedOccupancyFraction = 0.95;
      revenue = config.ltrMonthlyRent * rentGrowthFactor;
      appliedRate = revenue / (daysInMonth * appliedOccupancyFraction);
      mgmtPct = Math.min(10, config.mgmtFeePercent);
      hostFeePct = 0;
      turns = 0.08;
      cleaningExpense = 0;
      opex = 100 * expenseGrowthFactor;
    }

    const mgmtFee = (revenue * mgmtPct) / 100;
    const maintenance = (revenue * config.maintenancePercent) / 100;

    // Dynamic Tax Logic: Use rate % if monthly $ is blank or lower than rate-equivalent
    const taxRateEquivalent = (config.price * (config.annualPropertyTaxRate || 1.25) / 100) / 12;
    const propertyTax = Math.max(config.propertyTaxMonthly, taxRateEquivalent) * expenseGrowthFactor;

    const hoa = config.hoaMonthly * expenseGrowthFactor;
    const hostFee = (revenue * hostFeePct) / 100;

    const noiPrePlatform = revenue + cleaningIncome - cleaningExpense - mgmtFee - maintenance - opex - propertyTax - hoa;
    const noiAfterPlatform = noiPrePlatform - hostFee;

    const mortgageInterest = currentMortgageBalance * monthlyMortgageRate;
    const mortgagePrincipal = Math.min(currentMortgageBalance, mortgagePayment - mortgageInterest);
    currentMortgageBalance -= mortgagePrincipal;

    const helocInterest = helocBalance * monthlyHelocRate;
    helocBalance += helocInterest;

    // Financial Refactor: Truth-in-Reporting for Surplus
    const cashFlowAfterMortgage = noiAfterPlatform - mortgagePayment - helocInterest;

    let helocPrincipalPaydown = 0;
    let netCashToOwner = 0;

    if (cashFlowAfterMortgage < 0) {
      // Debt-Cushioning: The HELOC absorbs the seasonal deficit instead of the owner paying
      helocBalance += Math.abs(cashFlowAfterMortgage);
      helocPrincipalPaydown = cashFlowAfterMortgage; // Negative paydown = balance increase
      netCashToOwner = 0;
    } else {
      // Apply the user's paydown allocation strategy
      const availableForPaydown = Math.min(helocBalance, cashFlowAfterMortgage);
      helocPrincipalPaydown = availableForPaydown * ((config.helocPaydownPercent || 100) / 100);
      helocBalance -= helocPrincipalPaydown;

      // Surplus is whatever is left after mandatory debt and voluntary paydown
      netCashToOwner = cashFlowAfterMortgage - helocPrincipalPaydown;
    }

    cumulativeNetCash += netCashToOwner;
    const currentMonthProfit = noiAfterPlatform - mortgageInterest - helocInterest;
    cumulativeCashFlowAfterDebt += currentMonthProfit;

    // Appreciation Calculation
    const propertyValue = config.price * Math.pow(1 + (config.annualAppreciationRate || 3) / 100 / 12, m);

    projections.push({
      date: new Date(2026, m).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      revenue,
      mgmtFee,
      maintenance,
      fixedOpex: opex,
      propertyTax,
      hoa,
      occupancy: appliedOccupancyFraction * 100,
      adr: appliedRate,
      turns,
      cleaningFeeIncome: cleaningIncome,
      cleaningExpense,
      hostFee,
      noiPrePlatform,
      noiAfterPlatform,
      mortgagePayment,
      mortgageInterest,
      mortgagePrincipal,
      mortgageBalance: currentMortgageBalance,
      helocInterest,
      helocPrincipalPaydown,
      helocBalance,
      cashFlowAfterDebt: currentMonthProfit,
      netCashToOwner,
      cumulativeNetCash,
      cumulativeCashFlowAfterDebt,
      propertyValue
    });
  }
  return projections;
};

export const aggregateToYearly = (monthly: MonthlyProjection[]): MonthlyProjection[] => {
  const yearly: MonthlyProjection[] = [];
  for (let i = 0; i < monthly.length; i += 12) {
    const slice = monthly.slice(i, i + 12);

    const yearData = slice.reduce((acc, curr, idx) => {
      const result = {
        ...curr,
        revenue: acc.revenue + curr.revenue,
        mgmtFee: acc.mgmtFee + curr.mgmtFee,
        maintenance: acc.maintenance + curr.maintenance,
        fixedOpex: acc.fixedOpex + curr.fixedOpex,
        propertyTax: acc.propertyTax + curr.propertyTax,
        hoa: acc.hoa + curr.hoa,
        cleaningFeeIncome: acc.cleaningFeeIncome + curr.cleaningFeeIncome,
        cleaningExpense: acc.cleaningExpense + (curr.cleaningExpense || 0),
        hostFee: acc.hostFee + curr.hostFee,
        noiPrePlatform: acc.noiPrePlatform + curr.noiPrePlatform,
        noiAfterPlatform: acc.noiAfterPlatform + curr.noiAfterPlatform,
        mortgagePayment: acc.mortgagePayment + curr.mortgagePayment,
        mortgageInterest: acc.mortgageInterest + curr.mortgageInterest,
        mortgagePrincipal: acc.mortgagePrincipal + curr.mortgagePrincipal,
        helocInterest: acc.helocInterest + curr.helocInterest,
        helocPrincipalPaydown: acc.helocPrincipalPaydown + curr.helocPrincipalPaydown,
        cashFlowAfterDebt: acc.cashFlowAfterDebt + curr.cashFlowAfterDebt,
        netCashToOwner: acc.netCashToOwner + curr.netCashToOwner,
        adr: acc.adr + curr.adr,
        occupancy: acc.occupancy + curr.occupancy,
      };

      if (idx === slice.length - 1) {
        result.helocBalance = curr.helocBalance;
        result.mortgageBalance = curr.mortgageBalance;
        result.cumulativeNetCash = curr.cumulativeNetCash;
        result.cumulativeCashFlowAfterDebt = curr.cumulativeCashFlowAfterDebt;
        result.propertyValue = curr.propertyValue;
      }

      return result;
    }, { ...slice[0], revenue: 0, mgmtFee: 0, maintenance: 0, fixedOpex: 0, propertyTax: 0, hoa: 0, cleaningFeeIncome: 0, cleaningExpense: 0, hostFee: 0, noiPrePlatform: 0, noiAfterPlatform: 0, mortgagePayment: 0, mortgageInterest: 0, mortgagePrincipal: 0, helocInterest: 0, helocPrincipalPaydown: 0, cashFlowAfterDebt: 0, netCashToOwner: 0, adr: 0, occupancy: 0 });

    yearData.adr = yearData.adr / 12;
    yearData.occupancy = yearData.occupancy / 12;
    yearData.date = `Year ${(i / 12) + 1}`;
    yearly.push(yearData);
  }
  return yearly;
};
