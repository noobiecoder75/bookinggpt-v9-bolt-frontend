import express from 'express';
import axios from 'axios';
import { authenticateUser } from '../lib/supabase.js';

const router = express.Router();

const DUFFEL_BASE_URL = 'https://api.duffel.com';
const DUFFEL_ACCESS_TOKEN = process.env.DUFFEL_ACCESS_TOKEN;

// Middleware to check if Duffel token is configured
const checkDuffelToken = (req, res, next) => {
  if (!DUFFEL_ACCESS_TOKEN) {
    return res.status(500).json({
      error: 'Duffel API token not configured',
      message: 'Please set DUFFEL_ACCESS_TOKEN environment variable'
    });
  }
  next();
};

// Common headers for Duffel API requests
const getDuffelHeaders = () => ({
  'Authorization': `Bearer ${DUFFEL_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Duffel-Version': 'v2'
});

// POST /api/duffel/offer-requests - Create flight search
router.post('/offer-requests', authenticateUser, checkDuffelToken, async (req, res) => {
  try {
    console.log('Creating Duffel offer request with data:', req.body);
    console.log('Authenticated user:', req.user.id);
    
    const response = await axios.post(
      `${DUFFEL_BASE_URL}/air/offer_requests`,
      req.body,
      { headers: getDuffelHeaders() }
    );

    console.log('Duffel offer request created:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('Error creating Duffel offer request:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to create offer request',
      details: error.response?.data || error.message
    });
  }
});

// GET /api/duffel/offers - Get flight offers
router.get('/offers', authenticateUser, checkDuffelToken, async (req, res) => {
  try {
    const { offer_request_id, ...otherParams } = req.query;
    
    if (!offer_request_id) {
      return res.status(400).json({
        error: 'Missing required parameter: offer_request_id'
      });
    }

    console.log('Fetching Duffel offers for request:', offer_request_id);
    console.log('Authenticated user:', req.user.id);
    
    const response = await axios.get(
      `${DUFFEL_BASE_URL}/air/offers`,
      {
        headers: getDuffelHeaders(),
        params: { offer_request_id, ...otherParams }
      }
    );

    console.log('Duffel offers fetched:', response.data.data?.length || 0, 'offers');
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching Duffel offers:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch offers',
      details: error.response?.data || error.message
    });
  }
});

// POST /api/duffel/orders - Create booking
router.post('/orders', authenticateUser, checkDuffelToken, async (req, res) => {
  try {
    console.log('Creating Duffel order with data:', req.body);
    console.log('Authenticated user:', req.user.id);
    
    const response = await axios.post(
      `${DUFFEL_BASE_URL}/air/orders`,
      req.body,
      { headers: getDuffelHeaders() }
    );

    console.log('Duffel order created:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('Error creating Duffel order:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to create order',
      details: error.response?.data || error.message
    });
  }
});

// GET /api/duffel/orders/:id - Get booking details
router.get('/orders/:id', checkDuffelToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching Duffel order:', id);
    
    const response = await axios.get(
      `${DUFFEL_BASE_URL}/air/orders/${id}`,
      { headers: getDuffelHeaders() }
    );

    console.log('Duffel order fetched:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching Duffel order:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch order',
      details: error.response?.data || error.message
    });
  }
});

// GET /api/duffel/test - Test API connection
router.get('/test', authenticateUser, checkDuffelToken, async (req, res) => {
  try {
    console.log('Testing Duffel API connection...');
    console.log('Authenticated user:', req.user.id);
    
    const response = await axios.get(
      `${DUFFEL_BASE_URL}/air/airlines`,
      {
        headers: getDuffelHeaders(),
        params: { limit: 1 }
      }
    );

    res.json({
      success: true,
      message: 'Duffel API connection successful',
      data: response.data
    });
  } catch (error) {
    console.error('Duffel API connection test failed:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Duffel API connection failed',
      details: error.response?.data || error.message
    });
  }
});

export default router; 