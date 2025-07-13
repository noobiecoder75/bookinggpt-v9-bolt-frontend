import express from 'express';
import crypto from 'crypto';
import { supabase, authenticateUser, verifyQuoteAccess, verifyBookingAccess } from '../lib/supabase.js';

const router = express.Router();

// Environment variables for API credentials
const HOTELBEDS_API_KEY = process.env.VITE_HOTELBEDS_API_KEY;
const HOTELBEDS_SECRET = process.env.VITE_HOTELBEDS_SECRET;
const HOTELBEDS_BASE_URL = 'https://api.test.hotelbeds.com'; // Use test environment

// Duffel API credentials
const DUFFEL_ACCESS_TOKEN = process.env.DUFFEL_ACCESS_TOKEN;
const DUFFEL_BASE_URL = 'https://api.duffel.com'; // Duffel API base URL

/**
 * Create a booking from a quote after payment is processed
 * POST /api/bookings/create
 */
router.post('/create', authenticateUser, async (req, res) => {
  try {
    console.log('=== Booking Creation Request ===');
    console.log('Request body:', req.body);
    console.log('Authenticated user:', req.user.id);

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

    // Verify user has access to this quote
    await verifyQuoteAccess(req.user.id, quoteIdInt);

    // Get quote details from database with agent filtering
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers (*),
        quote_items (*)
      `)
      .eq('id', quoteIdInt)
      .eq('agent_id', req.user.id) // Explicit agent filtering
      .single();

    if (quoteError || !quote) {
      console.error('Error fetching quote:', quoteError);
      return res.status(404).json({
        error: 'Quote not found or access denied',
        details: quoteError?.message
      });
    }

    console.log('Quote found:', quote.id, 'Items:', quote.quote_items.length);

    // Calculate total from quote items
    const totalAmount = quote.quote_items.reduce((sum, item) => {
      return sum + (item.cost * item.quantity);
    }, 0);

    console.log('Total amount calculated:', totalAmount);

    // Create booking record
    const bookingData = {
      booking_reference: `BKG-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      quote_id: quote.id,
      customer_id: quote.customer.id,
      agent_id: req.user.id, // Explicit agent assignment
      status: 'Confirmed',
      total_price: totalAmount,
      amount_paid: 0, // Will be updated when payment is processed
      payment_status: 'Unpaid',
      payment_reference: paymentReference,
      travel_start_date: quote.trip_start_date || new Date().toISOString().split('T')[0],
      travel_end_date: quote.trip_end_date || new Date().toISOString().split('T')[0]
    };

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([bookingData])
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
      clientReference: `BK${booking.id}-${Date.now().toString().slice(-8)}`
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
 * Process flight booking via Duffel API
 */
async function processFlightBooking(booking, quoteItem, customer) {
  console.log('Processing flight booking for:', quoteItem.item_name);

  try {
    // Check if we have the necessary Duffel credentials
    if (!DUFFEL_ACCESS_TOKEN) {
      throw new Error('Duffel API credentials not configured');
    }

    // Extract flight offer details from quote item
    const details = quoteItem.details || {};
    const travelers = details.travelers || { adults: 1, children: 0, seniors: 0 };
    
    // If no complete flight offer is stored, we need to create a simulated booking
    if (!details.id || !details.slices) {
      console.warn('Complete flight offer data not found, creating manual confirmation');
      return await createManualFlightConfirmation(booking, quoteItem, customer, 'Missing complete flight offer data');
    }

    // Prepare passengers data for Duffel API
    const duffelPassengers = [];
    const totalTravelers = travelers.adults + travelers.children + travelers.seniors;
    
    for (let i = 1; i <= totalTravelers; i++) {
      // Determine traveler type
      let passengerType = 'adult';
      if (i <= travelers.adults) {
        passengerType = 'adult';
      } else if (i <= travelers.adults + travelers.children) {
        passengerType = 'child';
      } else {
        passengerType = 'adult'; // Duffel doesn't have separate senior type
      }

      duffelPassengers.push({
        type: passengerType,
        title: 'mr', // Default title
        given_name: customer.first_name || 'TRAVELER',
        family_name: customer.last_name || `${i}`,
        born_on: passengerType === 'child' ? '2015-01-01' : '1985-01-01', // Default dates
        email: customer.email || 'customer@example.com',
        phone_number: customer.phone || '+1234567890',
        gender: 'm', // Default gender
        id: `pas_${i.toString().padStart(8, '0')}` // Generate passenger ID
      });
    }

    // Prepare the flight create order request for Duffel
    const createOrderRequest = {
      data: {
        type: 'instant', // Instant booking
        selected_offers: [details.id], // Use the offer ID from search
        passengers: duffelPassengers,
        payments: [{
          type: 'balance', // Use balance payment for test environment
          currency: details.total_currency || 'USD',
          amount: details.total_amount || (quoteItem.cost * quoteItem.quantity).toFixed(2)
        }]
      }
    };

    console.log('Creating Duffel flight order...');
    console.log('Request payload:', JSON.stringify(createOrderRequest, null, 2));

    // Make the flight create order API call
    const orderResponse = await fetch(`${DUFFEL_BASE_URL}/air/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DUFFEL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'Duffel-Version': 'v2'
      },
      body: JSON.stringify(createOrderRequest)
    });

    const responseText = await orderResponse.text();
    console.log('Duffel order response status:', orderResponse.status);
    console.log('Duffel order response:', responseText.substring(0, 1000));

    if (!orderResponse.ok) {
      let errorMessage = 'Failed to create flight order';
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.errors?.[0]?.message || errorMessage;
        console.error('Duffel order creation error:', errorData);
      } catch (e) {
        console.error('Failed to parse error response');
      }
      throw new Error(`Duffel API Error: ${errorMessage}`);
    }

    const orderData = JSON.parse(responseText);
    console.log('Flight order created successfully:', orderData.data?.id);

    // Extract important booking information
    const flightOrder = orderData.data;
    const bookingReference = flightOrder.booking_reference;
    const confirmationNumber = flightOrder.id;

    // Store booking confirmation in database
    const { data: confirmation, error: confirmationError } = await supabase
      .from('booking_confirmations')
      .insert([{
        booking_id: booking.id,
        quote_item_id: quoteItem.id,
        provider: 'duffel',
        provider_booking_id: flightOrder.id,
        confirmation_number: confirmationNumber,
        booking_reference: bookingReference,
        status: 'confirmed',
        raw_response: orderData,
        booking_details: {
          flight_name: quoteItem.item_name,
          pnr: bookingReference,
          passenger_name: `${customer.first_name} ${customer.last_name}`,
          confirmation_number: confirmationNumber,
          booking_reference: bookingReference,
          flight_number: flightOrder.slices?.[0]?.segments?.[0]?.marketing_carrier?.iata_code + flightOrder.slices?.[0]?.segments?.[0]?.marketing_carrier_flight_number || 'N/A',
          departure: flightOrder.slices?.[0]?.segments?.[0]?.departing_at || null,
          arrival: flightOrder.slices?.[0]?.segments?.[0]?.arriving_at || null
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
      confirmation_number: confirmationNumber,
      provider: 'duffel',
      details: flightOrder
    };

  } catch (error) {
    console.error('Flight booking error:', error);

    // Store failed booking confirmation
    await supabase
      .from('booking_confirmations')
      .insert([{
        booking_id: booking.id,
        quote_item_id: quoteItem.id,
        provider: 'duffel',
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
 * Create manual flight confirmation for cases where API booking fails
 */
async function createManualFlightConfirmation(booking, quoteItem, customer, reason) {
  console.log('Creating manual flight confirmation for:', quoteItem.item_name, 'Reason:', reason);

  const confirmationNumber = `FLIGHT-MAN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
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
        flight_name: quoteItem.item_name,
        passenger_name: `${customer.first_name} ${customer.last_name}`,
        confirmation_number: confirmationNumber,
        note: `Manual flight confirmation - ${reason}`,
        requires_agent_followup: true
      },
      amount: quoteItem.cost * quoteItem.quantity,
      currency: 'USD'
    }])
    .select()
    .single();

  if (confirmationError) {
    throw new Error(`Failed to store manual flight confirmation: ${confirmationError.message}`);
  }

  return {
    item_id: quoteItem.id,
    item_type: 'Flight',
    status: 'confirmed',
    confirmation_number: confirmationNumber,
    provider: 'manual',
    details: { 
      note: `Manual flight confirmation created - ${reason}`,
      requires_followup: true
    }
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
 * Debug endpoint to list all bookings
 * GET /api/bookings/debug-list
 */
router.get('/debug-list', async (req, res) => {
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, booking_reference, status, created_at, customer_id')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return res.status(500).json({
        error: 'Failed to fetch bookings',
        details: error.message
      });
    }

    res.json({
      count: bookings?.length || 0,
      bookings: bookings || []
    });

  } catch (error) {
    console.error('Error listing bookings:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * Debug endpoint to check booking confirmations
 * GET /api/bookings/debug-confirmations/:bookingId
 */
router.get('/debug-confirmations/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    console.log('Debugging confirmations for booking ID:', bookingId);

    // First, check if the booking exists
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({
        error: 'Booking not found',
        bookingId,
        details: bookingError?.message
      });
    }

    // Then, fetch all confirmations for this booking
    const { data: confirmations, error: confirmationsError } = await supabase
      .from('booking_confirmations')
      .select('*')
      .eq('booking_id', bookingId);

    // Also check if there are any confirmations with string booking_id
    const { data: confirmationsString, error: confirmationsStringError } = await supabase
      .from('booking_confirmations')
      .select('*')
      .eq('booking_id', bookingId.toString());

    // Get all booking confirmations to see what's in the table
    const { data: allConfirmations, error: allError } = await supabase
      .from('booking_confirmations')
      .select('id, booking_id, provider, status, created_at')
      .limit(10)
      .order('created_at', { ascending: false });

    res.json({
      booking: {
        id: booking.id,
        booking_reference: booking.booking_reference,
        status: booking.status,
        created_at: booking.created_at
      },
      confirmations: {
        count: confirmations?.length || 0,
        data: confirmations || []
      },
      confirmationsStringCheck: {
        count: confirmationsString?.length || 0,
        data: confirmationsString || []
      },
      recentConfirmations: {
        count: allConfirmations?.length || 0,
        data: allConfirmations || []
      },
      debug: {
        bookingIdType: typeof bookingId,
        bookingIdValue: bookingId,
        bookingTableIdType: typeof booking.id,
        bookingTableIdValue: booking.id
      }
    });

  } catch (error) {
    console.error('Error debugging confirmations:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * Get booking details with confirmations
 * GET /api/bookings/:id
 */
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching booking details for ID:', id, 'by user:', req.user.id);

    // Verify user has access to this booking
    await verifyBookingAccess(req.user.id, id);

    // First, get the basic booking data with agent filtering
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .eq('agent_id', req.user.id) // Explicit agent filtering
      .single();

    if (bookingError) {
      console.error('Booking query error:', bookingError);
      return res.status(404).json({
        error: 'Booking not found or access denied',
        details: bookingError.message
      });
    }

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found or access denied'
      });
    }

    console.log('Booking found:', booking.booking_reference);

    // Fetch related data separately to avoid complex join issues
    // All related data should be accessible since we verified booking access
    const [
      { data: customer, error: customerError },
      { data: booking_items, error: itemsError },
      { data: booking_confirmations, error: confirmationsError },
      { data: payments, error: paymentsError }
    ] = await Promise.all([
      supabase.from('customers').select('*').eq('id', booking.customer_id).single(),
      supabase.from('booking_items').select('*').eq('booking_id', booking.id),
      supabase.from('booking_confirmations').select('*').eq('booking_id', booking.id),
      supabase.from('payments').select('*').eq('booking_id', booking.id)
    ]);

    // Log any errors but don't fail the request
    if (customerError) console.error('Customer query error:', customerError);
    if (itemsError) console.error('Items query error:', itemsError);
    if (confirmationsError) console.error('Confirmations query error:', confirmationsError);
    if (paymentsError) console.error('Payments query error:', paymentsError);

    // Combine all data
    const fullBooking = {
      ...booking,
      customer: customer || null,
      booking_items: booking_items || [],
      booking_confirmations: booking_confirmations || [],
      payments: payments || []
    };

    console.log('Booking details compiled successfully');
    res.json(fullBooking);

  } catch (error) {
    console.error('Error fetching booking details:', error);
    res.status(500).json({
      error: 'Failed to fetch booking details',
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
      clientReference: `TEST-${Date.now().toString().slice(-10)}`
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