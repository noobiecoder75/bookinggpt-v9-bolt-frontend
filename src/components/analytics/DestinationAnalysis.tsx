import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { MapPin } from 'lucide-react';

interface Destination {
  location: string;
  total_bookings: number;
  total_revenue: number;
  avg_booking_value: number;
}

interface Props {
  dateRange: { start: Date; end: Date };
}

export function DestinationAnalysis({ dateRange }: Props) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: bookingItems } = await supabase
        .from('booking_items')
        .select(`
          details,
          cost,
          quantity,
          bookings (
            created_at
          )
        `)
        .gte('bookings.created_at', dateRange.start.toISOString())
        .lte('bookings.created_at', dateRange.end.toISOString());

      if (bookingItems) {
        const destinationStats = bookingItems.reduce((acc, item) => {
          const details = item.details as any;
          if (!details?.location) return acc;

          const location = details.location;
          if (!acc[location]) {
            acc[location] = {
              location,
              total_bookings: 0,
              total_revenue: 0,
              total_cost: 0,
            };
          }

          const revenue = Number(item.cost) * Number(item.quantity);
          acc[location].total_revenue += revenue;
          acc[location].total_bookings += 1;
          acc[location].total_cost += Number(item.cost);

          return acc;
        }, {} as Record<string, any>);

        const topDestinations = Object.values(destinationStats)
          .map(dest => ({
            ...dest,
            avg_booking_value: dest.total_revenue / dest.total_bookings,
          }))
          .sort((a, b) => b.total_revenue - a.total_revenue)
          .slice(0, 5);

        setDestinations(topDestinations);
      }

      setLoading(false);
    }

    fetchData();
  }, [dateRange]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Top Destinations</h2>
      <div className="space-y-6">
        {destinations.map((destination, index) => (
          <div key={destination.location} className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
            <div className="ml-4 flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {destination.location}
                </h3>
                <span className="ml-2 text-sm font-medium text-gray-900">
                  ${destination.total_revenue.toLocaleString()}
                </span>
              </div>
              <div className="mt-1 flex items-center text-sm text-gray-500">
                <span>{destination.total_bookings} bookings</span>
                <span className="mx-2">•</span>
                <span>
                  Avg. ${destination.avg_booking_value.toLocaleString()}
                </span>
              </div>
              <div className="mt-2 relative">
                <div className="h-1.5 bg-gray-200 rounded-full">
                  <div
                    className="absolute top-0 left-0 h-full bg-indigo-600 rounded-full"
                    style={{
                      width: `${(destination.total_bookings / destinations[0].total_bookings) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}