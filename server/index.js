import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the parent directory (project root)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import express from 'express';
import cors from 'cors';
import ratesRouter from './routes/rates.js';
import hotelbedsRouter from './routes/hotelbeds.js';
import bookingsRouter from './routes/bookings.js';
import duffelRouter from './routes/duffel.js';
import subscriptionsRouter from './routes/subscriptions.js';
import webhooksRouter from './routes/webhooks.js';
import stripeConnectRouter from './routes/stripeConnect.js';
import reconfirmationService from './services/reconfirmationService.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Debug: Log environment variables to verify they're loaded
console.log('Environment check:');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'Found' : 'Missing');
console.log('VITE_SUPABASE_SERVICE_ROLE_KEY:', process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? 'Found' : 'Missing');
console.log('VITE_OPENAI_API_KEY:', process.env.VITE_OPENAI_API_KEY ? 'Found' : 'Missing');
console.log('VITE_HOTELBEDS_API_KEY:', process.env.VITE_HOTELBEDS_API_KEY ? 'Found' : 'Missing');
console.log('VITE_HOTELBEDS_SECRET:', process.env.VITE_HOTELBEDS_SECRET ? 'Found' : 'Missing');
console.log('DUFFEL_ACCESS_TOKEN:', process.env.DUFFEL_ACCESS_TOKEN ? 'Found' : 'Missing');
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'Found' : 'Missing');
console.log('STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? 'Found' : 'Missing');

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'], // Vite dev server and potential production
  credentials: true
}));

// Special handling for Stripe webhooks (raw body needed)
app.use('/api/webhooks', webhooksRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/rates', ratesRouter);
app.use('/api/hotelbeds', hotelbedsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/duffel', duffelRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/stripe-connect', stripeConnectRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Reconfirmation service status endpoint
app.get('/api/reconfirmation/status', (req, res) => {
  res.json({
    status: 'OK',
    service: reconfirmationService.getStatus()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  
  // Start the reconfirmation service
  reconfirmationService.start();
}); 