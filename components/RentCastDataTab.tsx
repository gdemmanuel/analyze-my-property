import React from 'react';
import {
  BarChart3, TrendingUp, MapPin, Tag, Users, Activity, Home, DollarSign, Clock, Droplets, Flame, Car
} from 'lucide-react';
import ErrorBoundary from './ui/ErrorBoundary';
import { formatCurrency } from '../utils/formatCurrency';
import { RentCastProperty, MarketStats, MarketTrendEntry, RentalListing } from '../services/rentcastService';
import MarketTrendCharts from './MarketTrendCharts';

interface RentCastDataTabProps {
  propertyData: RentCastProperty | null;
  marketStats: MarketStats | null;
  marketTrends: { saleTrends: MarketTrendEntry[]; rentalTrends: MarketTrendEntry[] };
  bedroomStats: { sale?: any; rental?: any };
  rentalListings: RentalListing[] | null;
  onRefreshData?: () => void;
}

const RentCastDataTab: React.FC<RentCastDataTabProps> = ({
  propertyData,
  marketStats,
  marketTrends,
  bedroomStats,
  rentalListings,
  onRefreshData
}) => {
  const [expandedSection, setExpandedSection] = React.useState<string | null>('health');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-4 p-4 lg:p-8 animate-in fade-in duration-700">
      {/* Property Value & Listing Intel & Owner/Agent Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* AVM Value Range */}
        {propertyData?.avmValueRange && (
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-4">AVM Value Range</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-black text-slate-600">Last Sale Price</span>
                  <span className="text-lg font-black text-slate-900">{formatCurrency(propertyData.lastSalePrice || 0)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{formatCurrency(propertyData.avmValueRange.low)}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full relative overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(10, ((propertyData.lastSalePrice || propertyData.avmValueRange.low) - propertyData.avmValueRange.low) / (propertyData.avmValueRange.high - propertyData.avmValueRange.low) * 100))}%`
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">{formatCurrency(propertyData.avmValueRange.high)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <p className="text-xs text-slate-500 mb-1">ESTIMATE LOW</p>
                  <p className="text-base font-black text-slate-900">{formatCurrency(propertyData.avmValueRange.low)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">ESTIMATE HIGH</p>
                  <p className="text-base font-black text-slate-900">{formatCurrency(propertyData.avmValueRange.high)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Listing Intel */}
        {propertyData?.listingDetails && (propertyData.listingDetails.daysOnMarket || propertyData.listingDetails.listingType) && (
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-4">Listing Intelligence</h3>
            <div className="space-y-3">
              {propertyData.listingDetails.daysOnMarket != null && (
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 last:pb-0 last:border-0">
                  <span className="text-sm font-black text-slate-600">Days on Market</span>
                  <span className={`text-lg font-black ${propertyData.listingDetails.daysOnMarket > 90 ? 'text-emerald-600' : propertyData.listingDetails.daysOnMarket > 30 ? 'text-amber-600' : 'text-slate-900'}`}>{propertyData.listingDetails.daysOnMarket}</span>
                </div>
              )}
              {propertyData.listingDetails.listingType && (
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 last:pb-0 last:border-0">
                  <span className="text-sm font-black text-slate-600">Listing Type</span>
                  <span className={`px-3 py-1 rounded text-xs font-black ${
                    propertyData.listingDetails.listingType === 'Foreclosure' ? 'bg-red-100 text-red-700' :
                    propertyData.listingDetails.listingType === 'Short Sale' ? 'bg-orange-100 text-orange-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>{propertyData.listingDetails.listingType}</span>
                </div>
              )}
              {propertyData.listingDetails.priceHistory && propertyData.listingDetails.priceHistory.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-2 font-black">RECENT PRICE HISTORY</p>
                  <div className="space-y-1">
                    {propertyData.listingDetails.priceHistory.slice(0, 3).map((ph, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-slate-600">{new Date(ph.date).toLocaleDateString()}</span>
                        <span className="font-black text-slate-900">{formatCurrency(ph.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Owner Information & Listing Agent */}
        <div className="space-y-4">
          {/* Owner Information */}
          {propertyData?.owner && (
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-4">Owner Information</h3>
              <div className="space-y-3">
                {propertyData.owner.names && propertyData.owner.names.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1 font-black">OWNER NAME</p>
                    {propertyData.owner.names.map((name, i) => (
                      <p key={i} className="text-sm font-black text-slate-900">{name}</p>
                    ))}
                  </div>
                )}
                {propertyData.owner.type && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1 font-black">OWNER TYPE</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-black ${propertyData.owner.type === 'Individual' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{propertyData.owner.type}</span>
                  </div>
                )}
                {propertyData.owner.ownerOccupied !== undefined && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1 font-black">STATUS</p>
                    <span className={`text-sm font-black ${propertyData.owner.ownerOccupied ? 'text-green-600' : 'text-blue-600'}`}>{propertyData.owner.ownerOccupied ? 'Owner Occupied' : 'Investor/Vacant'}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Listing Agent */}
          {propertyData?.listingDetails?.listingAgent?.name && (
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-4">Listing Agent</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-black text-slate-900">{propertyData.listingDetails.listingAgent.name}</p>
                  {propertyData.listingDetails.listingOffice?.name && (
                    <p className="text-xs text-slate-500 mt-1">{propertyData.listingDetails.listingOffice.name}</p>
                  )}
                </div>
                {propertyData.listingDetails.listingAgent.phone && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1 font-black">PHONE</p>
                    <p className="text-sm font-black text-blue-600">{propertyData.listingDetails.listingAgent.phone}</p>
                  </div>
                )}
                {propertyData.listingDetails.listingAgent.email && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1 font-black">EMAIL</p>
                    <p className="text-sm font-black text-blue-600 break-all">{propertyData.listingDetails.listingAgent.email}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Market Health & Bedroom Stats */}
      {marketStats && (marketStats.saleData || marketStats.rentalData) && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <button
            onClick={() => toggleSection('health')}
            className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Market Health</h3>
            <span className={`transition-transform ${expandedSection === 'health' ? 'rotate-180' : ''}`}>
              <BarChart3 size={18} className="text-slate-400" />
            </span>
          </button>

          {expandedSection === 'health' && (
            <div className="border-t border-slate-100 p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {marketStats.saleData?.medianPrice != null && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2 font-black">MEDIAN SALE PRICE</p>
                    <p className="text-base font-black text-slate-900">{formatCurrency(marketStats.saleData.medianPrice)}</p>
                  </div>
                )}
                {marketStats.saleData?.averageDaysOnMarket != null && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2 font-black">AVG DOM (SALE)</p>
                    <p className="text-base font-black text-slate-900">{Math.round(marketStats.saleData.averageDaysOnMarket)} days</p>
                  </div>
                )}
                {marketStats.saleData?.totalListings != null && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2 font-black">SALE LISTINGS</p>
                    <p className="text-base font-black text-slate-900">{marketStats.saleData.totalListings}</p>
                  </div>
                )}
                {marketStats.rentalData?.medianRent != null && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2 font-black">MEDIAN RENT</p>
                    <p className="text-base font-black text-slate-900">{formatCurrency(marketStats.rentalData.medianRent)}/mo</p>
                  </div>
                )}
                {marketStats.rentalData?.averageDaysOnMarket != null && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2 font-black">AVG DOM (RENTAL)</p>
                    <p className="text-base font-black text-slate-900">{Math.round(marketStats.rentalData.averageDaysOnMarket)} days</p>
                  </div>
                )}
                {marketStats.rentalData?.totalListings != null && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2 font-black">RENTAL LISTINGS</p>
                    <p className="text-base font-black text-slate-900">{marketStats.rentalData.totalListings}</p>
                  </div>
                )}
              </div>

              {/* Bedroom-Matched Stats */}
              {(bedroomStats.sale || bedroomStats.rental) && (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-3 font-black uppercase">{propertyData?.bedrooms || '?'} Bedroom Matched Statistics</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {bedroomStats.rental?.medianRent != null && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Median Rent</p>
                        <p className="text-base font-black text-slate-900">{formatCurrency(bedroomStats.rental.medianRent)}/mo</p>
                      </div>
                    )}
                    {bedroomStats.sale?.medianPrice != null && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Median Price</p>
                        <p className="text-base font-black text-slate-900">{formatCurrency(bedroomStats.sale.medianPrice)}</p>
                      </div>
                    )}
                    {bedroomStats.rental?.totalListings != null && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Listings</p>
                        <p className="text-base font-black text-slate-900">{bedroomStats.rental.totalListings}</p>
                      </div>
                    )}
                    {bedroomStats.sale?.averageDaysOnMarket != null && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Avg DOM</p>
                        <p className="text-base font-black text-slate-900">{Math.round(bedroomStats.sale.averageDaysOnMarket)} days</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Market Trends */}
      {(marketTrends.saleTrends.length > 2 || marketTrends.rentalTrends.length > 2) && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <button
            onClick={() => toggleSection('trends')}
            className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Market Trends</h3>
            <span className={`transition-transform ${expandedSection === 'trends' ? 'rotate-180' : ''}`}>
              <TrendingUp size={18} className="text-slate-400" />
            </span>
          </button>

          {expandedSection === 'trends' && (
            <div className="border-t border-slate-100 p-6">
              <ErrorBoundary>
                <MarketTrendCharts
                  saleTrends={marketTrends.saleTrends}
                  rentalTrends={marketTrends.rentalTrends}
                  zipCode={propertyData?.zipCode}
                />
              </ErrorBoundary>
            </div>
          )}
        </div>
      )}

      {/* Sale Comparables */}
      {propertyData?.avmComparables && propertyData.avmComparables.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <button
            onClick={() => toggleSection('saleComps')}
            className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Sale Comparables</h3>
            <span className={`transition-transform ${expandedSection === 'saleComps' ? 'rotate-180' : ''}`}>
              <DollarSign size={18} className="text-slate-400" />
            </span>
          </button>

          {expandedSection === 'saleComps' && (
            <div className="border-t border-slate-100 p-6">
              <div className="space-y-0">
                {propertyData.avmComparables.map((comp, i) => (
                  <div key={i} className={`p-4 flex items-start gap-4 ${i !== propertyData.avmComparables.length - 1 ? 'border-b border-slate-100' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 text-sm truncate">{comp.formattedAddress}</p>
                      <p className="text-xs text-slate-500 mt-1">{comp.bedrooms}bd / {comp.bathrooms}ba • {comp.squareFootage?.toLocaleString()}sf</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-slate-900 text-sm">{formatCurrency(comp.price)}</p>
                      <p className="text-xs text-slate-500 mt-1">{comp.distance?.toFixed(1)}mi • {comp.daysOnMarket}DOM</p>
                      {comp.correlation != null && (
                        <span className={`inline-block px-2 py-1 rounded text-[10px] font-black mt-2 ${
                          comp.correlation >= 0.9 ? 'bg-emerald-100 text-emerald-700' :
                          comp.correlation >= 0.7 ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>{(comp.correlation * 100).toFixed(0)}% match</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rental Listings */}
      {rentalListings && rentalListings.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <button
            onClick={() => toggleSection('rentals')}
            className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Active Rental Listings</h3>
            <span className={`transition-transform ${expandedSection === 'rentals' ? 'rotate-180' : ''}`}>
              <Home size={18} className="text-slate-400" />
            </span>
          </button>

          {expandedSection === 'rentals' && (
            <div className="border-t border-slate-100 p-6">
              <div className="space-y-0">
                {rentalListings.map((listing, i) => (
                  <div key={i} className={`p-4 flex items-start gap-4 ${i !== rentalListings.length - 1 ? 'border-b border-slate-100' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 text-sm truncate">{listing.formattedAddress}</p>
                      <p className="text-xs text-slate-500 mt-1">{listing.bedrooms}bd / {listing.bathrooms}ba • {listing.squareFootage?.toLocaleString()}sf</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-emerald-700 text-sm">{formatCurrency(listing.price)}/mo</p>
                      {listing.daysOnMarket && <p className="text-xs text-slate-500 mt-1">{listing.daysOnMarket} DOM</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!propertyData && !marketStats && (
        <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
          <BarChart3 size={48} className="mx-auto mb-4 text-slate-400" />
          <p className="text-base font-black text-slate-600 uppercase tracking-widest mb-2">No RentCast Data Available</p>
          <p className="text-slate-500 text-sm mb-6">Run an underwriting analysis to view RentCast market data</p>
          {onRefreshData && (
            <button
              onClick={onRefreshData}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Refresh Market Data
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RentCastDataTab;
