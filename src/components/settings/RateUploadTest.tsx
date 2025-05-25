import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export function RateUploadTest() {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testAPIConnection = async () => {
    setIsLoading(true);
    setTestResult('');

    try {
      // Test if the API endpoint exists
      const response = await fetch('http://localhost:3001/api/rates/test', {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        setTestResult(`✅ API endpoint is accessible: ${data.message}`);
      } else {
        setTestResult(`⚠️ Unexpected response: ${response.status}`);
      }
    } catch (error) {
      setTestResult(`❌ API endpoint not accessible: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const createSampleFile = () => {
    const sampleContent = `HOTEL RATES 2025
Luxury Hotel - Premium Rate: $200 USD per night
Valid from 2025-01-01 to 2025-12-31

FLIGHT RATES
Economy Class Discount: $150 USD base fare
Valid from 2025-04-01 to 2025-09-30`;

    const blob = new Blob([sampleContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-rates.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Rate Upload Testing</h3>
      
      <div className="space-y-4">
        <div>
          <button
            onClick={testAPIConnection}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Test API Connection
          </button>
        </div>

        {testResult && (
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-700">{testResult}</p>
          </div>
        )}

        <div className="border-t pt-4">
          <button
            onClick={createSampleFile}
            className="inline-flex items-center px-4 py-2 border border-indigo-300 shadow-sm text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
          >
            <FileText className="h-4 w-4 mr-2" />
            Download Sample File
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Download a sample rates file to test the upload functionality
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Setup Required</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Make sure you have set up the required environment variables:
              </p>
              <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside">
                <li>OPENAI_API_KEY</li>
                <li>SUPABASE_SERVICE_ROLE_KEY</li>
                <li>NEXT_PUBLIC_SUPABASE_URL</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 