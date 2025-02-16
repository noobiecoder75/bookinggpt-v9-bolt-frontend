import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, Plus, Edit2, Trash2 } from 'lucide-react';

interface Rate {
  id: number;
  rate_type: string;
  description: string;
  cost: number;
  currency: string;
  valid_start: string;
  valid_end: string;
}

export function RateSettings() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchRates();
  }, []);

  async function fetchRates() {
    const { data } = await supabase
      .from('rates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setRates(data);
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    // Here you would implement the file parsing logic
    setIsUploading(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-900">Rate Management</h2>
        <div className="flex space-x-4">
          <label className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
            <Upload className="h-5 w-5 mr-2" />
            Upload Rates
            <input
              type="file"
              className="hidden"
              accept=".csv,.xlsx"
              onChange={handleFileUpload}
            />
          </label>
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-5 w-5 mr-2" />
            Add Rate
          </button>
        </div>
      </div>

      {/* Rate List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {rates.map((rate) => (
            <li key={rate.id}>
              <div className="px-4 py-4 flex items-center sm:px-6">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-indigo-600 truncate">
                      {rate.description}
                    </p>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {rate.rate_type}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        {rate.currency} {rate.cost}
                      </p>
                      <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                        Valid: {new Date(rate.valid_start).toLocaleDateString()} - {new Date(rate.valid_end).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button className="text-gray-400 hover:text-gray-500">
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button className="text-gray-400 hover:text-red-500">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}