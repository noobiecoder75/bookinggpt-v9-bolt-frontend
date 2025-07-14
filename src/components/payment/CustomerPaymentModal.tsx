import React, { useState } from 'react';
import { X, CreditCard, DollarSign, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface CustomerPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  onPaymentSuccess: (paymentDetails: any) => void;
}

export function CustomerPaymentModal({ isOpen, onClose, customer, onPaymentSuccess }: CustomerPaymentModalProps) {
  const [paymentDetails, setPaymentDetails] = useState({
    amount: '',
    description: '',
    currency: 'usd',
    payment_type: 'full'
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

  const handleCreatePaymentIntent = async () => {
    if (!paymentDetails.amount || !paymentDetails.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(paymentDetails.amount);
    if (amount < 0.50) {
      toast.error('Minimum payment amount is $0.50');
      return;
    }

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/stripe-connect/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customerId: customer.id,
          amount: amount,
          currency: paymentDetails.currency,
          description: paymentDetails.description,
          metadata: {
            payment_type: paymentDetails.payment_type,
            customer_name: `${customer.first_name} ${customer.last_name}`,
            customer_email: customer.email
          }
        })
      });

      const data = await response.json();

      if (response.ok) {
        setPaymentIntentId(data.payment_intent.id);
        setStep('payment');
        toast.success('Payment link created successfully');
      } else {
        toast.error(data.error || 'Failed to create payment');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('Failed to create payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = () => {
    setStep('success');
    onPaymentSuccess({
      paymentIntentId,
      amount: paymentDetails.amount,
      description: paymentDetails.description,
      customer: customer
    });
    
    // Auto-close after 3 seconds
    setTimeout(() => {
      onClose();
      resetModal();
    }, 3000);
  };

  const resetModal = () => {
    setPaymentDetails({
      amount: '',
      description: '',
      currency: 'usd',
      payment_type: 'full'
    });
    setStep('details');
    setPaymentIntentId(null);
    setIsProcessing(false);
  };

  const handleClose = () => {
    onClose();
    resetModal();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {step === 'details' ? 'Request Payment' : 
             step === 'payment' ? 'Payment Link Created' : 
             'Payment Successful'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'details' && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Customer</h3>
                <p className="text-gray-700">{customer.first_name} {customer.last_name}</p>
                <p className="text-gray-600 text-sm">{customer.email}</p>
              </div>

              {/* Payment Details Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0.50"
                      value={paymentDetails.amount}
                      onChange={(e) => setPaymentDetails({ ...paymentDetails, amount: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <input
                    type="text"
                    value={paymentDetails.description}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Trip to Paris - Deposit"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Type
                  </label>
                  <select
                    value={paymentDetails.payment_type}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, payment_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="full">Full Payment</option>
                    <option value="deposit">Deposit</option>
                    <option value="final">Final Payment</option>
                    <option value="installment">Installment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    value={paymentDetails.currency}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="usd">USD ($)</option>
                    <option value="eur">EUR (€)</option>
                    <option value="gbp">GBP (£)</option>
                    <option value="cad">CAD ($)</option>
                  </select>
                </div>
              </div>

              {/* Platform Fee Notice */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Platform Fee</p>
                    <p className="text-sm text-blue-700 mt-1">
                      BookingGPT charges a 2.5% platform fee on all transactions. 
                      You'll receive {paymentDetails.amount ? 
                        `$${(parseFloat(paymentDetails.amount) * 0.975).toFixed(2)}` : 
                        '97.5%'} of the payment amount.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePaymentIntent}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Create Payment Link
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'payment' && (
            <div className="text-center space-y-6">
              <div className="bg-green-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
                <CreditCard className="h-10 w-10 text-green-600" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Payment Link Created
                </h3>
                <p className="text-gray-600">
                  A secure payment link has been created for {customer.first_name} {customer.last_name}.
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 text-left">
                <p className="text-sm text-gray-600 mb-2">Payment Details:</p>
                <div className="space-y-1">
                  <p className="text-sm"><strong>Amount:</strong> ${paymentDetails.amount}</p>
                  <p className="text-sm"><strong>Description:</strong> {paymentDetails.description}</p>
                  <p className="text-sm"><strong>Type:</strong> {paymentDetails.payment_type}</p>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>Next Steps:</strong> The customer will receive a secure payment link via email. 
                  They can complete the payment using their preferred payment method.
                </p>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handlePaymentSuccess}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Mark as Sent
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center space-y-6">
              <div className="bg-green-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Payment Request Sent
                </h3>
                <p className="text-gray-600">
                  The payment request has been successfully sent to {customer.first_name} {customer.last_name}.
                </p>
              </div>

              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <p className="text-sm text-green-900">
                  You'll receive a notification once the payment is completed. 
                  The funds will be transferred to your account within 2-7 business days.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}