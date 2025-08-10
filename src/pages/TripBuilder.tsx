import React, { useState } from 'react';
import { Wand2, ArrowLeft, Loader, AlertCircle, Sparkles } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { TripBuilderForm } from '../components/tripBuilder/TripBuilderForm';
import { TripBuilderResults } from '../components/tripBuilder/TripBuilderResults';
import { supabase } from '../lib/supabase';

type ViewState = 'form' | 'loading' | 'results' | 'error';

interface FormData {
  tripDates: {
    checkIn: string;
    checkOut: string;
  };
  destinations: Array<{
    id: string;
    city: string;
    nights: number;
  }>;
  occupancy: {
    rooms: number;
    adults: number;
    children: number;
  };
  budget: {
    total: number;
    perNight: number;
    currency: string;
  };
  hotelPreferences: {
    minStars: number;
    maxStars: number;
    boardType: string;
  };
  activityPreferences: string[];
  travelPace: string;
  specialRequests: string;
}

export function TripBuilder() {
  const [currentView, setCurrentView] = useState<ViewState>('form');
  const [formData, setFormData] = useState<FormData | null>(null);
  const [itinerary, setItinerary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<string>('Initializing...');

  const simulateProgress = () => {
    const steps = [
      'Analyzing your preferences...',
      'Planning daily activities...',
      'Calculating optimal schedules...',
      'Finding best accommodations...',
      'Generating personalized itinerary...',
      'Finalizing recommendations...'
    ];

    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex < steps.length) {
        setGenerationProgress(steps[stepIndex]);
        stepIndex++;
      } else {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  };

  const handleFormSubmit = async (data: FormData) => {
    setFormData(data);
    setCurrentView('loading');
    setError(null);
    
    // Start progress simulation
    const clearProgress = simulateProgress();

    try {
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Please log in to generate an itinerary');
      }

      console.log('Submitting to trip builder API:', data);
      
      const response = await fetch('/api/trip-builder/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ formData: data })
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to generate itinerary');
      }

      console.log('Generated itinerary:', responseData);
      
      setItinerary(responseData);
      setCurrentView('results');
    } catch (err: any) {
      console.error('Error generating itinerary:', err);
      setError(err.message || 'An unexpected error occurred');
      setCurrentView('error');
    } finally {
      clearProgress();
    }
  };

  const handleBackToForm = () => {
    setCurrentView('form');
    setError(null);
  };

  const handleRetry = () => {
    if (formData) {
      handleFormSubmit(formData);
    } else {
      setCurrentView('form');
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'form':
        return (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl mb-4">
                <Wand2 className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">AI Trip Builder</h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Tell us about your dream trip and let our AI create a personalized day-by-day itinerary just for you.
              </p>
            </div>
            <TripBuilderForm onSubmit={handleFormSubmit} />
          </div>
        );

      case 'loading':
        return (
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full mb-6">
                <Sparkles className="h-10 w-10 text-blue-600 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Creating Your Perfect Itinerary</h2>
              <p className="text-gray-600 mb-8">
                Our AI is crafting a personalized trip based on your preferences...
              </p>
              
              <div className="flex items-center justify-center space-x-2 mb-6">
                <Loader className="h-5 w-5 text-blue-600 animate-spin" />
                <span className="text-blue-600 font-medium">{generationProgress}</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
              
              <p className="text-sm text-gray-500 mt-4">
                This usually takes 30-60 seconds
              </p>
            </div>
          </div>
        );

      case 'results':
        return (
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Your AI-Generated Itinerary</h1>
                <p className="text-gray-600 mt-1">
                  {formData?.destinations.map(d => d.city).join(', ')} • {formData?.destinations.reduce((sum, d) => sum + d.nights, 0)} days
                </p>
              </div>
              <button
                onClick={handleBackToForm}
                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Form
              </button>
            </div>
            {itinerary && formData && (
              <TripBuilderResults 
                itinerary={itinerary} 
                formData={formData}
                onEdit={handleBackToForm}
              />
            )}
          </div>
        );

      case 'error':
        return (
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Oops! Something went wrong</h2>
              <p className="text-gray-600 mb-8">
                {error || 'We encountered an issue while generating your itinerary.'}
              </p>
              
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleRetry}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Try Again
                </button>
                <button
                  onClick={handleBackToForm}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Edit Form
                </button>
              </div>
              
              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Common issues:</p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• Make sure you're logged in</li>
                  <li>• Check your internet connection</li>
                  <li>• Try reducing the trip complexity</li>
                </ul>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-sky-100">
        <div className="pt-20 pb-12 px-6">
          {renderContent()}
        </div>
      </div>
    </>
  );
}