import React, { useState } from 'react';
import { X, CreditCard, Lock, CheckCircle, AlertCircle } from 'lucide-react';

interface Quote {
  id: string;
  customer: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  total_price: number;
  quote_items: Array<{
    id: number;
    item_type: string;
    item_name: string;
    cost: number;
    quantity: number;
  }>;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote;
  onPaymentSuccess: (paymentRef: string) => void;
}

export function PaymentModal({ isOpen, onClose, quote, onPaymentSuccess }: PaymentModalProps) {
  const [step, setStep] = useState<'review' | 'payment' | 'processing' | 'success'>('review');
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');

  if (!isOpen) return null;

  const simulatePayment = async () => {
    setStep('processing');
    
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Generate fake payment reference
    const fakePaymentRef = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    setPaymentReference(fakePaymentRef);
    setStep('success');
    
    // Wait a moment then call success callback
    setTimeout(() => {
      onPaymentSuccess(fakePaymentRef);
    }, 2000);
  };

  const handleClose = () => {
    if (step !== 'processing') {
      setStep('review');
      setAcceptedTerms(false);
      setPaymentReference('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {step === 'review' && 'Review & Payment'}
            {step === 'payment' && 'Payment Details'}
            {step === 'processing' && 'Processing Payment'}
            {step === 'success' && 'Payment Successful'}
          </h2>
          {step !== 'processing' && (
            <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="p-6">
          {/* Review Step */}
          {step === 'review' && (
            <div className="space-y-6">
              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Customer Information</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <p className="text-sm text-gray-900">{quote.customer.first_name} {quote.customer.last_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="text-sm text-gray-900">{quote.customer.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <p className="text-sm text-gray-900">{quote.customer.phone}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking Summary */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Booking Summary</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-3">
                    {quote.quote_items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.item_name}</p>
                          <p className="text-xs text-gray-500">{item.item_type}</p>
                          {item.quantity > 1 && (
                            <p className="text-xs text-gray-500">Quantity: {item.quantity}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            ${(item.cost * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex justify-between items-center">
                        <p className="text-base font-semibold text-gray-900">Total Amount</p>
                        <p className="text-base font-semibold text-gray-900">${quote.total_price.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Terms & Conditions</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>• Payment is processed securely and is non-refundable once booking is confirmed</p>
                    <p>• Hotel and flight bookings are subject to availability and provider terms</p>
                    <p>• Cancellation policies vary by provider and will be detailed in your confirmation</p>
                    <p>• This is a simulated booking environment for testing purposes</p>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-900">
                      I accept the terms and conditions and authorize payment
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep('payment')}
                  disabled={!acceptedTerms}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Proceed to Payment
                </button>
              </div>
            </div>
          )}

          {/* Payment Step */}
          {step === 'payment' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Payment Method</h3>
                <div className="space-y-3">
                  <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payment_method"
                      value="credit_card"
                      checked={paymentMethod === 'credit_card'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <CreditCard className="h-5 w-5 text-gray-400 ml-3 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Credit Card (Simulated)</p>
                      <p className="text-xs text-gray-500">Visa/Mastercard/American Express</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payment_method"
                      value="bank_transfer"
                      checked={paymentMethod === 'bank_transfer'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="h-5 w-5 bg-gray-400 rounded ml-3 mr-3"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Bank Transfer (Simulated)</p>
                      <p className="text-xs text-gray-500">Direct bank payment</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Simulated Payment Details */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Lock className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Simulated Payment Environment</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      This is a test environment. No real payment will be processed. 
                      The system will simulate a successful payment and proceed with booking.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <p className="text-lg font-semibold text-gray-900">Amount to Charge</p>
                  <p className="text-lg font-semibold text-gray-900">${quote.total_price.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setStep('review')}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={simulatePayment}
                  className="px-6 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 flex items-center"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Simulate Payment
                </button>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {step === 'processing' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Processing Payment</h3>
              <p className="text-sm text-gray-600">Please wait while we process your payment...</p>
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                  <p className="text-sm text-yellow-800">Do not close this window during processing</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Successful!</h3>
              <p className="text-sm text-gray-600 mb-4">Your payment has been processed successfully.</p>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="text-left">
                  <p className="text-sm font-medium text-green-900">Payment Reference</p>
                  <p className="text-sm text-green-700 font-mono">{paymentReference}</p>
                  <p className="text-sm text-green-700 mt-2">
                    Amount: ${quote.total_price.toFixed(2)}
                  </p>
                  <p className="text-sm text-green-700">
                    Method: {paymentMethod === 'credit_card' ? 'Credit Card' : 'Bank Transfer'} (Simulated)
                  </p>
                </div>
              </div>
              
              <p className="text-sm text-gray-600">
                Initiating booking process... You will be redirected shortly.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 