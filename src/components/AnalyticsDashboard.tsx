import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AgentPerformance } from './analytics/AgentPerformance';
import { RevenueBreakdown } from './analytics/RevenueBreakdown';
import { TopProducts } from './analytics/TopProducts';
import { DestinationAnalysis } from './analytics/DestinationAnalysis';
import { ConversionFunnel } from './analytics/ConversionFunnel';
import { DateRangePicker } from './analytics/DateRangePicker';

export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    end: new Date(),
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        <AgentPerformance dateRange={dateRange} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueBreakdown dateRange={dateRange} />
          <ConversionFunnel dateRange={dateRange} />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopProducts dateRange={dateRange} />
          <DestinationAnalysis dateRange={dateRange} />
        </div>
      </div>
    </div>
  );
}