
import { PropertyConfig, Amenity } from './types';

export const DEFAULT_CONFIG: PropertyConfig = {
  price: 500000,
  downPaymentPercent: 20,
  mortgageRate: 6.5,
  helocRate: 7.5,
  helocFundingPercent: 100,
  upgradeCost: 0,
  loanCosts: 7500,
  furnishingsCost: 0, // Now handled via Amenities library
  mgmtFeePercent: 20,
  maintenancePercent: 5,
  cleaningFeeIncome: 1200,
  cleaningExpense: 1100,
  hostFeePercent: 15.5,
  adr: 300,
  mtrMonthlyRent: 4500,
  ltrMonthlyRent: 3000,
  expectedMonthlyRevenue: 6500,
  occupancyPercent: 70,
  propertyTaxMonthly: 400,
  annualPropertyTaxRate: 1.2,
  fixedOpexMonthly: 250,
  hoaMonthly: 0,
  annualAppreciationRate: 3,
  annualRentGrowthRate: 3,
  annualExpenseInflationRate: 2,
  helocPaydownPercent: 100,
};

export const AMENITIES: Amenity[] = [
  { id: 'furnishings', name: 'Initial Furnishings', cost: 25000, adrBoost: 0, occBoost: 0, icon: 'Armchair', active: true },
  { id: 'hottub', name: 'Hot Tub', cost: 8500, adrBoost: 45, occBoost: 6, icon: 'Waves', active: true },
  { id: 'sauna', name: 'Cedar Sauna', cost: 6500, adrBoost: 25, occBoost: 4, icon: 'Thermometer', active: true },
  { id: 'gameroom', name: 'Game Room', cost: 4000, adrBoost: 20, occBoost: 3, icon: 'Gamepad2', active: true },
  { id: 'deck', name: 'Luxury Deck', cost: 12000, adrBoost: 35, occBoost: 5, icon: 'Layers', active: true },
  { id: 'ev', name: 'EV Charger', cost: 1500, adrBoost: 5, occBoost: 2, icon: 'Zap', active: true },
];
