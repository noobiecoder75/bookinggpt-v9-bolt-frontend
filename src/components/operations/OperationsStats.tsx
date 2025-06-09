import React from 'react';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Users,
  Plane,
  RotateCcw
} from 'lucide-react';

interface OperationsStatsProps {
  stats: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    byType: {
      airline_change: number;
      customer_change: number;
      cancellation: number;
      rebook: number;
    };
    thisWeek: number;
  };
}

export function OperationsStats({ stats }: OperationsStatsProps) {
  const completionRate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : '0.0';
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Operations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Operations</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.thisWeek} this week</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-lg">
            <TrendingUp className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Pending Operations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-gray-500 mt-1">Awaiting action</p>
          </div>
          <div className="p-3 bg-yellow-100 rounded-lg">
            <Clock className="h-6 w-6 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Processing Operations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Processing</p>
            <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
            <p className="text-xs text-gray-500 mt-1">In progress</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-lg">
            <RotateCcw className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Completion Rate */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Completion Rate</p>
            <p className="text-2xl font-bold text-green-600">{completionRate}%</p>
            <p className="text-xs text-gray-500 mt-1">{stats.completed} completed</p>
          </div>
          <div className="p-3 bg-green-100 rounded-lg">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </div>

      {/* Operations by Type */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:col-span-2 lg:col-span-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Operations by Type</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Plane className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.byType.airline_change}</p>
              <p className="text-sm text-gray-600">Airline Changes</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.byType.customer_change}</p>
              <p className="text-sm text-gray-600">Customer Changes</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.byType.cancellation}</p>
              <p className="text-sm text-gray-600">Cancellations</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <RotateCcw className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.byType.rebook}</p>
              <p className="text-sm text-gray-600">Rebookings</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 