import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { DollarSign, Percent, Send, Download, Save } from 'lucide-react';

interface Service {
  id: string;
  type: string;
  name: string;
  cost: number;
  details: any;
}

interface Props {
  services: Service[];
  travelers: { adults: number; children: number; seniors: number };
  onQuoteFinalize: (quoteData: any) => void;
}

export function QuoteReview({ services, travelers, onQuoteFinalize }: Props) {
  const [markup, setMarkup] = useState(10); // Default 10% markup
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [expiryDays, setExpiryDays] = useState(7);

  const subtotal = services.reduce((sum, service) => {
    return sum + (service.cost * (travelers.adults + travelers.children + travelers.seniors));
  }, 0);

  const markupAmount = (subtotal * markup) / 100;
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal + markupAmount - discountAmount;

  async function handleFinalize(status: 'Draft' | 'Sent') {
    const quoteData = {
      services,
      pricing: {
        subtotal,
        markup: markupAmount,
        discount: discountAmount,
        total,
      },
      notes,
      status,
      expiry_date: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString(),
    };

    onQuoteFinalize(quoteData);
  }

  return (
    <div className="space-y-6">
      {/* Services Summary */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Services</h3>
          <div className="space-y-4">
            {services.map((service) => (
              <div key={service.id} className="flex justify-between items-center py-2">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{service.name}</h4>
                  <p className="text-sm text-gray-500">
                    Day {service.details.day + 1} • {service.type}
                  </p>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  ${(service.cost * (travelers.adults + travelers.children + travelers.seniors)).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Pricing</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Markup Percentage
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Percent className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  value={markup}
                  onChange={(e) => setMarkup(Number(e.target.value))}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md"
                  placeholder="10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Discount Percentage
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Percent className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600">Subtotal</dt>
                  <dd className="text-sm font-medium text-gray-900">${subtotal.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600">Markup ({markup}%)</dt>
                  <dd className="text-sm font-medium text-gray-900">${markupAmount.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600">Discount ({discount}%)</dt>
                  <dd className="text-sm font-medium text-gray-900">-${discountAmount.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <dt className="text-base font-medium text-gray-900">Total</dt>
                  <dd className="text-base font-medium text-gray-900">${total.toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Notes & Terms</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Quote Notes
              </label>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Add any notes or special conditions..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Quote Validity (Days)
              </label>
              <input
                type="number"
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                min="1"
                max="30"
                className="mt-1 block w-32 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={() => handleFinalize('Draft')}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <Save className="h-5 w-5 mr-2" />
          Save as Draft
        </button>
        <button
          onClick={() => handleFinalize('Sent')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Send className="h-5 w-5 mr-2" />
          Send Quote
        </button>
      </div>
    </div>
  );
}