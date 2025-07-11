import React, { useState } from 'react';
import { 
  Upload, 
  Download, 
  FileText, 
  Check, 
  AlertCircle, 
  Clock,
  Trash2,
  Eye,
  Plane,
  MapPin,
  Calendar,
  Shield
} from 'lucide-react';

interface Quote {
  id: string;
  customer: {
    first_name: string;
    last_name: string;
  };
}

interface ClientDocumentsProps {
  quote: Quote;
}

interface Document {
  id: string;
  name: string;
  type: 'upload' | 'download';
  category: 'required' | 'optional' | 'provided';
  status: 'pending' | 'uploaded' | 'verified' | 'rejected';
  file?: File;
  url?: string;
  description: string;
  icon: React.ReactNode;
}

export function ClientDocuments({ quote }: ClientDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([
    // Required Documents (Customer uploads)
    {
      id: 'passport',
      name: 'Passport',
      type: 'upload',
      category: 'required',
      status: 'pending',
      description: 'Valid passport with at least 6 months remaining',
      icon: <FileText className="w-5 h-5" />
    },
    {
      id: 'visa',
      name: 'Visa (if required)',
      type: 'upload',
      category: 'optional',
      status: 'pending',
      description: 'Travel visa for destination country',
      icon: <FileText className="w-5 h-5" />
    },
    {
      id: 'id',
      name: 'Photo ID',
      type: 'upload',
      category: 'required',
      status: 'pending',
      description: 'Government-issued photo identification',
      icon: <FileText className="w-5 h-5" />
    },
    
    // Provided Documents (Agent provides)
    {
      id: 'flight-tickets',
      name: 'Flight Tickets',
      type: 'download',
      category: 'provided',
      status: 'pending',
      description: 'E-tickets for all flights',
      icon: <Plane className="w-5 h-5" />
    },
    {
      id: 'hotel-confirmations',
      name: 'Hotel Confirmations',
      type: 'download',
      category: 'provided',
      status: 'pending',
      description: 'Booking confirmations for accommodations',
      icon: <MapPin className="w-5 h-5" />
    },
    {
      id: 'itinerary',
      name: 'Travel Itinerary',
      type: 'download',
      category: 'provided',
      status: 'verified',
      description: 'Complete day-by-day travel schedule',
      icon: <Calendar className="w-5 h-5" />
    }
  ]);

  const [dragOver, setDragOver] = useState<string | null>(null);

  const handleFileUpload = (documentId: string, file: File) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === documentId 
        ? { ...doc, status: 'uploaded', file }
        : doc
    ));
    
    // Simulate verification process
    setTimeout(() => {
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? { ...doc, status: 'verified' }
          : doc
      ));
    }, 2000);
  };

  const handleDragOver = (e: React.DragEvent, documentId: string) => {
    e.preventDefault();
    setDragOver(documentId);
  };

  const handleDragLeave = () => {
    setDragOver(null);
  };

  const handleDrop = (e: React.DragEvent, documentId: string) => {
    e.preventDefault();
    setDragOver(null);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(documentId, files[0]);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'uploaded':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Upload className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'verified':
        return 'Verified';
      case 'uploaded':
        return 'Processing...';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Required';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'uploaded':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'rejected':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const uploadDocuments = documents.filter(doc => doc.type === 'upload');
  const downloadDocuments = documents.filter(doc => doc.type === 'download');

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Upload Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl"></div>
        <div className="relative z-10">
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
            <h2 className="text-xl font-bold text-slate-900">Upload Your Documents</h2>
            <p className="text-slate-600 mt-1">Please upload the required documents to proceed with your booking</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {uploadDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-200 ${
                    dragOver === doc.id
                      ? 'border-blue-400 bg-blue-50'
                      : doc.status === 'verified'
                      ? 'border-green-300 bg-green-50'
                      : doc.status === 'uploaded'
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                  onDragOver={(e) => handleDragOver(e, doc.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, doc.id)}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      doc.status === 'verified' ? 'bg-green-100' :
                      doc.status === 'uploaded' ? 'bg-blue-100' :
                      'bg-gray-100'
                    }`}>
                      {doc.icon}
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">{doc.name}</h3>
                      <p className="text-sm text-slate-600 mb-3">{doc.description}</p>
                      
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(doc.status)}`}>
                        {getStatusIcon(doc.status)}
                        {getStatusText(doc.status)}
                      </div>
                    </div>

                    {doc.status === 'pending' && (
                      <div className="w-full">
                        <input
                          type="file"
                          id={`file-${doc.id}`}
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(doc.id, file);
                          }}
                        />
                        <label
                          htmlFor={`file-${doc.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 cursor-pointer transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                          Choose File
                        </label>
                        <p className="text-xs text-slate-500 mt-2">
                          Or drag and drop here
                        </p>
                      </div>
                    )}

                    {doc.file && doc.status !== 'pending' && (
                      <div className="w-full bg-white rounded-lg p-3 border">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-700 truncate">{doc.file.name}</span>
                          <div className="flex items-center gap-2">
                            <button className="p-1 text-slate-400 hover:text-slate-600">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-1 text-slate-400 hover:text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-200">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-indigo-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-indigo-900">Document Security</h4>
                  <p className="text-xs text-indigo-700 mt-1">
                    All documents are encrypted and stored securely. We only use them to process your booking and comply with travel regulations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Download Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl"></div>
        <div className="relative z-10">
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
            <h2 className="text-xl font-bold text-slate-900">Your Travel Documents</h2>
            <p className="text-slate-600 mt-1">Download your tickets and booking confirmations</p>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {downloadDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-white border border-white/20 rounded-2xl hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      doc.status === 'verified' ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {doc.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{doc.name}</h3>
                      <p className="text-xs text-slate-600">{doc.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(doc.status)}`}>
                      {getStatusIcon(doc.status)}
                      {getStatusText(doc.status)}
                    </div>
                    
                    {doc.status === 'verified' ? (
                      <button className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors">
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    ) : (
                      <button
                        disabled
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-500 text-sm font-medium rounded-xl cursor-not-allowed"
                      >
                        <Clock className="w-4 h-4" />
                        Pending
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {downloadDocuments.filter(doc => doc.status === 'pending').length > 0 && (
              <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-200">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-amber-900">Documents in Progress</h4>
                    <p className="text-xs text-amber-700 mt-1">
                      Your travel documents will be available for download once your payment is processed and bookings are confirmed.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}