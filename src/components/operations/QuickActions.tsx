import React, { useState } from 'react';
import { 
  Plus, 
  Scan, 
  Users, 
  Plane, 
  AlertTriangle,
  RefreshCw,
  Mail,
  PhoneCall
} from 'lucide-react';
import { OperationsService } from '../../services/operationsService';

interface QuickActionsProps {
  onActionComplete: () => void;
}

export function QuickActions({ onActionComplete }: QuickActionsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'change_request' | 'monitoring' | null>(null);
  const [loading, setLoading] = useState(false);
  const [bookingRef, setBookingRef] = useState('');
  const [changeType, setChangeType] = useState<'customer_change' | 'airline_change' | 'cancellation' | 'rebook'>('customer_change');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const openModal = (type: 'change_request' | 'monitoring') => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalType(null);
    setBookingRef('');
    setReason('');
    setNotes('');
  };

  const handleCreateChangeRequest = async () => {
    if (!bookingRef || !reason) return;

    setLoading(true);
    try {
      // In a real app, you'd lookup the booking ID from the reference
      const mockBookingId = Math.floor(Math.random() * 100) + 1;
      
      await OperationsService.createOperation({
        booking_id: mockBookingId,
        operation_type: changeType,
        reason,
        notes
      });

      onActionComplete();
      closeModal();
    } catch (error) {
      console.error('Error creating change request:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunMonitoring = async () => {
    setLoading(true);
    try {
      // Simulate monitoring checks for multiple bookings
      const mockBookingIds = [1, 2, 3, 4, 5];
      
      for (const bookingId of mockBookingIds) {
        await OperationsService.detectAirlineChanges(bookingId);
      }

      await OperationsService.createNotification({
        booking_id: 1,
        notification_type: 'schedule_change',
        title: 'Monitoring Check Complete',
        message: 'Completed monitoring check for active bookings. Found 2 schedule changes requiring attention.',
        priority: 'normal'
      });

      onActionComplete();
      closeModal();
    } catch (error) {
      console.error('Error running monitoring:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Create Change Request */}
          <button
            onClick={() => openModal('change_request')}
            className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors group"
          >
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-indigo-200 transition-colors">
              <Plus className="h-6 w-6 text-indigo-600" />
            </div>
            <span className="text-sm font-medium text-gray-900 text-center">
              Create Change Request
            </span>
            <span className="text-xs text-gray-500 text-center mt-1">
              Manual operation entry
            </span>
          </button>

          {/* Run Monitoring */}
          <button
            onClick={() => openModal('monitoring')}
            className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors group"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
              <Scan className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-900 text-center">
              Run Monitoring
            </span>
            <span className="text-xs text-gray-500 text-center mt-1">
              Check for changes
            </span>
          </button>

          {/* Send Customer Updates */}
          <button
            onClick={() => {
              // This would open an email composition interface
              console.log('Send customer updates');
            }}
            className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors group"
          >
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
              <Mail className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-900 text-center">
              Customer Updates
            </span>
            <span className="text-xs text-gray-500 text-center mt-1">
              Bulk notifications
            </span>
          </button>

          {/* Emergency Contact */}
          <button
            onClick={() => {
              // This would open emergency contact procedures
              console.log('Emergency contact');
            }}
            className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-400 hover:bg-red-50 transition-colors group"
          >
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-red-200 transition-colors">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <span className="text-sm font-medium text-gray-900 text-center">
              Emergency Mode
            </span>
            <span className="text-xs text-gray-500 text-center mt-1">
              Crisis management
            </span>
          </button>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            {modalType === 'change_request' && (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Create Change Request
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Booking Reference
                    </label>
                    <input
                      type="text"
                      value={bookingRef}
                      onChange={(e) => setBookingRef(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., BK123456"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Change Type
                    </label>
                    <select
                      value={changeType}
                      onChange={(e) => setChangeType(e.target.value as any)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="customer_change">Customer Change</option>
                      <option value="airline_change">Airline Change</option>
                      <option value="cancellation">Cancellation</option>
                      <option value="rebook">Rebook</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason
                    </label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Brief description of the change"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Additional details..."
                    />
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={handleCreateChangeRequest}
                    disabled={loading || !bookingRef || !reason}
                    className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creating...' : 'Create Request'}
                  </button>
                  <button
                    onClick={closeModal}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {modalType === 'monitoring' && (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Run Monitoring Check
                </h3>
                
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Scan className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-900">Monitoring Check</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      This will check all active bookings for:
                    </p>
                    <ul className="text-sm text-blue-700 mt-2 space-y-1">
                      <li>• Flight schedule changes</li>
                      <li>• Hotel availability issues</li>
                      <li>• Payment status updates</li>
                      <li>• Supplier notifications</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">
                        This may take a few minutes to complete
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={handleRunMonitoring}
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Running...
                      </>
                    ) : (
                      'Start Monitoring'
                    )}
                  </button>
                  <button
                    onClick={closeModal}
                    disabled={loading}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
} 