import express from 'express';
import crypto from 'crypto';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

// Hotelbeds API configuration
const HOTELBEDS_BASE_URL = 'https://api.test.hotelbeds.com'; // Use test environment

// Generate Hotelbeds API signature according to their specification
// Formula: SHA256(API_KEY + SECRET + TIMESTAMP_IN_SECONDS)
function generateSignature(apiKey, secret, timestamp) {
  const stringToSign = apiKey + secret + timestamp;
  console.log('Signature string (first 50 chars):', stringToSign.substring(0, 50) + '...');
  const signature = crypto.createHash('sha256').update(stringToSign).digest('hex');
  console.log('Generated signature:', signature);
  return signature;
}

// Test endpoint to verify the route is working
router.get('/test', (req, res) => {
  // Read environment variables at runtime, not at module load time
  const HOTELBEDS_API_KEY = process.env.VITE_HOTELBEDS_API_KEY;
  const HOTELBEDS_SECRET = process.env.VITE_HOTELBEDS_SECRET;
  
  res.json({
    message: 'Hotelbeds API route is working!',
    timestamp: new Date().toISOString(),
    env: {
      hasApiKey: !!HOTELBEDS_API_KEY,
      hasSecret: !!HOTELBEDS_SECRET,
      baseUrl: HOTELBEDS_BASE_URL
    }
  });
});

// Search hotels endpoint
router.post('/search', async (req, res) => {
  try {
    console.log('=== Hotelbeds API Search Request ===');
    console.log('Request body:', req.body);
    
    // Read environment variables at runtime, not at module load time
    const HOTELBEDS_API_KEY = process.env.VITE_HOTELBEDS_API_KEY;
    const HOTELBEDS_SECRET = process.env.VITE_HOTELBEDS_SECRET;
    
    // Check if API credentials are available
    if (!HOTELBEDS_API_KEY || !HOTELBEDS_SECRET) {
      console.error('Missing Hotelbeds credentials!');
      console.error('VITE_HOTELBEDS_API_KEY:', HOTELBEDS_API_KEY ? 'Found' : 'Missing');
      console.error('VITE_HOTELBEDS_SECRET:', HOTELBEDS_SECRET ? 'Found' : 'Missing');
      
      return res.status(500).json({
        error: 'Hotelbeds API credentials not configured. Please check your environment variables.',
        source: 'hotelbeds',
        debug: {
          hasApiKey: !!HOTELBEDS_API_KEY,
          hasSecret: !!HOTELBEDS_SECRET
        }
      });
    }

    const {
      destination,
      checkInDate,
      checkOutDate,
      guests,
      hotelName,
      country
    } = req.body;

    // Validate required fields
    if (!destination || !checkInDate || !checkOutDate || !guests) {
      return res.status(400).json({
        error: 'Missing required fields: destination, checkInDate, checkOutDate, guests'
      });
    }

    // Validate dates - check-in must be in the future and after today
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    
    if (checkIn <= today) {
      return res.status(400).json({
        error: 'Check-in date must be in the future (tomorrow or later)',
        source: 'hotelbeds',
        debug: {
          checkInDate,
          today: today.toISOString().split('T')[0],
          message: 'Hotelbeds requires check-in dates to be in the future'
        }
      });
    }
    
    if (checkOut <= checkIn) {
      return res.status(400).json({
        error: 'Check-out date must be after check-in date',
        source: 'hotelbeds'
      });
    }

    // Generate timestamp and signature for Hotelbeds API
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateSignature(HOTELBEDS_API_KEY, HOTELBEDS_SECRET, timestamp);

    console.log('Generated timestamp:', timestamp);
    console.log('Generated signature:', signature);

    // Prepare request headers
    const headers = {
      'Api-key': HOTELBEDS_API_KEY,
      'X-Signature': signature,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Map common destination names to Hotelbeds ATLAS destination codes
    // These are ATLAS codes, not IATA airport codes
    const destinationCodeMap = {
      'madrid': 'MAD',
      'barcelona': 'BCN', 
      'paris': 'PAR',
      'london': 'LON',
      'rome': 'ROM',
      'milan': 'MIL',
      'amsterdam': 'AMS',
      'berlin': 'BER',
      'vienna': 'VIE',
      'zurich': 'ZUR',
      'lisbon': 'LIS',
      'dublin': 'DUB',
      'prague': 'PRG',
      'budapest': 'BUD',
      'warsaw': 'WAR',
      'stockholm': 'STO',
      'copenhagen': 'COP',
      'oslo': 'OSL',
      'helsinki': 'HEL',
      'athens': 'ATH',
      'istanbul': 'IST',
      'moscow': 'MOW',
      'new york': 'NYC',
      'los angeles': 'LAX',
      'chicago': 'CHI',
      'miami': 'MIA',
      'las vegas': 'LAS',
      'san francisco': 'SFO',
      'toronto': 'YTO',
      'vancouver': 'YVR',
      'montreal': 'YMQ',
      'mexico city': 'MEX',
      'cancun': 'CUN',
      'tokyo': 'TYO',
      'osaka': 'OSA',
      'seoul': 'SEL',
      'bangkok': 'BKK',
      'singapore': 'SIN',
      'kuala lumpur': 'KUL',
      'hong kong': 'HKG',
      'shanghai': 'SHA',
      'beijing': 'BJS',
      'sydney': 'SYD',
      'melbourne': 'MEL',
      'perth': 'PER',
      'auckland': 'AKL',
      'dubai': 'DXB',
      'abu dhabi': 'AUH',
      'doha': 'DOH',
      'riyadh': 'RUH',
      'cairo': 'CAI',
      'casablanca': 'CAS',
      'johannesburg': 'JNB',
      'cape town': 'CPT',
      'nairobi': 'NBO',
      'mumbai': 'BOM',
      'delhi': 'DEL',
      'bangalore': 'BLR',
      'sao paulo': 'SAO',
      'rio de janeiro': 'RIO',
      'buenos aires': 'BUE',
      'santiago': 'SCL',
      'lima': 'LIM',
      'bogota': 'BOG'
    };

    // Get destination code - try mapping first, otherwise use as-is but warn
    const destinationCode = destinationCodeMap[destination.toLowerCase()] || destination.toUpperCase();
    
    if (!destinationCodeMap[destination.toLowerCase()]) {
      console.warn(`No destination mapping found for "${destination}", using "${destinationCode}" as-is. This might not work with Hotelbeds API.`);
    }
    
    console.log(`Mapping destination "${destination}" to code "${destinationCode}"`);

    // Prepare hotel search request body according to Hotelbeds API spec
    const searchRequest = {
      stay: {
        checkIn: checkInDate,
        checkOut: checkOutDate
      },
      occupancies: [
        {
          rooms: 1,
          adults: parseInt(guests),
          children: 0
        }
      ],
      destination: {
        code: destinationCode,
        type: "ATLAS"
      }
    };

    // If specific hotel name provided, we could add hotel filter
    // But Hotelbeds expects hotel codes, not names, so we'll search by destination

    console.log('Hotelbeds API Request:', {
      url: `${HOTELBEDS_BASE_URL}/hotel-api/1.0/hotels`,
      headers: { ...headers, 'Api-key': '[HIDDEN]' }, // Hide API key in logs
      body: searchRequest
    });

    // Make request to Hotelbeds API
    const response = await fetch(`${HOTELBEDS_BASE_URL}/hotel-api/1.0/hotels`, {
      method: 'POST',
      headers,
      body: JSON.stringify(searchRequest)
    });

    console.log('Hotelbeds API Response Status:', response.status);
    console.log('Hotelbeds API Response Headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Hotelbeds API Raw Response (first 500 chars):', responseText.substring(0, 500));

    if (!response.ok) {
      console.error('Hotelbeds API Error:', response.status, responseText);
      return res.status(response.status).json({
        error: `Hotelbeds API error: ${response.status} - ${responseText}`,
        source: 'hotelbeds',
        debug: {
          status: response.status,
          responseText: responseText.substring(0, 200)
        }
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Hotelbeds response as JSON:', parseError);
      return res.status(500).json({
        error: 'Invalid JSON response from Hotelbeds API',
        source: 'hotelbeds',
        debug: {
          parseError: parseError.message,
          responseText: responseText.substring(0, 200)
        }
      });
    }
    
    console.log('Hotelbeds API Success - Response structure:', {
      hasHotels: !!data.hotels,
      hotelsCount: data.hotels?.hotels?.length || 0,
      total: data.hotels?.total,
      checkIn: data.hotels?.checkIn,
      checkOut: data.hotels?.checkOut
    });
    
    // Transform Hotelbeds response to match our application format
    // According to the API docs, the structure is data.hotels.hotels[]
    const hotelsArray = data.hotels?.hotels || [];
    
    const transformedHotels = hotelsArray.map(hotel => {
      // Get the minimum rate from the rooms/rates structure and store rate key
      let minRate = 0;
      let currency = 'EUR';
      let selectedRateKey = null;
      let selectedRoom = null;
      
      const allRates = [];
      
      if (hotel.rooms && hotel.rooms.length > 0) {
        
        // Collect all rates with their rate keys
        hotel.rooms.forEach((room, roomIndex) => {
          if (room.rates && room.rates.length > 0) {
            room.rates.forEach((rate, rateIndex) => {
              const rateValue = parseFloat(rate.net || rate.sellingRate || 0);
              console.log(`Hotel ${hotel.name} - Room ${roomIndex} - Rate ${rateIndex}: value=${rateValue}, hasRateKey=${!!rate.rateKey}, rateKey=${rate.rateKey?.substring(0, 50)}...`);
              
              if (!isNaN(rateValue) && rateValue > 0 && rate.rateKey) {
                allRates.push({
                  rate: rateValue,
                  rateKey: rate.rateKey,
                  room: room,
                  rateDetails: rate
                });
              }
            });
          }
        });
        
        // Find the minimum rate and its corresponding rate key
        if (allRates.length > 0) {
          const minRateData = allRates.reduce((min, current) => 
            current.rate < min.rate ? current : min
          );
          
          minRate = minRateData.rate;
          selectedRateKey = minRateData.rateKey;
          selectedRoom = minRateData.room;
          currency = hotel.currency || minRateData.rateDetails.currency || 'EUR';
          
          console.log(`Hotel ${hotel.name} (${hotel.code}): Found ${allRates.length} rates, selected rate ${minRate} with key: ${selectedRateKey}`);
        } else {
          console.warn(`Hotel ${hotel.name} (${hotel.code}): No valid rates with rate keys found`);
        }
      } else if (hotel.minRate) {
        minRate = parseFloat(hotel.minRate);
        currency = hotel.currency || 'EUR';
        // For hotels without detailed room/rate structure, we can't get a rate key
        console.warn(`Hotel ${hotel.name} (${hotel.code}) has minRate but no detailed rates with rateKey`);
      }

      return {
        id: `hotelbeds-${hotel.code}`,
        rate_type: 'Hotel',
        description: hotel.name,
        cost: minRate,
        currency: currency,
        valid_start: checkInDate,
        valid_end: checkOutDate,
        details: {
          imported_from: 'Hotelbeds API',
          extraction_method: 'api',
          chain: hotel.chainCode,
          category: hotel.categoryCode,
          categoryName: hotel.categoryName,
          destination: hotel.destinationCode,
          destinationName: hotel.destinationName,
          coordinates: {
            latitude: hotel.latitude,
            longitude: hotel.longitude
          },
          address: hotel.address,
          phones: hotel.phones,
          images: hotel.images,
          facilities: hotel.facilities,
          source: 'hotelbeds',
          hotelCode: hotel.code,
          zoneCode: hotel.zoneCode,
          zoneName: hotel.zoneName,
          keywords: hotel.keywords,
          reviews: hotel.reviews,
          rooms: hotel.rooms,
          // CRITICAL: Store the rate key for booking
          rateKey: selectedRateKey,
          selectedRoom: selectedRoom,
          bookingAvailable: !!selectedRateKey,
          // Debug info
          rateKeyDebug: {
            totalRatesFound: allRates.length,
            minRateValue: minRate,
            selectedRateKey: selectedRateKey,
            hasValidRateKey: !!selectedRateKey
          }
        }
      };
    });

    res.json({
      success: true,
      hotels: transformedHotels,
      count: transformedHotels.length,
      source: 'hotelbeds'
    });

  } catch (error) {
    console.error('Hotelbeds search error:', error);
    res.status(500).json({
      error: error.message || 'Failed to search hotels',
      source: 'hotelbeds',
      debug: {
        errorMessage: error.message,
        errorStack: error.stack
      }
    });
  }
});

// Get destination codes (helper endpoint)
router.get('/destinations', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        error: 'Query parameter is required'
      });
    }

    // Read environment variables at runtime
    const HOTELBEDS_API_KEY = process.env.VITE_HOTELBEDS_API_KEY;
    const HOTELBEDS_SECRET = process.env.VITE_HOTELBEDS_SECRET;

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateSignature(HOTELBEDS_API_KEY, HOTELBEDS_SECRET, timestamp);

    const headers = {
      'Api-key': HOTELBEDS_API_KEY,
      'X-Signature': signature,
      'Accept': 'application/json'
    };

    const response = await fetch(
      `${HOTELBEDS_BASE_URL}/hotel-content-api/1.0/locations/destinations?fields=code,name,countryCode&language=ENG&from=1&to=100&useSecondaryLanguage=false`,
      {
        method: 'GET',
        headers
      }
    );

    if (!response.ok) {
      throw new Error(`Hotelbeds destinations API error: ${response.status}`);
    }

    const data = await response.json();
    const filteredDestinations = data.destinations?.filter(dest => 
      dest.name.toLowerCase().includes(query.toLowerCase())
    ) || [];

    res.json({
      success: true,
      destinations: filteredDestinations.slice(0, 10), // Limit to 10 results
      source: 'hotelbeds'
    });

  } catch (error) {
    console.error('Hotelbeds destinations error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch destinations',
      source: 'hotelbeds'
    });
  }
});

// Webhook endpoint to receive Hotelbeds reconfirmation numbers
router.post('/reconfirmation-webhook', async (req, res) => {
  try {
    console.log('=== Hotelbeds Reconfirmation Webhook ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request headers:', req.headers);

    const { booking, reconfirmation } = req.body;

    if (!booking || !reconfirmation) {
      console.error('Missing required fields in webhook payload');
      return res.status(400).json({
        error: 'Missing required fields: booking and reconfirmation'
      });
    }

    // Find the booking confirmation by Hotelbeds booking reference
    const { data: confirmations, error: findError } = await supabase
      .from('booking_confirmations')
      .select('*')
      .eq('provider', 'hotelbeds')
      .eq('provider_booking_id', booking.reference);

    if (findError) {
      console.error('Error finding booking confirmation:', findError);
      return res.status(500).json({
        error: 'Database error while finding booking confirmation'
      });
    }

    if (!confirmations || confirmations.length === 0) {
      console.warn(`No booking confirmation found for Hotelbeds reference: ${booking.reference}`);
      return res.status(404).json({
        error: 'Booking confirmation not found',
        reference: booking.reference
      });
    }

    const confirmation = confirmations[0];

    // Update the booking confirmation with hotel reconfirmation details
    const updatedBookingDetails = {
      ...confirmation.booking_details,
      hotel_reconfirmation_number: reconfirmation.confirmationNumber,
      hotel_reconfirmation_received_at: new Date().toISOString(),
      hotel_status: reconfirmation.status,
      hotel_voucher_url: reconfirmation.voucherUrl,
      reconfirmation_details: reconfirmation
    };

    const { error: updateError } = await supabase
      .from('booking_confirmations')
      .update({
        booking_details: updatedBookingDetails,
        confirmed_at: new Date().toISOString(),
        status: reconfirmation.status === 'CONFIRMED' ? 'confirmed' : 'pending'
      })
      .eq('id', confirmation.id);

    if (updateError) {
      console.error('Error updating booking confirmation:', updateError);
      return res.status(500).json({
        error: 'Database error while updating booking confirmation'
      });
    }

    console.log(`Successfully updated booking confirmation ${confirmation.id} with hotel reconfirmation`);

    // Optionally, trigger notifications or other workflows here
    // await notifyCustomerOfReconfirmation(confirmation.booking_id, reconfirmation);

    res.json({
      success: true,
      message: 'Reconfirmation processed successfully',
      confirmationId: confirmation.id,
      hotelReconfirmationNumber: reconfirmation.confirmationNumber
    });

  } catch (error) {
    console.error('Hotelbeds reconfirmation webhook error:', error);
    res.status(500).json({
      error: 'Internal server error processing reconfirmation',
      details: error.message
    });
  }
});

// Get reconfirmation status for a booking
router.get('/reconfirmation/:bookingReference', async (req, res) => {
  try {
    const { bookingReference } = req.params;

    // Check if we have the necessary Hotelbeds credentials
    if (!HOTELBEDS_API_KEY || !HOTELBEDS_SECRET) {
      return res.status(500).json({
        error: 'Hotelbeds API credentials not configured'
      });
    }

    // Generate signature
    const timestamp = Math.floor(Date.now() / 1000);
    const stringToSign = HOTELBEDS_API_KEY + HOTELBEDS_SECRET + timestamp;
    const signature = crypto.createHash('sha256').update(stringToSign).digest('hex');

    console.log(`Fetching reconfirmation for booking: ${bookingReference}`);

    const response = await fetch(`${HOTELBEDS_BASE_URL}/hotel-api/1.0/bookings/${bookingReference}`, {
      method: 'GET',
      headers: {
        'Api-key': HOTELBEDS_API_KEY,
        'X-Signature': signature,
        'Accept': 'application/json'
      }
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('Hotelbeds reconfirmation API error:', response.status, responseText);
      return res.status(response.status).json({
        error: `Hotelbeds API error: ${response.status}`,
        details: responseText
      });
    }

    let bookingData;
    try {
      bookingData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Hotelbeds response as JSON:', parseError);
      return res.status(500).json({
        error: 'Invalid JSON response from Hotelbeds API'
      });
    }

    // Extract reconfirmation information
    const reconfirmationInfo = {
      bookingReference: bookingData.booking?.reference,
      status: bookingData.booking?.status,
      hotelConfirmationNumber: bookingData.booking?.hotel?.confirmationNumber,
      creationDate: bookingData.booking?.creationDate,
      modificationDate: bookingData.booking?.modificationDate,
      hotel: bookingData.booking?.hotel
    };

    res.json({
      success: true,
      reconfirmation: reconfirmationInfo,
      fullResponse: bookingData
    });

  } catch (error) {
    console.error('Reconfirmation fetch error:', error);
    res.status(500).json({
      error: error.message,
      message: 'Failed to fetch reconfirmation status'
    });
  }
});

export default router; 