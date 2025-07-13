import React, { useState } from 'react';
import { 
  Bell, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Mail, 
  Clock,
  ExternalLink,
  Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BookingNotification } from '../../types/booking';

interface NotificationCenterProps {
  notifications: BookingNotification[];
  onNotificationRead: (notificationId: number) => void;
}

export function NotificationCenter({ 
  notifications, 
  onNotificationRead 
}: NotificationCenterProps) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read_at;
      case 'urgent':
        return notification.priority === 'urgent' || notification.priority === 'high';
      default:
        return true;
    }
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'schedule_change':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'cancellation':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'payment_due':
        return <Mail className="h-5 w-5 text-yellow-600" />;
      case 'confirmation':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'change_request':
        return <Calendar className="h-5 w-5 text-purple-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      urgent: 'bg-red-100 text-red-800 ring-red-200',
      high: 'bg-orange-100 text-orange-800 ring-orange-200',
      normal: 'bg-blue-100 text-blue-800 ring-blue-200',
      low: 'bg-gray-100 text-gray-800 ring-gray-200'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${styles[priority as keyof typeof styles] || styles.normal}`}>
        {priority}
      </span>
    );
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;
  const urgentCount = notifications.filter(n => 
    (n.priority === 'urgent' || n.priority === 'high') && !n.read_at
  ).length;

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Notifications ({filteredNotifications.length})
          </h3>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === 'all'
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === 'unread'
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('urgent')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === 'urgent'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Urgent ({urgentCount})
            </button>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => {
              // Mark all as read functionality could be added here
              notifications.filter(n => !n.read_at).forEach(n => onNotificationRead(n.id));
            }}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Mark All Read</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <div className="text-gray-400 text-lg mb-2">No notifications</div>
            <p className="text-gray-500">
              {filter === 'unread' 
                ? "You're all caught up!" 
                : filter === 'urgent'
                ? "No urgent items at the moment"
                : "No notifications to display"
              }
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`border border-gray-200 rounded-lg p-4 transition-all hover:shadow-sm ${
                !notification.read_at 
                  ? 'bg-blue-50 border-blue-200 shadow-sm' 
                  : 'bg-white'
              }`}
            >
              <div className="flex items-start space-x-4">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.notification_type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className={`text-sm font-medium truncate ${
                          !notification.read_at ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </h4>
                        {getPriorityBadge(notification.priority)}
                        {!notification.read_at && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      
                      <p className={`text-sm ${
                        !notification.read_at ? 'text-gray-700' : 'text-gray-500'
                      }`}>
                        {notification.message}
                      </p>

                      {/* Booking info */}
                      {notification.booking && (
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {notification.booking.booking_reference}
                          </span>
                          <span>
                            {notification.booking.customer?.first_name || 'Unknown'} {notification.booking.customer?.last_name || 'Customer'}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-gray-500">
                          {new Date(notification.created_at).toLocaleDateString()} at{' '}
                          {new Date(notification.created_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>

                        <div className="flex items-center space-x-2">
                          {notification.booking && (
                            <Link
                              to={`/bookings/${notification.booking_id}/workflow`}
                              className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View Booking
                            </Link>
                          )}
                          
                          {!notification.read_at && (
                            <button
                              onClick={() => onNotificationRead(notification.id)}
                              className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Mark Read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary Stats */}
      {notifications.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">{notifications.length}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600">{unreadCount}</div>
              <div className="text-xs text-gray-500">Unread</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-600">{urgentCount}</div>
              <div className="text-xs text-gray-500">Urgent</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">
                {notifications.filter(n => n.read_at).length}
              </div>
              <div className="text-xs text-gray-500">Read</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 