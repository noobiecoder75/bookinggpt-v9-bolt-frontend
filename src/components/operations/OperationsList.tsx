import React, { useState } from 'react';
import { 
  Filter, 
  Search, 
  Calendar, 
  User, 
  Plane, 
  XCircle, 
  RotateCcw,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BookingOperation } from '../../types/booking';

interface OperationsListProps {
  operations: BookingOperation[];
  onOperationUpdate: (operationId: number, status: string, notes?: string) => void;
  filters: {
    status: string;
    type: string;
    priority: string;
  };
  onFiltersChange: (filters: any) => void;
}

export function OperationsList({ 
  operations, 
  onOperationUpdate, 
  filters, 
  onFiltersChange 
}: OperationsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOperation, setSelectedOperation] = useState<BookingOperation | null>(null);
  const [updateNotes, setUpdateNotes] = useState('');
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  const filteredOperations = operations.filter(operation => {
    const searchString = searchTerm.toLowerCase();
    const matchesSearch = 
      operation.reason.toLowerCase().includes(searchString) ||
      operation.booking?.booking_reference.toLowerCase().includes(searchString) ||
      `${operation.booking?.customer.first_name} ${operation.booking?.customer.last_name}`.toLowerCase().includes(searchString);
    
    return matchesSearch;
  });

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'airline_change':
        return <Plane className="h-5 w-5 text-blue-600" />;
      case 'customer_change':
        return <User className="h-5 w-5 text-green-600" />;
      case 'cancellation':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'rebook':
        return <RotateCcw className="h-5 w-5 text-purple-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const handleStatusUpdate = (operation: BookingOperation, status: string) => {
    setSelectedOperation(operation);
    setNewStatus(status);
    setShowUpdateModal(true);
  };

  const submitStatusUpdate = () => {
    if (selectedOperation) {
      onOperationUpdate(selectedOperation.id, newStatus, updateNotes);
      setShowUpdateModal(false);
      setUpdateNotes('');
      setSelectedOperation(null);
      setNewStatus('');
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Search operations..."
            />
          </div>

          <div className="flex gap-2">
            <select
              value={filters.status}
              onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
              className="block w-full sm:w-32 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>

            <select
              value={filters.type}
              onChange={(e) => onFiltersChange({ ...filters, type: e.target.value })}
              className="block w-full sm:w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
            >
              <option value="all">All Types</option>
              <option value="airline_change">Airline Change</option>
              <option value="customer_change">Customer Change</option>
              <option value="cancellation">Cancellation</option>
              <option value="rebook">Rebook</option>
            </select>
          </div>
        </div>

        {/* Operations List */}
        <div className="space-y-4">
          {filteredOperations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">No operations found</div>
              <p className="text-gray-500">Try adjusting your filters or search term</p>
            </div>
          ) : (
            filteredOperations.map((operation) => (
              <div
                key={operation.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0 mt-1">
                      {getOperationIcon(operation.operation_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {operation.reason}
                        </h3>
                        {getStatusBadge(operation.operation_status)}
                      </div>
                      
                      {operation.booking && (
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {operation.booking.booking_reference}
                          </span>
                          <span>
                            {operation.booking.customer.first_name} {operation.booking.customer.last_name}
                          </span>
                          <Link
                            to={`/bookings/${operation.booking_id}/workflow`}
                            className="flex items-center text-indigo-600 hover:text-indigo-800"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View Booking
                          </Link>
                        </div>
                      )}
                      
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        Created: {new Date(operation.created_at).toLocaleDateString()}
                        {operation.completed_at && (
                          <span className="ml-4">
                            Completed: {new Date(operation.completed_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {operation.notes && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                          <strong>Notes:</strong> {operation.notes}
                        </div>
                      )}

                      {(operation.change_fee > 0 || operation.refund_amount > 0) && (
                        <div className="mt-2 flex space-x-4 text-sm">
                          {operation.change_fee > 0 && (
                            <span className="text-red-600">
                              Change Fee: ${operation.change_fee}
                            </span>
                          )}
                          {operation.refund_amount > 0 && (
                            <span className="text-green-600">
                              Refund: ${operation.refund_amount}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {operation.operation_status !== 'completed' && operation.operation_status !== 'failed' && (
                    <div className="flex-shrink-0 ml-4">
                      <div className="flex space-x-2">
                        {operation.operation_status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(operation, 'processing')}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                              Start Processing
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(operation, 'completed')}
                              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                            >
                              Complete
                            </button>
                          </>
                        )}
                        {operation.operation_status === 'processing' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(operation, 'completed')}
                              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(operation, 'failed')}
                              className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            >
                              Mark Failed
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Update Status Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Update Operation Status
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Updating status to: <strong>{newStatus}</strong>
              </p>
              <p className="text-sm text-gray-500">
                {selectedOperation?.reason}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.value)}
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Add any notes about this update..."
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={submitStatusUpdate}
                className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
              >
                Update Status
              </button>
              <button
                onClick={() => {
                  setShowUpdateModal(false);
                  setUpdateNotes('');
                  setSelectedOperation(null);
                  setNewStatus('');
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 