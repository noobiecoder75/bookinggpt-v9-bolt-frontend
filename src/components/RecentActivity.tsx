import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FileText, Calendar, Users, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';

interface Activity {
  id: number;
  type: 'QUOTE_CREATED' | 'QUOTE_SENT' | 'BOOKING_CREATED' | 'BOOKING_CONFIRMED' | 'PAYMENT_RECEIVED' | 'CUSTOMER_ADDED';
  description: string;
  created_at: string;
  quote_id?: number;
  booking_id?: number;
  customer_id?: number;
}

export function RecentActivity() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentActivity();
  }, []);

  const fetchRecentActivity = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'QUOTE_CREATED':
      case 'QUOTE_SENT':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'BOOKING_CREATED':
      case 'BOOKING_CONFIRMED':
        return <Calendar className="h-5 w-5 text-indigo-500" />;
      case 'PAYMENT_RECEIVED':
        return <DollarSign className="h-5 w-5 text-green-500" />;
      case 'CUSTOMER_ADDED':
        return <Users className="h-5 w-5 text-purple-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleActivityClick = (activity: Activity) => {
    switch (activity.type) {
      case 'QUOTE_CREATED':
      case 'QUOTE_SENT':
        if (activity.quote_id) {
          navigate(`/quotes/${activity.quote_id}`);
        }
        break;
      case 'BOOKING_CREATED':
      case 'BOOKING_CONFIRMED':
        if (activity.booking_id) {
          navigate(`/bookings/${activity.booking_id}`);
        }
        break;
      case 'CUSTOMER_ADDED':
        if (activity.customer_id) {
          navigate(`/customers/${activity.customer_id}`);
        }
        break;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {activities.map((activity, activityIdx) => (
          <li key={activity.id}>
            <div className="relative pb-8">
              {activityIdx !== activities.length - 1 && (
                <span
                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              )}
              <div 
                className="relative flex space-x-3 cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-colors duration-150"
                onClick={() => handleActivityClick(activity)}
              >
                <div>
                  <span className="h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white bg-gray-50">
                    {getActivityIcon(activity.type)}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className="text-sm text-gray-500">{activity.description}</p>
                  </div>
                  <div className="whitespace-nowrap text-right text-sm text-gray-500">
                    <time dateTime={activity.created_at}>
                      {new Date(activity.created_at).toLocaleString()}
                    </time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
} 