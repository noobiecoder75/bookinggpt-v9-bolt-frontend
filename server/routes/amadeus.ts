import express from 'express';
import Amadeus from 'amadeus';

const router = express.Router();

const amadeus = new Amadeus({
  clientId: process.env.VITE_AMADEUS_CLIENT_ID,
  clientSecret: process.env.VITE_AMADEUS_CLIENT_SECRET
});

router.post('/search-flights', async (req, res) => {
  try {
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

    res.json(response.data);
  } catch (error) {
    console.error('Amadeus API error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router; 