import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader, AlertCircle, MapPin } from 'lucide-react';

interface DestinationData {
  destination: string;
  bookings: number;
  revenue: number;
  averageValue: number;
  percentage: number;
}

interface Props {
  dateRange: { start: Date; end: Date };
}

export function DestinationAnalysis({ dateRange }: Props) {
  const [data, setData] = useState<DestinationData[]>([]);
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
            destination,
            cost,
            quantity,
            bookings!inner (
              created_at
            )
          `)
          .gte('bookings.created_at', startDate)
          .lte('bookings.created_at', endDate)
          .not('destination', 'is', null);

        if (bookingError) throw bookingError;

        if (bookingItems && bookingItems.length > 0) {
          // Group by destination
          const destinationStats = bookingItems.reduce((acc, item) => {
            const destination = item.destination || 'Unknown';
            const revenue = Number(item.cost || 0) * Number(item.quantity || 1);
            
            if (!acc[destination]) {
              acc[destination] = {
                destination,
                bookings: 0,
                revenue: 0,
              };
            }
            
            acc[destination].bookings += 1;
            acc[destination].revenue += revenue;
            
            return acc;
          }, {} as Record<string, { destination: string; bookings: number; revenue: number }>);

          const totalRevenue = Object.values(destinationStats).reduce((sum, dest) => sum + dest.revenue, 0);

          // Convert to array and calculate percentages
          const formattedData: DestinationData[] = Object.values(destinationStats)
            .map(dest => ({
              destination: dest.destination,
              bookings: dest.bookings,
              revenue: dest.revenue,
              averageValue: dest.bookings > 0 ? dest.revenue / dest.bookings : 0,
              percentage: totalRevenue > 0 ? (dest.revenue / totalRevenue) * 100 : 0,
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10); // Top 10 destinations

          setData(formattedData);
        } else {
          setData([]);
        }
      } catch (err: any) {
        console.error('Error fetching destination analysis:', err);
        setError(err.message || 'Failed to load destination data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Destination Analysis</h2>
        <div className="flex items-center justify-center py-8">
          <Loader className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Destination Analysis</h2>
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
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Destination Analysis</h2>
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <MapPin className="mx-auto h-12 w-12" />
          </div>
          <h3 className="text-sm font-medium text-gray-900">No destination data</h3>
          <p className="text-sm text-gray-500 mt-1">No bookings with destinations found for the selected date range.</p>
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
    'bg-orange-500',
    'bg-teal-500',
  ];

  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const totalBookings = data.reduce((sum, item) => sum + item.bookings, 0);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Destination Analysis</h2>
        <div className="text-sm text-gray-500">
          {totalBookings} total bookings
        </div>
      </div>
      
      <div className="space-y-4">
        {data.map((destination, index) => (
          <div key={destination.destination} className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full ${colors[index % colors.length]}`}></div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    {destination.destination}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {destination.bookings} booking{destination.bookings !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  ${destination.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500">
                  {destination.percentage.toFixed(1)}% of total
                </p>
              </div>
            </div>
            
            <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full ${colors[index % colors.length]} transition-all duration-500 ease-out`}
                style={{ width: `${destination.percentage}%` }}
              />
            </div>
            
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                Avg: ${destination.averageValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per booking
              </span>
              <span>
                {((destination.bookings / totalBookings) * 100).toFixed(1)}% of bookings
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {data.length === 10 && (
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">Showing top 10 destinations by revenue</p>
        </div>
      )}
      
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">
              ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-500">Total Revenue</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {data.length}
            </p>
            <p className="text-sm text-gray-500">Destinations</p>
          </div>
        </div>
      </div>
    </div>
  );
}