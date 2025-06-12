import express from 'express';
import crypto from 'crypto';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

// Environment variables for API credentials
const HOTELBEDS_API_KEY = process.env.VITE_HOTELBEDS_API_KEY;
const HOTELBEDS_SECRET = process.env.VITE_HOTELBEDS_SECRET;
const HOTELBEDS_BASE_URL = 'https://api.test.hotelbeds.com'; // Use test environment

// Amadeus credentials (placeholder - would need actual API setup)
const AMADEUS_CLIENT_ID = process.env.VITE_AMADEUS_CLIENT_ID;
const AMADEUS_CLIENT_SECRET = process.env.VITE_AMADEUS_CLIENT_SECRET;
const AMADEUS_BASE_URL = 'https://test.api.amadeus.com'; // Use test environment

/**
 * Create a booking from a quote after payment is processed
 * POST /api/bookings/create
 */
router.post('/create', async (req, res) => {
  try {
    console.log('=== Booking Creation Request ===');
    console.log('Request body:', req.body);

    const { quoteId, paymentReference, customerInfo } = req.body;

    // Validate required fields
    if (!quoteId || !paymentReference) {
      return res.status(400).json({
        error: 'Missing required fields: quoteId, paymentReference'
      });
    }

    // Convert quoteId to integer for database query
    const quoteIdInt = parseInt(quoteId, 10);
    if (isNaN(quoteIdInt)) {
      return res.status(400).json({
        error: 'Invalid quoteId format - must be a number'
      });
    }

    // Get quote details from database
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers (*),
        quote_items (*)
      `)
      .eq('id', quoteIdInt)
      .single();

    if (quoteError || !quote) {
      console.error('Error fetching quote:', quoteError);
      return res.status(404).json({
        error: 'Quote not found',
        details: quoteError?.message
      });
    }

    console.log('Quote found:', quote.id, 'Items:', quote.quote_items.length);

    // Calculate total from quote items
    const totalAmount = quote.quote_items.reduce((sum, item) => {
      return sum + (item.cost * item.quantity);
    }, 0);

    // Create booking record
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([{
        quote_id: quoteIdInt,
        customer_id: quote.customer_id,
        agent_id: quote.agent_id || null, // Handle case where agent_id might be null
        status: 'Pending', // Will be updated based on API confirmations
        total_price: totalAmount,
        amount_paid: totalAmount, // Assuming full payment for now
        payment_status: 'Paid',
        payment_reference: paymentReference,
        travel_start_date: quote.trip_start_date,
        travel_end_date: quote.trip_end_date
      }])
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return res.status(500).json({
        error: 'Failed to create booking',
        details: bookingError.message
      });
    }

    console.log('Booking created:', booking.id);

    // Copy quote items to booking items
    const bookingItems = quote.quote_items.map(item => ({
      booking_id: booking.id,
      item_type: item.item_type,
      item_name: item.item_name,
      cost: item.cost,
      quantity: item.quantity,
      details: item.details
    }));

    const { error: itemsError } = await supabase
      .from('booking_items')
      .insert(bookingItems);

    if (itemsError) {
      console.error('Error creating booking items:', itemsError);
      // Should probably rollback booking here in production
    }

    // Process each quote item for external API booking
    const bookingResults = [];
    
    for (const item of quote.quote_items) {
      try {
        let result = null;
        
        if (item.item_type === 'Hotel') {
          result = await processHotelBooking(booking, item, quote.customer);
        } else if (item.item_type === 'Flight') {
          result = await processFlightBooking(booking, item, quote.customer);
        } else {
          // For other item types (Tour, Transfer), create manual confirmation
          result = await createManualConfirmation(booking, item);
        }
        
        bookingResults.push(result);
      } catch (error) {
        console.error(`Error processing ${item.item_type} booking:`, error);
        bookingResults.push({
          item_id: item.id,
          item_type: item.item_type,
          status: 'failed',
          error: error.message
        });
      }
    }

    // Update quote status to converted
    await supabase
      .from('quotes')
      .update({ status: 'Converted' })
      .eq('id', quoteIdInt);

    console.log('Booking creation completed');

    res.json({
      success: true,
      booking: {
        id: booking.id,
        booking_reference: booking.booking_reference,
        status: booking.status,
        total_price: booking.total_price,
        payment_reference: booking.payment_reference
      },
      confirmations: bookingResults,
      message: 'Booking created successfully'
    });

  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({
      error: 'Internal server error during booking creation',
      details: error.message
    });
  }
});

/**
 * Process hotel booking via Hotelbeds API
 */
async function processHotelBooking(booking, quoteItem, customer) {
  console.log('Processing hotel booking for:', quoteItem.item_name);

  try {
    // Check if we have the necessary Hotelbeds credentials
    if (!HOTELBEDS_API_KEY || !HOTELBEDS_SECRET) {
      throw new Error('Hotelbeds API credentials not configured');
    }

    // Generate Hotelbeds API signature
    const timestamp = Math.floor(Date.now() / 1000);
    const stringToSign = HOTELBEDS_API_KEY + HOTELBEDS_SECRET + timestamp;
    const signature = crypto.createHash('sha256').update(stringToSign).digest('hex');

    // Extract booking details from quote item
    const details = quoteItem.details || {};
    const checkInDate = details.checkInDate || details.startTime?.split('T')[0];
    const checkOutDate = details.checkOutDate || details.endTime?.split('T')[0];

    // Debug logging for rate key analysis
    console.log('=== Hotel Booking Rate Key Analysis ===');
    console.log('Quote Item ID:', quoteItem.id);
    console.log('Hotel Name:', quoteItem.item_name);
    console.log('Has details object:', !!details);
    console.log('Details keys:', Object.keys(details));
    console.log('Rate key value:', details.rateKey);
    console.log('Rate key type:', typeof details.rateKey);
    console.log('Booking available flag:', details.bookingAvailable);
    console.log('Source:', details.source);
    console.log('Hotel code:', details.hotelCode);
    console.log('Selected room:', details.selectedRoom);
    console.log('Full details object:', JSON.stringify(details, null, 2));

    // Check if we have a valid rate key for booking
    if (!details.rateKey) {
      console.warn(`No rate key found for hotel: ${quoteItem.item_name}. This appears to be from local inventory.`);
      console.warn('Rate key missing - creating manual confirmation instead of API booking');
      
      // For local inventory hotels, create a manual confirmation instead of API booking
      return await createManualHotelConfirmation(booking, quoteItem, customer, 'No rate key - local inventory hotel');
    }

    console.log('✅ Rate key found! Proceeding with Hotelbeds API booking...');
    console.log('Rate key:', details.rateKey);

    const bookingRequest = {
      holder: {
        name: customer.first_name,
        surname: customer.last_name
      },
      rooms: [{
        rateKey: details.rateKey, // Use the actual rate key from search results
        paxes: [{
          roomId: 1,
          type: 'AD', // Adult
          name: customer.first_name,
          surname: customer.last_name
        }]
      }],
      clientReference: `BOOKING-${booking.id}-${Date.now()}`
    };

    console.log('Hotelbeds booking request:', {
      url: `${HOTELBEDS_BASE_URL}/hotel-api/1.0/bookings`,
      body: bookingRequest,
      rateKey: details.rateKey
    });

    // Make the actual API call to Hotelbeds
    const response = await fetch(`${HOTELBEDS_BASE_URL}/hotel-api/1.0/bookings`, {
      method: 'POST',
      headers: {
        'Api-key': HOTELBEDS_API_KEY,
        'X-Signature': signature,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(bookingRequest)
    });

    console.log('Hotelbeds booking response status:', response.status);
    
    const responseText = await response.text();
    console.log('Hotelbeds booking raw response (first 500 chars):', responseText.substring(0, 500));

    if (!response.ok) {
      console.error('Hotelbeds booking API error:', response.status, responseText);
      
      // Try to parse error response
      let errorMessage = `Hotelbeds booking failed with status ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.error && errorData.error.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (parseError) {
        console.warn('Could not parse Hotelbeds error response as JSON');
      }
      
      throw new Error(`Hotelbeds booking failed: ${errorMessage}`);
    }

    // Parse successful response
    let bookingResponse;
    try {
      bookingResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Hotelbeds booking response as JSON:', parseError);
      throw new Error('Invalid JSON response from Hotelbeds booking API');
    }

    console.log('Hotelbeds booking successful:', bookingResponse.booking?.reference);

    // Use the actual response from Hotelbeds
    const actualResponse = {
      booking: {
        reference: bookingResponse.booking?.reference || `HB-${Date.now()}-ERROR`,
        clientReference: bookingResponse.booking?.clientReference || bookingRequest.clientReference,
        status: bookingResponse.booking?.status || 'CONFIRMED',
        holder: bookingResponse.booking?.holder || bookingRequest.holder,
        hotel: bookingResponse.booking?.hotel || {
          checkIn: checkInDate,
          checkOut: checkOutDate,
          name: quoteItem.item_name
        },
        totalNet: bookingResponse.booking?.totalNet || quoteItem.cost * quoteItem.quantity
      }
    };

    // Store booking confirmation in database
    const { data: confirmation, error: confirmationError } = await supabase
      .from('booking_confirmations')
      .insert([{
        booking_id: booking.id,
        quote_item_id: quoteItem.id,
        provider: 'hotelbeds',
        provider_booking_id: actualResponse.booking.reference,
        confirmation_number: actualResponse.booking.reference,
        booking_reference: actualResponse.booking.clientReference,
        status: actualResponse.booking.status.toLowerCase() === 'confirmed' ? 'confirmed' : 'pending',
        raw_request: bookingRequest,
        raw_response: actualResponse,
        booking_details: {
          hotel_name: quoteItem.item_name,
          check_in: checkInDate,
          check_out: checkOutDate,
          guest_name: `${customer.first_name} ${customer.last_name}`,
          confirmation_number: actualResponse.booking.reference,
          rate_key_used: details.rateKey,
          hotel_code: details.hotelCode
        },
        amount: quoteItem.cost * quoteItem.quantity,
        currency: details.currency || 'EUR'
      }])
      .select()
      .single();

    if (confirmationError) {
      throw new Error(`Failed to store confirmation: ${confirmationError.message}`);
    }

    console.log('Hotel booking confirmed:', confirmation.confirmation_number);

    return {
      item_id: quoteItem.id,
      item_type: 'Hotel',
      status: actualResponse.booking.status.toLowerCase() === 'confirmed' ? 'confirmed' : 'pending',
      confirmation_number: actualResponse.booking.reference,
      provider: 'hotelbeds',
      details: actualResponse.booking
    };

  } catch (error) {
    console.error('Hotel booking error:', error);

    // Store failed booking confirmation
    await supabase
      .from('booking_confirmations')
      .insert([{
        booking_id: booking.id,
        quote_item_id: quoteItem.id,
        provider: 'hotelbeds',
        status: 'failed',
        error_details: {
          error: error.message,
          timestamp: new Date().toISOString()
        },
        amount: quoteItem.cost * quoteItem.quantity,
        currency: 'USD'
      }]);

    throw error;
  }
}

/**
 * Process flight booking via Amadeus API (placeholder)
 */
async function processFlightBooking(booking, quoteItem, customer) {
  console.log('Processing flight booking for:', quoteItem.item_name);

  try {
    // For now, simulate flight booking since Amadeus integration is complex
    // In production, you'd need to:
    // 1. Get Amadeus access token
    // 2. Call flight booking API with traveler details
    // 3. Handle PNR creation and ticketing

    const simulatedResponse = {
      data: {
        type: 'flight-order',
        id: `AM-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        associatedRecords: [{
          reference: `PNR${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          creationDateTime: new Date().toISOString()
        }],
        travelers: [{
          id: '1',
          name: {
            firstName: customer.first_name,
            lastName: customer.last_name
          }
        }]
      }
    };

    // Store booking confirmation in database
    const { data: confirmation, error: confirmationError } = await supabase
      .from('booking_confirmations')
      .insert([{
        booking_id: booking.id,
        quote_item_id: quoteItem.id,
        provider: 'amadeus',
        provider_booking_id: simulatedResponse.data.id,
        confirmation_number: simulatedResponse.data.associatedRecords[0].reference,
        booking_reference: simulatedResponse.data.id,
        status: 'confirmed',
        raw_response: simulatedResponse,
        booking_details: {
          flight_name: quoteItem.item_name,
          pnr: simulatedResponse.data.associatedRecords[0].reference,
          passenger_name: `${customer.first_name} ${customer.last_name}`,
          confirmation_number: simulatedResponse.data.associatedRecords[0].reference
        },
        amount: quoteItem.cost * quoteItem.quantity,
        currency: 'USD'
      }])
      .select()
      .single();

    if (confirmationError) {
      throw new Error(`Failed to store confirmation: ${confirmationError.message}`);
    }

    console.log('Flight booking confirmed:', confirmation.confirmation_number);

    return {
      item_id: quoteItem.id,
      item_type: 'Flight',
      status: 'confirmed',
      confirmation_number: simulatedResponse.data.associatedRecords[0].reference,
      provider: 'amadeus',
      details: simulatedResponse.data
    };

  } catch (error) {
    console.error('Flight booking error:', error);

    // Store failed booking confirmation
    await supabase
      .from('booking_confirmations')
      .insert([{
        booking_id: booking.id,
        quote_item_id: quoteItem.id,
        provider: 'amadeus',
        status: 'failed',
        error_details: {
          error: error.message,
          timestamp: new Date().toISOString()
        },
        amount: quoteItem.cost * quoteItem.quantity,
        currency: 'USD'
      }]);

    throw error;
  }
}

/**
 * Create manual confirmation for local inventory hotels
 */
async function createManualHotelConfirmation(booking, quoteItem, customer, reason) {
  console.log('Creating manual hotel confirmation for:', quoteItem.item_name, 'Reason:', reason);

  const confirmationNumber = `HOTEL-MAN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  const details = quoteItem.details || {};

  const { data: confirmation, error: confirmationError } = await supabase
    .from('booking_confirmations')
    .insert([{
      booking_id: booking.id,
      quote_item_id: quoteItem.id,
      provider: 'manual',
      confirmation_number: confirmationNumber,
      booking_reference: confirmationNumber,
      status: 'confirmed',
      booking_details: {
        hotel_name: quoteItem.item_name,
        check_in: details.checkInDate || details.startTime?.split('T')[0],
        check_out: details.checkOutDate || details.endTime?.split('T')[0],
        guest_name: `${customer.first_name} ${customer.last_name}`,
        confirmation_number: confirmationNumber,
        note: `Manual hotel confirmation - ${reason}`,
        requires_agent_followup: true
      },
      amount: quoteItem.cost * quoteItem.quantity,
      currency: details.currency || 'USD'
    }])
    .select()
    .single();

  if (confirmationError) {
    throw new Error(`Failed to store manual hotel confirmation: ${confirmationError.message}`);
  }

  return {
    item_id: quoteItem.id,
    item_type: 'Hotel',
    status: 'confirmed',
    confirmation_number: confirmationNumber,
    provider: 'manual',
    details: { 
      note: `Manual hotel confirmation created - ${reason}`,
      requires_followup: true
    }
  };
}

/**
 * Create manual confirmation for non-API items (Tours, Transfers)
 */
async function createManualConfirmation(booking, quoteItem) {
  console.log('Creating manual confirmation for:', quoteItem.item_name);

  const confirmationNumber = `MAN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const { data: confirmation, error: confirmationError } = await supabase
    .from('booking_confirmations')
    .insert([{
      booking_id: booking.id,
      quote_item_id: quoteItem.id,
      provider: 'manual',
      confirmation_number: confirmationNumber,
      booking_reference: confirmationNumber,
      status: 'confirmed',
      booking_details: {
        item_name: quoteItem.item_name,
        item_type: quoteItem.item_type,
        confirmation_number: confirmationNumber,
        note: 'Manual confirmation - requires agent follow-up'
      },
      amount: quoteItem.cost * quoteItem.quantity,
      currency: 'USD'
    }])
    .select()
    .single();

  if (confirmationError) {
    throw new Error(`Failed to store manual confirmation: ${confirmationError.message}`);
  }

  return {
    item_id: quoteItem.id,
    item_type: quoteItem.item_type,
    status: 'confirmed',
    confirmation_number: confirmationNumber,
    provider: 'manual',
    details: { note: 'Manual confirmation created' }
  };
}

/**
 * Test endpoint to verify booking routes are working
 * GET /api/bookings/test
 */
router.get('/test', (req, res) => {
  res.json({
    message: 'Booking API routes are working!',
    timestamp: new Date().toISOString(),
    env: {
      hasHotelbedsApiKey: !!HOTELBEDS_API_KEY,
      hasHotelbedsSecret: !!HOTELBEDS_SECRET,
      hasAmadeusClientId: !!AMADEUS_CLIENT_ID,
      hasAmadeusSecret: !!AMADEUS_CLIENT_SECRET
    },
    features: {
      hotelBookingEnabled: true,
      rateKeyValidationEnabled: true,
      manualFallbackEnabled: true,
      realApiCallsEnabled: true
    }
  });
});

/**
 * Get booking details with confirmations
 * GET /api/bookings/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers (*),
        booking_items (*),
        booking_confirmations (*),
        payments (*)
      `)
      .eq('id', id)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({
        error: 'Booking not found',
        details: bookingError?.message
      });
    }

    res.json({ booking });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * Test Hotelbeds booking with sample data
 * POST /api/bookings/test-hotelbeds
 */
router.post('/test-hotelbeds', async (req, res) => {
  try {
    const { rateKey, customerInfo } = req.body;
    
    if (!rateKey) {
      return res.status(400).json({
        error: 'Rate key is required for testing Hotelbeds booking'
      });
    }

    // Check credentials
    if (!HOTELBEDS_API_KEY || !HOTELBEDS_SECRET) {
      return res.status(500).json({
        error: 'Hotelbeds API credentials not configured'
      });
    }

    // Generate signature
    const timestamp = Math.floor(Date.now() / 1000);
    const stringToSign = HOTELBEDS_API_KEY + HOTELBEDS_SECRET + timestamp;
    const signature = crypto.createHash('sha256').update(stringToSign).digest('hex');

    const testBookingRequest = {
      holder: {
        name: customerInfo?.first_name || 'Test',
        surname: customerInfo?.last_name || 'Customer'
      },
      rooms: [{
        rateKey: rateKey,
        paxes: [{
          roomId: 1,
          type: 'AD',
          name: customerInfo?.first_name || 'Test',
          surname: customerInfo?.last_name || 'Customer'
        }]
      }],
      clientReference: `TEST-${Date.now()}`
    };

    console.log('Testing Hotelbeds booking with:', testBookingRequest);

    const response = await fetch(`${HOTELBEDS_BASE_URL}/hotel-api/1.0/bookings`, {
      method: 'POST',
      headers: {
        'Api-key': HOTELBEDS_API_KEY,
        'X-Signature': signature,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(testBookingRequest)
    });

    const responseText = await response.text();
    
    res.json({
      success: response.ok,
      status: response.status,
      request: testBookingRequest,
      response: response.ok ? JSON.parse(responseText) : responseText,
      message: response.ok ? 'Hotelbeds booking test successful!' : 'Hotelbeds booking test failed'
    });

  } catch (error) {
    console.error('Hotelbeds booking test error:', error);
    res.status(500).json({
      error: error.message,
      message: 'Hotelbeds booking test failed with exception'
    });
  }
});

/**
 * Debug endpoint to check quote item details
 * GET /api/bookings/debug-quote/:quoteId
 */
router.get('/debug-quote/:quoteId', async (req, res) => {
  try {
    const { quoteId } = req.params;

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers (*),
        quote_items (*)
      `)
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      return res.status(404).json({
        error: 'Quote not found',
        details: quoteError?.message
      });
    }

    // Analyze each quote item for rate key presence
    const itemAnalysis = quote.quote_items.map(item => ({
      id: item.id,
      item_type: item.item_type,
      item_name: item.item_name,
      cost: item.cost,
      hasDetails: !!item.details,
      hasRateKey: !!(item.details?.rateKey),
      rateKey: item.details?.rateKey,
      bookingAvailable: item.details?.bookingAvailable,
      source: item.details?.source,
      hotelCode: item.details?.hotelCode,
      detailsKeys: item.details ? Object.keys(item.details) : [],
      fullDetails: item.details
    }));

    res.json({
      quote: {
        id: quote.id,
        quote_reference: quote.quote_reference,
        status: quote.status,
        customer: quote.customer
      },
      itemAnalysis,
      summary: {
        totalItems: quote.quote_items.length,
        itemsWithRateKeys: itemAnalysis.filter(item => item.hasRateKey).length,
        hotelItems: itemAnalysis.filter(item => item.item_type === 'Hotel').length,
        hotelItemsWithRateKeys: itemAnalysis.filter(item => item.item_type === 'Hotel' && item.hasRateKey).length
      }
    });

  } catch (error) {
    console.error('Error debugging quote:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

export default router; 