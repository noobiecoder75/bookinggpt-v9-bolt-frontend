import express from 'express';
import Amadeus from 'amadeus';
import { authenticateUser } from '../lib/supabase.js';

const router = express.Router();

const amadeus = new Amadeus({
  clientId: process.env.VITE_AMADEUS_CLIENT_ID,
  clientSecret: process.env.VITE_AMADEUS_CLIENT_SECRET
});

router.post('/search-flights', authenticateUser, async (req, res) => {
  try {
    console.log('Amadeus flight search request by user:', req.user.id);
    
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      adults,
      children,
      seniors
    } = req.body;

    const response = await amadeus.shopping.flightOffersSearch.get({
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate,
      returnDate,
      adults,
      children,
      seniors,
      currencyCode: 'USD',
      max: 10
    });

    console.log('Amadeus flight search completed for user:', req.user.id);
    res.json(response.data);
  } catch (error) {
    console.error('Amadeus API error for user:', req.user.id, error);
    res.status(500).json({ error: error.message });
  }
});

export default router; 