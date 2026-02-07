
export interface PropertyConfig {
  price: number;
  downPaymentPercent: number;
  mortgageRate: number;
  helocRate: number;
  helocFundingPercent: number;
  upgradeCost: number;
  loanCosts: number;
  furnishingsCost: number;
  mgmtFeePercent: number;
  maintenancePercent: number;
  cleaningFeeIncome: number;
  cleaningExpense: number;
  hostFeePercent: number;
  adr: number;
  mtrMonthlyRent: number;
  ltrMonthlyRent: number;
  expectedMonthlyRevenue: number;
  occupancyPercent: number;
  propertyTaxMonthly: number;
  annualPropertyTaxRate: number;
  fixedOpexMonthly: number;
  hoaMonthly: number;
  annualAppreciationRate: number;
  annualRentGrowthRate: number;
  annualExpenseInflationRate: number;
  helocPaydownPercent: number;
}

export type RentalStrategy = 'STR' | 'MTR' | 'LTR';

export interface ScenarioData {
  label: string;
  adr: number;
  occ: number;
  gross: number;
  platformFee: number;
  mgmtFee: number;
  opex: number;
  noi: number;
  debtService: number;
  cashFlow: number;
}

export interface CompProperty {
  address: string;
  price: string;
  distance: string;
  annualRevenue: string;
  adr: string;
  occ: string;
  grossYield: string;
}

export interface MarketInsight {
  summary: string;
  snapshot: string;
  regulations: string;
  marketPerformance: string;
  debtAssumptions: string;
  proFormaScenarios: ScenarioData[];
  breakEvenAnalysis: string;
  pathsToYes: string;
  risksDiligence: string;
  recommendation: string;
  nextSteps: string;
  comps: CompProperty[];
  mainImage?: string;

  beds: string;
  baths: string;
  sqft: string;
  lotSize: string;
  yearBuilt: string;

  suggestedListingPrice: number;
  suggestedMonthlyRevenue: number;
  suggestedOccupancy: number;
  suggestedPropertyTax: number;
  suggestedCleaningFee: number;
  suggestedFurnishingsCost: number;
  suggestedHOA: number;
  suggestedMTRRent: number;
  suggestedLTRRent: number;
  suggestedADR: number;
  marketRiskLevel: 'Low' | 'Medium' | 'High';
  verdict: string;
  sources: { title: string; uri: string }[];
}

export interface MonthlyProjection {
  date: string;
  revenue: number;
  mgmtFee: number;
  maintenance: number;
  fixedOpex: number;
  propertyTax: number;
  hoa: number;
  occupancy: number;
  adr: number;
  turns: number;
  cleaningFeeIncome: number;
  cleaningExpense: number;
  hostFee: number;
  noiPrePlatform: number;
  noiAfterPlatform: number;
  mortgagePayment: number;
  mortgageInterest: number;
  mortgagePrincipal: number;
  mortgageBalance: number;
  helocInterest: number;
  helocPrincipalPaydown: number;
  helocBalance: number;
  cashFlowAfterDebt: number;
  netCashToOwner: number;
  cumulativeNetCash: number;
  cumulativeCashFlowAfterDebt: number;
  propertyValue: number;
}

export interface SavedAssessment {
  id: string;
  address: string;
  config: PropertyConfig;
  insight: MarketInsight;
  selectedAmenities: string[];
  timestamp: number;
  strategy: RentalStrategy;
  capRate: number;
  cashOnCash: number;
  price: number;
  annualNoi: number;
}

export interface Amenity {
  id: string;
  name: string;
  cost: number;
  adrBoost: number;
  occBoost: number;
  icon: string;
  active: boolean;
}
