import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface TopProduct {
  item_name: string;
  item_type: string;
  total_revenue: number;
  total_bookings: number;
  avg_price: number;
}

interface Props {
  dateRange: { start: Date; end: Date };
}

export function TopProducts({ dateRange }: Props) {
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: bookingItems } = await supabase
        .from('booking_items')
        .select(`
          item_name,
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
        const productStats = bookingItems.reduce((acc, item) => {
          const key = `${item.item_type}-${item.item_name}`;
          if (!acc[key]) {
            acc[key] = {
              item_name: item.item_name,
              item_type: item.item_type,
              total_revenue: 0,
              total_bookings: 0,
              total_cost: 0,
            };
          }
          
          const revenue = Number(item.cost) * Number(item.quantity);
          acc[key].total_revenue += revenue;
          acc[key].total_bookings += 1;
          acc[key].total_cost += Number(item.cost);
          
          return acc;
        }, {} as Record<string, any>);

        const topProducts = Object.values(productStats)
          .map(product => ({
            ...product,
            avg_price: product.total_cost / product.total_bookings,
          }))
          .sort((a, b) => b.total_revenue - a.total_revenue)
          .slice(0, 5);

        setProducts(topProducts);
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
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Top Products</h2>
      <div className="space-y-6">
        {products.map((product, index) => (
          <div key={`${product.item_type}-${product.item_name}`} className="flex items-start">
            <div className="flex-shrink-0 w-8 text-gray-400 font-medium">
              #{index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {product.item_name}
                </h3>
                <div className="ml-2 flex items-center text-sm">
                  <span className="font-medium text-gray-900">
                    ${product.total_revenue.toLocaleString()}
                  </span>
                  {index === 0 && (
                    <TrendingUp className="ml-1 w-4 h-4 text-emerald-500" />
                  )}
                  {index === products.length - 1 && (
                    <TrendingDown className="ml-1 w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
              <div className="mt-1 flex items-center text-sm text-gray-500">
                <span>{product.total_bookings} bookings</span>
                <span className="mx-2">•</span>
                <span>Avg. ${product.avg_price.toLocaleString()}</span>
                <span className="mx-2">•</span>
                <span className="capitalize">{product.item_type.toLowerCase()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}