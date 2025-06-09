import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Plane, 
  User, 
  Calendar,
  Bell,
  Filter,
  Search,
  RefreshCw,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { OperationsService } from '../../services/operationsService';
import { BookingOperation, BookingNotification } from '../../types/booking';
import { OperationsStats } from './OperationsStats';
import { OperationsList } from './OperationsList';
import { NotificationCenter } from './NotificationCenter';
import { QuickActions } from './QuickActions';

export function OperationsDashboard() {
  const [operations, setOperations] = useState<BookingOperation[]>([]);
  const [notifications, setNotifications] = useState<BookingNotification[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'operations' | 'notifications'>('overview');
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    priority: 'all'
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [operationsData, notificationsData, statsData] = await Promise.all([
        OperationsService.getOperations({
          status: filters.status !== 'all' ? filters.status as any : undefined,
          type: filters.type !== 'all' ? filters.type as any : undefined,
        }),
        OperationsService.getNotifications({ limit: 50 }),
        OperationsService.getOperationsStats()
      ]);

      setOperations(operationsData);
      setNotifications(notificationsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching operations data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOperationUpdate = async (operationId: number, status: string, notes?: string) => {
    try {
      await OperationsService.updateOperationStatus(operationId, status as any, notes);
      await fetchData(); // Refresh data
    } catch (error) {
      console.error('Error updating operation:', error);
    }
  };

  const handleNotificationRead = async (notificationId: number) => {
    try {
      await OperationsService.markNotificationRead(notificationId);
      await fetchData(); // Refresh data
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const urgentNotifications = notifications.filter(n => 
    n.priority === 'urgent' || n.priority === 'high'
  );

  const pendingOperations = operations.filter(op => 
    op.operation_status === 'pending' || op.operation_status === 'processing'
  );

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading operations dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Operations Center</h1>
              <p className="text-gray-600 mt-1">
                Manage booking changes, issues, and customer requests
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {urgentNotifications.length > 0 && (
                <div className="flex items-center bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                  <span className="text-red-800 font-medium">
                    {urgentNotifications.length} urgent items
                  </span>
                </div>
              )}
              
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        {stats && <OperationsStats stats={stats} />}

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'overview'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('operations')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'operations'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Operations ({pendingOperations.length})
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'notifications'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Notifications ({notifications.filter(n => !n.read_at).length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Urgent Items */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                    Urgent Items
                  </h3>
                  
                  <div className="space-y-3">
                    {urgentNotifications.slice(0, 5).map(notification => (
                      <div
                        key={notification.id}
                        className="bg-red-50 border border-red-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-red-900">
                              {notification.title}
                            </h4>
                            <p className="text-sm text-red-700 mt-1">
                              {notification.message}
                            </p>
                            <div className="flex items-center mt-2 text-xs text-red-600">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(notification.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">
                            {notification.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    {urgentNotifications.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="h-12 w-12 mx-auto text-green-400 mb-4" />
                        <p>No urgent items requiring attention</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Operations */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Clock className="h-5 w-5 text-blue-600 mr-2" />
                    Recent Operations
                  </h3>
                  
                  <div className="space-y-3">
                    {operations.slice(0, 5).map(operation => (
                      <div
                        key={operation.id}
                        className="bg-white border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              {operation.operation_type === 'airline_change' && (
                                <Plane className="h-4 w-4 text-blue-600" />
                              )}
                              {operation.operation_type === 'customer_change' && (
                                <User className="h-4 w-4 text-green-600" />
                              )}
                              <h4 className="font-medium text-gray-900">
                                {operation.reason}
                              </h4>
                            </div>
                            {operation.booking && (
                              <p className="text-sm text-gray-600 mt-1">
                                {operation.booking.booking_reference} - 
                                {operation.booking.customer.first_name} {operation.booking.customer.last_name}
                              </p>
                            )}
                            <div className="flex items-center mt-2 text-xs text-gray-500">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(operation.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            operation.operation_status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : operation.operation_status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : operation.operation_status === 'processing'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {operation.operation_status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'operations' && (
              <OperationsList
                operations={operations}
                onOperationUpdate={handleOperationUpdate}
                filters={filters}
                onFiltersChange={setFilters}
              />
            )}

            {activeTab === 'notifications' && (
              <NotificationCenter
                notifications={notifications}
                onNotificationRead={handleNotificationRead}
              />
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <QuickActions onActionComplete={fetchData} />
      </div>
    </div>
  );
} 