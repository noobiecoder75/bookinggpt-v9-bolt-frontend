import React, { useState } from 'react';
import { 
  CreditCard, 
  Shield, 
  CheckCircle, 
  Lock, 
  Calendar,
  User,
  DollarSign,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

interface Quote {
  id: string;
  quote_reference?: string;
  total_price: number;
  discount: number;
  expiry_date: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface ClientPaymentProps {
  quote: Quote;
  onSuccess: () => void;
}

export function ClientPayment({ quote, onSuccess }: ClientPaymentProps) {
  const [paymentStep, setPaymentStep] = useState<'options' | 'details' | 'processing' | 'success'>('options');
  const [paymentOption, setPaymentOption] = useState<'full' | 'deposit'>('full');
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: '',
    billingAddress: '',
    city: '',
    zipCode: '',
    country: ''
  });

  const finalPrice = quote.total_price * (1 - quote.discount / 100);
  const depositAmount = finalPrice * 0.3; // 30% deposit
  const remainingAmount = finalPrice - depositAmount;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePayment = async () => {
    setPaymentStep('processing');
    
    // Simulate payment processing
    setTimeout(() => {
      setPaymentStep('success');
      setTimeout(() => {
        onSuccess();
      }, 3000);
    }, 3000);
  };

  const isFormValid = () => {
    return formData.cardNumber && 
           formData.expiryDate && 
           formData.cvv && 
           formData.nameOnCard && 
           formData.billingAddress;
  };

  if (paymentStep === 'processing') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Processing Your Payment</h2>
          <p className="text-slate-600">Please don't close this window. We're securing your booking...</p>
          <div className="mt-6 bg-blue-50 rounded-2xl p-4">
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">256-bit SSL Encryption Active</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (paymentStep === 'success') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Payment Successful!</h2>
          <p className="text-lg text-slate-600 mb-4">Your booking is confirmed</p>
          <div className="bg-green-50 rounded-2xl p-6 mb-6">
            <p className="text-green-800 font-medium">
              Confirmation details have been sent to {quote.customer.email}
            </p>
            <p className="text-green-700 text-sm mt-2">
              Quote Reference: {quote.quote_reference}
            </p>
          </div>
          <p className="text-slate-500 text-sm">
            You'll be redirected to your trip details shortly...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Payment Options */}
      {paymentStep === 'options' && (
        <>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl"></div>
            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Choose Your Payment Option</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Payment */}
                <div 
                  className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                    paymentOption === 'full' 
                      ? 'border-blue-500 bg-blue-50/80' 
                      : 'border-white/20 bg-white/50 hover:border-blue-300'
                  }`}
                  onClick={() => setPaymentOption('full')}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Pay in Full</h3>
                      <p className="text-slate-600 text-sm">Complete your booking today</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 ${
                      paymentOption === 'full' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                    } flex items-center justify-center`}>
                      {paymentOption === 'full' && <div className="w-3 h-3 bg-white rounded-full"></div>}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-green-600 mb-2">
                    ${finalPrice.toFixed(2)}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>Save 5% on total cost</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>Immediate confirmation</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>No additional fees</span>
                    </div>
                  </div>
                </div>

                {/* Deposit Payment */}
                <div 
                  className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                    paymentOption === 'deposit' 
                      ? 'border-blue-500 bg-blue-50/80' 
                      : 'border-white/20 bg-white/50 hover:border-blue-300'
                  }`}
                  onClick={() => setPaymentOption('deposit')}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Pay Deposit</h3>
                      <p className="text-slate-600 text-sm">Secure your booking now</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 ${
                      paymentOption === 'deposit' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                    } flex items-center justify-center`}>
                      {paymentOption === 'deposit' && <div className="w-3 h-3 bg-white rounded-full"></div>}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-blue-600 mb-2">
                    ${depositAmount.toFixed(2)}
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>30% deposit today</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>Flexible payment schedule</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>Hold your dates</span>
                    </div>
                  </div>
                  <div className="bg-blue-100 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      Remaining ${remainingAmount.toFixed(2)} due 60 days before travel
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 text-center">
                <button
                  onClick={() => setPaymentStep('details')}
                  className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  Continue to Payment Details
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            </div>
          </div>

          {/* Security Features */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl"></div>
            <div className="relative z-10">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Your Security is Our Priority</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-green-600" />
                <div>
                  <p className="font-medium text-slate-900">SSL Encrypted</p>
                  <p className="text-sm text-slate-600">Bank-level security</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Lock className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="font-medium text-slate-900">PCI Compliant</p>
                  <p className="text-sm text-slate-600">Secure card processing</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <p className="font-medium text-slate-900">Money Back</p>
                  <p className="text-sm text-slate-600">Guarantee protection</p>
                </div>
              </div>
            </div>
            </div>
          </div>
        </>
      )}

      {/* Payment Details Form */}
      {paymentStep === 'details' && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Payment Details</h2>
                <p className="text-slate-600">
                  {paymentOption === 'full' ? 'Complete payment' : 'Deposit payment'}: ${(paymentOption === 'full' ? finalPrice : depositAmount).toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => setPaymentStep('options')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                ← Change Payment Option
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Payment Form */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Card Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      value={formData.cardNumber}
                      onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                    <CreditCard className="absolute right-3 top-3 h-5 w-5 text-slate-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={formData.expiryDate}
                      onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      CVV
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      value={formData.cvv}
                      onChange={(e) => handleInputChange('cvv', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Name on Card
                  </label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={formData.nameOnCard}
                    onChange={(e) => handleInputChange('nameOnCard', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Billing Address
                  </label>
                  <input
                    type="text"
                    placeholder="123 Main Street"
                    value={formData.billingAddress}
                    onChange={(e) => handleInputChange('billingAddress', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="New York"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      placeholder="10001"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Order Summary</h3>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Trip Total</span>
                    <span className="font-medium">${quote.total_price.toFixed(2)}</span>
                  </div>
                  {quote.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({quote.discount}%)</span>
                      <span>-${(quote.total_price * (quote.discount / 100)).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>
                        {paymentOption === 'full' ? 'Total Due Today' : 'Deposit Due Today'}
                      </span>
                      <span className="text-green-600">
                        ${(paymentOption === 'full' ? finalPrice : depositAmount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {paymentOption === 'deposit' && (
                    <div className="text-sm text-slate-600 bg-blue-100 rounded-lg p-3">
                      <p className="font-medium">Remaining Payment Schedule:</p>
                      <p>${remainingAmount.toFixed(2)} due 60 days before travel</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3 mb-6 text-sm">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Free cancellation for 24 hours</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Best price guarantee</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>24/7 customer support</span>
                  </div>
                </div>

                <button
                  onClick={handlePayment}
                  disabled={!isFormValid()}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-4 rounded-2xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Shield className="w-5 h-5" />
                    Complete Secure Payment
                  </div>
                </button>

                <p className="text-xs text-slate-500 text-center mt-3">
                  By completing this payment, you agree to our terms and conditions
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}