import React, { useState } from 'react';
import { AlertTriangle, Clock, CheckCircle, XCircle, RefreshCw, Edit3, ChevronDown, ChevronUp } from 'lucide-react';
import type { BookingOperation } from '../../types/booking';

interface Props {
  operation: BookingOperation;
  onUpdate: () => void;
}

export function OperationCard({ operation, onUpdate }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'airline_change':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'customer_change':
        return <Edit3 className="h-5 w-5 text-blue-500" />;
      case 'cancellation':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'rebook':
        return <RefreshCw className="h-5 w-5 text-green-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const classes = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${classes[status as keyof typeof classes]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatOperationType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {getOperationIcon(operation.operation_type)}
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {formatOperationType(operation.operation_type)}
            </h3>
            <p className="text-sm text-gray-500">
              {operation.booking?.booking_reference} • {operation.booking?.customer?.first_name || 'Unknown'} {operation.booking?.customer?.last_name || 'Customer'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {getStatusBadge(operation.operation_status)}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-gray-700">Reason</h4>
              <p className="text-sm text-gray-600">{operation.reason}</p>
            </div>
            
            {operation.change_fee > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700">Change Fee</h4>
                <p className="text-sm text-gray-600">${operation.change_fee}</p>
              </div>
            )}
            
            <div>
              <h4 className="text-sm font-medium text-gray-700">Created</h4>
              <p className="text-sm text-gray-600">
                {new Date(operation.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="flex space-x-2 pt-2">
              <button className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors">
                Process
              </button>
              <button className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors">
                View Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 