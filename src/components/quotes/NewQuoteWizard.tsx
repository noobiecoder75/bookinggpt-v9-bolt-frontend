import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Search, Calendar, Users, MapPin, Plane, Building, Car, ArrowLeft, ArrowRight } from 'lucide-react';
import { QuoteServices } from './QuoteServices';
import { QuoteReview } from './QuoteReview';

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface TravelRequirements {
  adults: number;
  children: number;
  seniors: number;
  departureDate: string;
  returnDate: string;
  origin: string;
  destination: string;
  tripType: 'flight' | 'hotel' | 'flight+hotel' | 'tour' | 'custom';
  specialRequests: string;
}

interface Service {
  id: string;
  type: string;
  name: string;
  cost: number;
  details: any;
}

export function NewQuoteWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    passport_number: '',
    nationality: '',
  });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [travelRequirements, setTravelRequirements] = useState<TravelRequirements>({
    adults: 1,
    children: 0,
    seniors: 0,
    departureDate: '',
    returnDate: '',
    origin: '',
    destination: '',
    tripType: 'flight+hotel',
    specialRequests: '',
  });
  const [services, setServices] = useState<Service[]>([]);

  // Search customers when search term changes
  useEffect(() => {
    if (searchTerm) {
      const searchCustomers = async () => {
        const { data } = await supabase
          .from('customers')
          .select('*')
          .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
          .limit(5);
        
        if (data) {
          setCustomers(data);
        }
      };
      
      searchCustomers();
    }
  }, [searchTerm]);

  const handleCreateCustomer = async () => {
    const { data, error } = await supabase
      .from('customers')
      .insert([newCustomer])
      .select()
      .single();

    if (error) {
      alert('Error creating customer: ' + error.message);
      return;
    }

    if (data) {
      setSelectedCustomer(data);
      setShowNewCustomerForm(false);
      setNewCustomer({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        passport_number: '',
        nationality: '',
      });
    }
  };

  const handleNext = () => {
    if (step === 1 && !selectedCustomer) {
      alert('Please select a customer');
      return;
    }
    if (step === 2 && !travelRequirements.destination) {
      alert('Please fill in the required fields');
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const steps = [
    { number: 1, label: 'Customer' },
    { number: 2, label: 'Requirements' },
    { number: 3, label: 'Services' },
    { number: 4, label: 'Review' },
  ];

  const handleStepClick = (stepNumber: number) => {
    // Only allow going back to previous steps
    if (stepNumber < step) {
      setStep(stepNumber);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {steps.map((s, index) => (
            <div key={s.number} className="flex items-center">
              <button
                onClick={() => handleStepClick(s.number)}
                className={`group flex flex-col items-center ${
                  s.number < step ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                  step >= s.number ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
                } ${s.number < step ? 'group-hover:bg-indigo-500' : ''}`}>
                  {s.number}
                </div>
                <span className={`mt-2 text-sm font-medium ${
                  step >= s.number ? 'text-indigo-600' : 'text-gray-500'
                } ${s.number < step ? 'group-hover:text-indigo-500' : ''}`}>
                  {s.label}
                </span>
              </button>
              {index < steps.length - 1 && (
                <div className={`h-1 w-16 mx-4 transition-colors ${
                  step > s.number ? 'bg-indigo-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Customer Selection */}
      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Select Customer</h2>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Search customers by name, email, or phone..."
            />
          </div>

          {/* Add New Customer Button */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setShowNewCustomerForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
            >
              Can't find customer? Create new
            </button>
          </div>

          {/* New Customer Form */}
          {showNewCustomerForm && (
            <div className="mt-6 bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Create New Customer</h3>
                <button
                  onClick={() => setShowNewCustomerForm(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ×
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={newCustomer.first_name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, first_name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={newCustomer.last_name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, last_name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Passport Number
                  </label>
                  <input
                    type="text"
                    value={newCustomer.passport_number}
                    onChange={(e) => setNewCustomer({ ...newCustomer, passport_number: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nationality
                  </label>
                  <input
                    type="text"
                    value={newCustomer.nationality}
                    onChange={(e) => setNewCustomer({ ...newCustomer, nationality: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleCreateCustomer}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Create Customer
                </button>
              </div>
            </div>
          )}

          {customers.length > 0 && (
            <div className="mt-4 space-y-4">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedCustomer?.id === customer.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-lg font-medium text-indigo-600">
                          {customer.first_name[0]}
                          {customer.last_name[0]}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        {customer.first_name} {customer.last_name}
                      </h3>
                      <p className="text-sm text-gray-500">{customer.email}</p>
                      <p className="text-sm text-gray-500">{customer.phone}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Travel Requirements */}
      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Travel Requirements</h2>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Departure Date
              </label>
              <input
                type="date"
                value={travelRequirements.departureDate}
                onChange={(e) => setTravelRequirements({
                  ...travelRequirements,
                  departureDate: e.target.value
                })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Return Date
              </label>
              <input
                type="date"
                value={travelRequirements.returnDate}
                onChange={(e) => setTravelRequirements({
                  ...travelRequirements,
                  returnDate: e.target.value
                })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Origin
              </label>
              <input
                type="text"
                value={travelRequirements.origin}
                onChange={(e) => setTravelRequirements({
                  ...travelRequirements,
                  origin: e.target.value
                })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="e.g., New York, USA"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Destination
              </label>
              <input
                type="text"
                value={travelRequirements.destination}
                onChange={(e) => setTravelRequirements({
                  ...travelRequirements,
                  destination: e.target.value
                })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="e.g., Paris, France"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Trip Type
              </label>
              <select
                value={travelRequirements.tripType}
                onChange={(e) => setTravelRequirements({
                  ...travelRequirements,
                  tripType: e.target.value as any
                })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="flight">Flight Only</option>
                <option value="hotel">Hotel Only</option>
                <option value="flight+hotel">Flight + Hotel</option>
                <option value="tour">Tour Package</option>
                <option value="custom">Custom Package</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Adults
              </label>
              <input
                type="number"
                min="1"
                value={travelRequirements.adults}
                onChange={(e) => setTravelRequirements({
                  ...travelRequirements,
                  adults: parseInt(e.target.value)
                })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Children
              </label>
              <input
                type="number"
                min="0"
                value={travelRequirements.children}
                onChange={(e) => setTravelRequirements({
                  ...travelRequirements,
                  children: parseInt(e.target.value)
                })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Seniors
              </label>
              <input
                type="number"
                min="0"
                value={travelRequirements.seniors}
                onChange={(e) => setTravelRequirements({
                  ...travelRequirements,
                  seniors: parseInt(e.target.value)
                })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Special Requests
            </label>
            <textarea
              value={travelRequirements.specialRequests}
              onChange={(e) => setTravelRequirements({
                ...travelRequirements,
                specialRequests: e.target.value
              })}
              rows={4}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Any special requirements or preferences..."
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <QuoteServices
          onServicesChange={setServices}
          travelDates={{
            start: travelRequirements.departureDate,
            end: travelRequirements.returnDate,
          }}
          travelers={{
            adults: travelRequirements.adults,
            children: travelRequirements.children,
            seniors: travelRequirements.seniors,
          }}
        />
      )}

      {step === 4 && (
        <QuoteReview
          services={services}
          travelers={{
            adults: travelRequirements.adults,
            children: travelRequirements.children,
            seniors: travelRequirements.seniors,
          }}
          onQuoteFinalize={async (quoteData) => {
            if (!selectedCustomer) return;

            const { data: quote } = await supabase
              .from('quotes')
              .insert([{
                customer_id: selectedCustomer.id,
                status: quoteData.status,
                total_price: quoteData.pricing.total,
                origin: travelRequirements.origin,
                destination: travelRequirements.destination,
                markup: quoteData.pricing.markup,
                discount: quoteData.pricing.discount,
                expiry_date: quoteData.expiry_date,
              }])
              .select()
              .single();

            if (quote) {
              // Add quote items
              await supabase
                .from('quote_items')
                .insert(
                  services.map(service => ({
                    quote_id: quote.id,
                    item_type: service.type,
                    item_name: service.name,
                    cost: service.cost,
                    details: service.details,
                  }))
                );

              navigate(`/quotes/${quote.id}`);
            }
          }}
        />
      )}

      <div className="mt-6 flex justify-between">
        {step > 1 && (
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </button>
        )}
        
        {step < 4 && (
          <button
            onClick={handleNext}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 ml-auto"
          >
            Next
            <ArrowRight className="h-5 w-5 ml-2" />
          </button>
        )}
      </div>
    </div>
  );
}