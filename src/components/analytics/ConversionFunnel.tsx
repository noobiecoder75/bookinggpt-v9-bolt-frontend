import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface FunnelStep {
  name: string;
  value: number;
  percentage: number;
}

interface Props {
  dateRange: { start: Date; end: Date };
}

export function ConversionFunnel({ dateRange }: Props) {
  const [steps, setSteps] = useState<FunnelStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [
        { count: totalQuotes },
        { count: sentQuotes },
        { count: convertedQuotes },
        { count: completedBookings },
      ] = await Promise.all([
        supabase
          .from('quotes')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString()),
        supabase
          .from('quotes')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Sent')
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString()),
        supabase
          .from('quotes')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Converted')
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString()),
        supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Completed')
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString()),
      ]);

      const funnelSteps = [
        { name: 'Quotes Created', value: totalQuotes || 0 },
        { name: 'Quotes Sent', value: sentQuotes || 0 },
        { name: 'Quotes Converted', value: convertedQuotes || 0 },
        { name: 'Bookings Completed', value: completedBookings || 0 },
      ];

      const stepsWithPercentages = funnelSteps.map((step, index) => ({
        ...step,
        percentage: index === 0 ? 100 : (step.value / funnelSteps[0].value) * 100,
      }));

      setSteps(stepsWithPercentages);
      setLoading(false);
    }

    fetchData();
  }, [dateRange]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Conversion Funnel</h2>
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.name} className="relative">
            <div className="flex justify-between items-baseline mb-1">
              <div className="text-sm font-medium text-gray-600">
                {step.name}
              </div>
              <div className="text-sm text-gray-900">
                {step.value.toLocaleString()}
                <span className="ml-2 text-gray-500">
                  ({step.percentage.toFixed(1)}%)
                </span>
              </div>
            </div>
            <div className="relative">
              <div className="h-3 bg-gray-200 rounded-full">
                <div
                  className={`absolute top-0 left-0 h-full rounded-full ${
                    index === 0
                      ? 'bg-emerald-500'
                      : index === 1
                      ? 'bg-blue-500'
                      : index === 2
                      ? 'bg-purple-500'
                      : 'bg-indigo-500'
                  }`}
                  style={{ width: `${step.percentage}%` }}
                />
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className="absolute left-1/2 -bottom-3 w-0.5 h-3 bg-gray-200" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}