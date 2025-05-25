import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader, AlertCircle } from 'lucide-react';

interface RevenueData {
  category: string;
  revenue: number;
  percentage: number;
  count: number;
}

interface Props {
  dateRange: { start: Date; end: Date };
}

export function RevenueBreakdown({ dateRange }: Props) {
  const [data, setData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      
      try {
        const startDate = dateRange.start.toISOString();
        const endDate = dateRange.end.toISOString();

        // Get booking items with their associated bookings
        const { data: bookingItems, error: bookingError } = await supabase
          .from('booking_items')
          .select(`
            item_type,
            cost,
            quantity,
            bookings!inner (
              created_at
            )
          `)
          .gte('bookings.created_at', startDate)
          .lte('bookings.created_at', endDate);

        if (bookingError) throw bookingError;

        if (bookingItems && bookingItems.length > 0) {
          // Group revenue by item type
          const revenueByType = bookingItems.reduce((acc, item) => {
            const revenue = Number(item.cost || 0) * Number(item.quantity || 1);
            const type = item.item_type || 'Other';
            
            if (!acc[type]) {
              acc[type] = { revenue: 0, count: 0 };
            }
            acc[type].revenue += revenue;
            acc[type].count += 1;
            
            return acc;
          }, {} as Record<string, { revenue: number; count: number }>);

          const totalRevenue = Object.values(revenueByType).reduce((sum, val) => sum + val.revenue, 0);

          const formattedData = Object.entries(revenueByType).map(([category, data]) => ({
            category,
            revenue: data.revenue,
            count: data.count,
            percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
          }));

          setData(formattedData.sort((a, b) => b.revenue - a.revenue));
        } else {
          setData([]);
        }
      } catch (err: any) {
        console.error('Error fetching revenue breakdown:', err);
        setError(err.message || 'Failed to load revenue data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Revenue Breakdown</h2>
        <div className="flex items-center justify-center py-8">
          <Loader className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Revenue Breakdown</h2>
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
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Revenue Breakdown</h2>
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-900">No revenue data</h3>
          <p className="text-sm text-gray-500 mt-1">No bookings found for the selected date range.</p>
        </div>
      </div>
    );
  }

  const colors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-purple-500',
    'bg-amber-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-red-500',
    'bg-green-500',
  ];

  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Revenue Breakdown</h2>
        <div className="text-sm text-gray-500">
          Total: ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
      
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={item.category} className="space-y-2">
            <div className="flex justify-between items-center text-sm font-medium">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]} mr-2`}></div>
                <span className="text-gray-600">{item.category}</span>
                <span className="ml-2 text-xs text-gray-400">({item.count} items)</span>
              </div>
              <span className="text-gray-900">
                ${item.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full ${colors[index % colors.length]} transition-all duration-500 ease-out`}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{item.percentage.toFixed(1)}% of total revenue</span>
              <span>Avg: ${(item.revenue / item.count).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}