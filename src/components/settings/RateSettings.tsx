import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, Plus, Edit2, Trash2, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { RateUploadTest } from './RateUploadTest';

interface Rate {
  id: number;
  rate_type: string;
  description: string;
  cost: number;
  currency: string;
  valid_start: string;
  valid_end: string;
  details?: {
    imported_from?: string;
    imported_at?: string;
    extraction_method?: string;
  };
}

interface UploadStatus {
  isUploading: boolean;
  progress: string;
  success: boolean;
  error: string | null;
  importedCount: number;
}

export function RateSettings() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    isUploading: false,
    progress: '',
    success: false,
    error: null,
    importedCount: 0,
  });

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

  const resetUploadStatus = () => {
    setUploadStatus({
      isUploading: false,
      progress: '',
      success: false,
      error: null,
      importedCount: 0,
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset previous status
    resetUploadStatus();

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadStatus(prev => ({
        ...prev,
        error: 'File size exceeds 5MB limit. Please choose a smaller file.',
      }));
      return;
    }

    // Validate file type
    const allowedTypes = ['.pdf', '.docx', '.xlsx'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      setUploadStatus(prev => ({
        ...prev,
        error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
      }));
      return;
    }

    setUploadStatus(prev => ({
      ...prev,
      isUploading: true,
      progress: 'Uploading file...',
    }));

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('agent_id', 'd7bed82f-accb-4bb1-96da-1d59c8725e5c'); // Default agent ID

      setUploadStatus(prev => ({
        ...prev,
        progress: 'Extracting text from file...',
      }));

      // Upload to API
      const response = await fetch('http://localhost:3001/api/rates/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setUploadStatus(prev => ({
        ...prev,
        isUploading: false,
        success: true,
        progress: '',
        importedCount: result.count,
      }));

      // Refresh the rates list
      await fetchRates();

      // Clear the file input
      event.target.value = '';

    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadStatus(prev => ({
        ...prev,
        isUploading: false,
        error: error.message || 'Failed to process upload',
        progress: '',
      }));
    }
  };

  const handleDeleteRate = async (rateId: number) => {
    if (!confirm('Are you sure you want to delete this rate?')) return;

    try {
      const { error } = await supabase
        .from('rates')
        .delete()
        .eq('id', rateId);

      if (error) throw error;

      // Refresh the rates list
      await fetchRates();
    } catch (error: any) {
      console.error('Delete error:', error);
      alert('Failed to delete rate: ' + error.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-900">Rate Management</h2>
        <div className="flex space-x-4">
          <label className={`inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${
            uploadStatus.isUploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}>
            {uploadStatus.isUploading ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Upload className="h-5 w-5 mr-2" />
            )}
            {uploadStatus.isUploading ? 'Processing...' : 'Upload Rates'}
            <input
              type="file"
              className="hidden"
              accept=".pdf,.docx,.xlsx"
              onChange={handleFileUpload}
              disabled={uploadStatus.isUploading}
            />
          </label>
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-5 w-5 mr-2" />
            Add Rate
          </button>
        </div>
      </div>

      {/* Development Test Component */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-6">
          <RateUploadTest />
        </div>
      )}

      {/* Upload Status Messages */}
      {(uploadStatus.isUploading || uploadStatus.success || uploadStatus.error) && (
        <div className="mb-6">
          {uploadStatus.isUploading && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-center">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin mr-3" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Processing Upload</p>
                  <p className="text-sm text-blue-600">{uploadStatus.progress}</p>
                </div>
              </div>
            </div>
          )}

          {uploadStatus.success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Upload Successful!</p>
                    <p className="text-sm text-green-600">
                      Successfully imported {uploadStatus.importedCount} rate{uploadStatus.importedCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetUploadStatus}
                  className="text-green-400 hover:text-green-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {uploadStatus.error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Upload Failed</p>
                    <p className="text-sm text-red-600">{uploadStatus.error}</p>
                  </div>
                </div>
                <button
                  onClick={resetUploadStatus}
                  className="text-red-400 hover:text-red-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* File Upload Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Upload Instructions</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Supported formats: PDF, Word (.docx), Excel (.xlsx)</li>
          <li>• Maximum file size: 5MB</li>
          <li>• AI will automatically extract rate information from your files</li>
          <li>• Ensure your files contain clear pricing and rate information</li>
        </ul>
      </div>

      {/* Rate List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {rates.length === 0 ? (
            <li className="px-4 py-8 text-center">
              <p className="text-gray-500">No rates found. Upload a file to get started.</p>
            </li>
          ) : (
            rates.map((rate) => (
              <li key={rate.id}>
                <div className="px-4 py-4 flex items-center sm:px-6">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {rate.description}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex items-center space-x-2">
                        <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {rate.rate_type}
                        </p>
                        {rate.details?.imported_from && (
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            AI Imported
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          {rate.currency} {rate.cost.toLocaleString()}
                        </p>
                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                          Valid: {new Date(rate.valid_start).toLocaleDateString()} - {new Date(rate.valid_end).toLocaleDateString()}
                        </p>
                        {rate.details?.imported_from && (
                          <p className="mt-2 flex items-center text-sm text-gray-400 sm:mt-0 sm:ml-6">
                            From: {rate.details.imported_from}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button className="text-gray-400 hover:text-gray-500">
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteRate(rate.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}