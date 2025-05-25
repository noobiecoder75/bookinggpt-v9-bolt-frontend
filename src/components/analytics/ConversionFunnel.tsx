import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader, AlertCircle, FileText, Send, CheckCircle } from 'lucide-react';

interface FunnelData {
  stage: string;
  count: number;
  percentage: number;
  conversionRate: number;
  icon: React.ReactNode;
  color: string;
}

interface Props {
  dateRange: { start: Date; end: Date };
}

export function ConversionFunnel({ dateRange }: Props) {
  const [data, setData] = useState<FunnelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      
      try {
        const startDate = dateRange.start.toISOString();
        const endDate = dateRange.end.toISOString();

        // Get all quotes within the date range
        const { data: quotes, error: quotesError } = await supabase
          .from('quotes')
          .select('id, status')
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        if (quotesError) throw quotesError;

        if (quotes && quotes.length > 0) {
          // Count quotes by status
          const statusCounts = quotes.reduce((acc, quote) => {
            const status = quote.status || 'Draft';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          // Calculate totals for each funnel stage
          const totalQuotes = quotes.length;
          const sentQuotes = (statusCounts['Sent'] || 0) + (statusCounts['Booked'] || 0); // Sent includes those that progressed to Booked
          const bookedQuotes = statusCounts['Booked'] || 0;

          // Calculate conversion rates
          const sentConversion = totalQuotes > 0 ? (sentQuotes / totalQuotes) * 100 : 0;
          const bookedConversion = sentQuotes > 0 ? (bookedQuotes / sentQuotes) * 100 : 0;

          const funnelData: FunnelData[] = [
            {
              stage: 'Quotes Created',
              count: totalQuotes,
              percentage: 100,
              conversionRate: 100,
              icon: <FileText className="h-5 w-5" />,
              color: 'bg-blue-500',
            },
            {
              stage: 'Quotes Sent',
              count: sentQuotes,
              percentage: totalQuotes > 0 ? (sentQuotes / totalQuotes) * 100 : 0,
              conversionRate: sentConversion,
              icon: <Send className="h-5 w-5" />,
              color: 'bg-emerald-500',
            },
            {
              stage: 'Quotes Booked',
              count: bookedQuotes,
              percentage: totalQuotes > 0 ? (bookedQuotes / totalQuotes) * 100 : 0,
              conversionRate: bookedConversion,
              icon: <CheckCircle className="h-5 w-5" />,
              color: 'bg-purple-500',
            },
          ];

          setData(funnelData);
        } else {
          setData([]);
        }
      } catch (err: any) {
        console.error('Error fetching conversion funnel:', err);
        setError(err.message || 'Failed to load conversion data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Conversion Funnel</h2>
        <div className="flex items-center justify-center py-8">
          <Loader className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Conversion Funnel</h2>
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Conversion Funnel</h2>
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <FileText className="mx-auto h-12 w-12" />
          </div>
          <h3 className="text-sm font-medium text-gray-900">No quote data</h3>
          <p className="text-sm text-gray-500 mt-1">No quotes found for the selected date range.</p>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count));

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Conversion Funnel</h2>
        <div className="text-sm text-gray-500">
          Quote Journey
        </div>
      </div>
      
      <div className="space-y-6">
        {data.map((stage, index) => (
          <div key={stage.stage} className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg ${stage.color} text-white`}>
                  {stage.icon}
                </div>
                <div>
                  <h3 className="text-base font-medium text-gray-900">{stage.stage}</h3>
                  <p className="text-sm text-gray-500">
                    {stage.count.toLocaleString()} quotes
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">
                  {stage.percentage.toFixed(1)}%
                </p>
                {index > 0 && (
                  <p className="text-sm text-gray-500">
                    {stage.conversionRate.toFixed(1)}% conversion from previous
                  </p>
                )}
              </div>
            </div>
            
            <div className="relative h-12 bg-gray-200 rounded-lg overflow-hidden mb-2">
              <div
                className={`absolute top-0 left-0 h-full ${stage.color} transition-all duration-1000 ease-out`}
                style={{ width: `${maxCount > 0 ? (stage.count / maxCount) * 100 : 0}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-semibold text-white drop-shadow-sm">
                  {stage.count.toLocaleString()}
                </span>
              </div>
            </div>
            
            {index < data.length - 1 && (
              <div className="flex justify-center mt-4">
                <div className="flex flex-col items-center">
                  <div className="w-px h-6 bg-gray-300"></div>
                  <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-300"></div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">
              {data[0]?.count.toLocaleString() || '0'}
            </p>
            <p className="text-sm text-gray-500">Total Quotes</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600">
              {data.length > 1 ? data[1].conversionRate.toFixed(1) : '0.0'}%
            </p>
            <p className="text-sm text-gray-500">Send Rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">
              {data.length > 0 && data[data.length - 1] ? 
                ((data[data.length - 1].count / (data[0]?.count || 1)) * 100).toFixed(1) : '0.0'}%
            </p>
            <p className="text-sm text-gray-500">Overall Conversion</p>
          </div>
        </div>
      </div>
    </div>
  );
}