import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface ProductData {
  name: string;
  bookings: number;
  revenue: number;
  averageValue: number;
  trend: 'up' | 'down' | 'stable';
}

interface Props {
  dateRange: { start: Date; end: Date };
}

export function TopProducts({ dateRange }: Props) {
  const [data, setData] = useState<ProductData[]>([]);
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
            name,
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
          // Group by product name and type
          const productStats = bookingItems.reduce((acc, item) => {
            const productKey = `${item.name || 'Unnamed'} (${item.item_type || 'Other'})`;
            const revenue = Number(item.cost || 0) * Number(item.quantity || 1);
            
            if (!acc[productKey]) {
              acc[productKey] = {
                name: productKey,
                bookings: 0,
                revenue: 0,
                totalQuantity: 0,
              };
            }
            
            acc[productKey].bookings += 1;
            acc[productKey].revenue += revenue;
            acc[productKey].totalQuantity += Number(item.quantity || 1);
            
            return acc;
          }, {} as Record<string, { name: string; bookings: number; revenue: number; totalQuantity: number }>);

          // Convert to array and calculate averages
          const formattedData: ProductData[] = Object.values(productStats)
            .map(product => ({
              name: product.name,
              bookings: product.bookings,
              revenue: product.revenue,
              averageValue: product.bookings > 0 ? product.revenue / product.bookings : 0,
              trend: 'stable' as const, // For now, we'll set all as stable since we don't have historical data
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10); // Top 10 products

          setData(formattedData);
        } else {
          setData([]);
        }
      } catch (err: any) {
        console.error('Error fetching top products:', err);
        setError(err.message || 'Failed to load product data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Top Products</h2>
        <div className="flex items-center justify-center py-8">
          <Loader className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Top Products</h2>
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
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Top Products</h2>
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-900">No product data</h3>
          <p className="text-sm text-gray-500 mt-1">No bookings found for the selected date range.</p>
        </div>
      </div>
    );
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 bg-gray-300 rounded-full" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Top Products</h2>
        <div className="text-sm text-gray-500">
          By Revenue
        </div>
      </div>
      
      <div className="space-y-4">
        {data.map((product, index) => (
          <div key={product.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-indigo-600">#{index + 1}</span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {product.name}
                </p>
                <div className="flex items-center space-x-4 mt-1">
                  <p className="text-xs text-gray-500">
                    {product.bookings} booking{product.bookings !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-500">
                    Avg: ${product.averageValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  ${product.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <div className="flex items-center justify-end mt-1">
                  {getTrendIcon(product.trend)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {data.length === 10 && (
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">Showing top 10 products by revenue</p>
        </div>
      )}
    </div>
  );
}