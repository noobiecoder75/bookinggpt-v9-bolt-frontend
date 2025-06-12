import { supabase } from '../lib/supabase.js';
import crypto from 'crypto';

const HOTELBEDS_API_KEY = process.env.VITE_HOTELBEDS_API_KEY;
const HOTELBEDS_SECRET = process.env.VITE_HOTELBEDS_SECRET;
const HOTELBEDS_BASE_URL = 'https://api.test.hotelbeds.com';

class ReconfirmationService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.checkInterval = 30 * 60 * 1000; // 30 minutes
  }

  start() {
    if (this.isRunning) {
      console.log('Reconfirmation service is already running');
      return;
    }

    console.log('Starting Hotelbeds reconfirmation service...');
    this.isRunning = true;
    
    // Run immediately
    this.checkPendingReconfirmations();
    
    // Then run every 30 minutes
    this.intervalId = setInterval(() => {
      this.checkPendingReconfirmations();
    }, this.checkInterval);
  }

  stop() {
    if (!this.isRunning) {
      console.log('Reconfirmation service is not running');
      return;
    }

    console.log('Stopping Hotelbeds reconfirmation service...');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async checkPendingReconfirmations() {
    try {
      console.log('=== Checking Pending Reconfirmations ===');
      
      if (!HOTELBEDS_API_KEY || !HOTELBEDS_SECRET) {
        console.warn('Hotelbeds credentials not configured, skipping reconfirmation check');
        return;
      }

      // Get all pending reconfirmations
      const { data: pendingConfirmations, error } = await supabase
        .from('booking_confirmations')
        .select(`
          id,
          booking_id,
          provider_booking_id,
          confirmation_number,
          created_at,
          booking_details
        `)
        .eq('provider', 'hotelbeds')
        .eq('status', 'confirmed')
        .is('hotel_reconfirmation_number', null)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

      if (error) {
        console.error('Error fetching pending reconfirmations:', error);
        return;
      }

      if (!pendingConfirmations || pendingConfirmations.length === 0) {
        console.log('No pending reconfirmations found');
        return;
      }

      console.log(`Found ${pendingConfirmations.length} pending reconfirmations`);

      // Check each confirmation
      for (const confirmation of pendingConfirmations) {
        await this.checkSingleReconfirmation(confirmation);
        // Add delay between requests to avoid rate limiting
        await this.delay(2000);
      }

    } catch (error) {
      console.error('Error in reconfirmation check:', error);
    }
  }

  async checkSingleReconfirmation(confirmation) {
    try {
      console.log(`Checking reconfirmation for booking: ${confirmation.provider_booking_id}`);

      // Generate signature
      const timestamp = Math.floor(Date.now() / 1000);
      const stringToSign = HOTELBEDS_API_KEY + HOTELBEDS_SECRET + timestamp;
      const signature = crypto.createHash('sha256').update(stringToSign).digest('hex');

      const response = await fetch(`${HOTELBEDS_BASE_URL}/hotel-api/1.0/bookings/${confirmation.provider_booking_id}`, {
        method: 'GET',
        headers: {
          'Api-key': HOTELBEDS_API_KEY,
          'X-Signature': signature,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn(`Failed to fetch reconfirmation for ${confirmation.provider_booking_id}: ${response.status}`);
        return;
      }

      const bookingData = await response.json();
      const hotelConfirmationNumber = bookingData.booking?.hotel?.confirmationNumber;

      if (hotelConfirmationNumber) {
        console.log(`Hotel reconfirmation found: ${hotelConfirmationNumber}`);
        await this.updateReconfirmation(confirmation, hotelConfirmationNumber, bookingData);
      } else {
        console.log(`No hotel reconfirmation yet for ${confirmation.provider_booking_id}`);
      }

    } catch (error) {
      console.error(`Error checking reconfirmation for ${confirmation.provider_booking_id}:`, error);
    }
  }

  async updateReconfirmation(confirmation, hotelConfirmationNumber, bookingData) {
    try {
      const updatedBookingDetails = {
        ...confirmation.booking_details,
        hotel_reconfirmation_number: hotelConfirmationNumber,
        hotel_reconfirmation_received_at: new Date().toISOString(),
        hotel_status: bookingData.booking?.status,
        reconfirmation_details: {
          hotel: bookingData.booking?.hotel,
          status: bookingData.booking?.status,
          modificationDate: bookingData.booking?.modificationDate
        }
      };

      const { error } = await supabase
        .from('booking_confirmations')
        .update({
          hotel_reconfirmation_number: hotelConfirmationNumber,
          reconfirmation_received_at: new Date().toISOString(),
          booking_details: updatedBookingDetails,
          updated_at: new Date().toISOString()
        })
        .eq('id', confirmation.id);

      if (error) {
        console.error('Error updating reconfirmation:', error);
      } else {
        console.log(`Successfully updated reconfirmation for booking ${confirmation.provider_booking_id}`);
        
        // Optionally send notification to customer
        await this.notifyCustomer(confirmation.booking_id, hotelConfirmationNumber);
      }

    } catch (error) {
      console.error('Error updating reconfirmation in database:', error);
    }
  }

  async notifyCustomer(bookingId, hotelConfirmationNumber) {
    try {
      // Get booking and customer details
      const { data: booking, error } = await supabase
        .from('bookings')
        .select(`
          booking_reference,
          customer:customers (
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', bookingId)
        .single();

      if (error || !booking) {
        console.error('Error fetching booking for notification:', error);
        return;
      }

      console.log(`Hotel reconfirmation received for booking ${booking.booking_reference}: ${hotelConfirmationNumber}`);
      
      // Here you could integrate with email service, SMS, or push notifications
      // For now, just log the notification
      console.log(`Notification: Customer ${booking.customer.email} should be notified about hotel confirmation ${hotelConfirmationNumber}`);

    } catch (error) {
      console.error('Error sending customer notification:', error);
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      nextCheck: this.intervalId ? new Date(Date.now() + this.checkInterval) : null
    };
  }
}

// Create singleton instance
const reconfirmationService = new ReconfirmationService();

export default reconfirmationService; 