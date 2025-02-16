import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface RevenueData {
  category: string;
  revenue: number;
  percentage: number;
}

interface Props {
  dateRange: { start: Date; end: Date };
}

export function RevenueBreakdown({ dateRange }: Props) {
  const [data, setData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: bookingItems } = await supabase
        .from('booking_items')
        .select(`
          item_type,
          cost,
          quantity,
          bookings (
            created_at
          )
        `)
        .gte('bookings.created_at', dateRange.start.toISOString())
        .lte('bookings.created_at', dateRange.end.toISOString());

      if (bookingItems) {
        const revenueByType = bookingItems.reduce((acc, item) => {
          const revenue = Number(item.cost) * Number(item.quantity);
          acc[item.item_type] = (acc[item.item_type] || 0) + revenue;
          return acc;
        }, {} as Record<string, number>);

        const totalRevenue = Object.values(revenueByType).reduce((sum, val) => sum + val, 0);

        const formattedData = Object.entries(revenueByType).map(([category, revenue]) => ({
          category,
          revenue,
          percentage: (revenue / totalRevenue) * 100,
        }));

        setData(formattedData.sort((a, b) => b.revenue - a.revenue));
      }

      setLoading(false);
    }

    fetchData();
  }, [dateRange]);

  if (loading) {
    return <div>Loading...</div>;
  }

  const colors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-purple-500',
    'bg-amber-500',
    'bg-pink-500',
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Revenue Breakdown</h2>
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={item.category} className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-gray-600">{item.category}</span>
              <span className="text-gray-900">${item.revenue.toLocaleString()}</span>
            </div>
            <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full ${colors[index % colors.length]}`}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 text-right">{item.percentage.toFixed(1)}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}