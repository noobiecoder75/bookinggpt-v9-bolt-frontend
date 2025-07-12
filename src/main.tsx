import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initializeProviders } from './lib/providers/providerRegistry';
import './index.css';

// Debug logging for app initialization
console.log('🚀 BookingGPT Application Starting...');
console.log('🔧 Environment:', {
  development: import.meta.env.DEV,
  mode: import.meta.env.MODE,
  baseUrl: import.meta.env.BASE_URL,
  timestamp: new Date().toISOString()
});

// Initialize travel API providers
console.log('🔌 Initializing travel API providers...');
initializeProviders();

// Check if root element exists
const rootElement = document.getElementById('root');
console.log('🎯 Root element found:', !!rootElement);

if (!rootElement) {
  console.error('🚨 CRITICAL: Root element #root not found in DOM!');
  document.body.innerHTML = `
    <div style="
      display: flex; 
      align-items: center; 
      justify-content: center; 
      height: 100vh; 
      font-family: system-ui, sans-serif;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    ">
      <div style="
        text-align: center; 
        padding: 2rem; 
        background: white; 
        border-radius: 1rem; 
        box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        max-width: 400px;
      ">
        <h1 style="color: #e53e3e; margin-bottom: 1rem;">App Failed to Load</h1>
        <p style="color: #4a5568; margin-bottom: 1rem;">Root element not found in DOM</p>
        <p style="color: #718096; font-size: 0.875rem;">Please check the console for more details</p>
      </div>
    </div>
  `;
  throw new Error('Root element #root not found');
}

try {
  // Create React root and render app with error boundary
  console.log('⚛️ Creating React root...');
  const root = createRoot(rootElement);
  
  console.log('🎨 Rendering React app with ErrorBoundary...');
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
  
  console.log('✅ React app rendered successfully!');
} catch (error) {
  console.error('🚨 CRITICAL ERROR during React app initialization:', error);
  
  // Fallback error display
  rootElement.innerHTML = `
    <div style="
      display: flex; 
      align-items: center; 
      justify-content: center; 
      height: 100vh; 
      font-family: system-ui, sans-serif;
      background: linear-gradient(135deg, #fed7d7 0%, #feb2b2 100%);
    ">
      <div style="
        text-align: center; 
        padding: 2rem; 
        background: white; 
        border-radius: 1rem; 
        box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        max-width: 500px;
      ">
        <h1 style="color: #e53e3e; margin-bottom: 1rem;">React App Failed to Initialize</h1>
        <p style="color: #4a5568; margin-bottom: 1rem;">Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
        <details style="text-align: left; margin-top: 1rem;">
          <summary style="cursor: pointer; color: #3182ce;">Show Technical Details</summary>
          <pre style="
            background: #f7fafc; 
            padding: 1rem; 
            border-radius: 0.5rem; 
            margin-top: 0.5rem; 
            overflow: auto; 
            font-size: 0.75rem;
            color: #2d3748;
          ">${error instanceof Error ? error.stack : JSON.stringify(error, null, 2)}</pre>
        </details>
        <button onclick="window.location.reload()" style="
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background: #3182ce;
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
        ">Reload Page</button>
      </div>
    </div>
  `;
}
