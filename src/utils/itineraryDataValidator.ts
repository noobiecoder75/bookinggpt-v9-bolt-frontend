/**
 * Utility functions for validating and normalizing itinerary data from the database
 */

interface QuoteItem {
  id: number;
  item_type: 'Flight' | 'Hotel' | 'Tour' | 'Transfer' | 'Insurance';
  item_name: string;
  cost: number;
  markup: number;
  markup_type: 'percentage' | 'fixed';
  quantity: number;
  details: any;
}

interface Quote {
  id: string;
  trip_start_date?: string;
  trip_end_date?: string;
  quote_items: QuoteItem[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedQuote: Quote;
}

/**
 * Validates and normalizes quote data from the database
 */
export function validateItineraryData(quote: Quote): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let normalizedQuote = { ...quote };

  // 1. Validate trip dates
  if (!quote.trip_start_date || !quote.trip_end_date) {
    warnings.push('Trip dates missing - will attempt to infer from quote items');
    
    // Try to infer dates from quote items
    const inferredDates = inferTripDates(quote.quote_items);
    if (inferredDates.startDate && inferredDates.endDate) {
      normalizedQuote.trip_start_date = inferredDates.startDate;
      normalizedQuote.trip_end_date = inferredDates.endDate;
      warnings.push(`Inferred trip dates: ${inferredDates.startDate} to ${inferredDates.endDate}`);
    } else {
      errors.push('Cannot determine trip dates from available data');
    }
  }

  // 2. Validate quote items structure
  const normalizedItems: QuoteItem[] = [];
  
  quote.quote_items.forEach((item, index) => {
    const itemErrors: string[] = [];
    const itemWarnings: string[] = [];
    
    // Validate required fields
    if (!item.item_type || !['Flight', 'Hotel', 'Tour', 'Transfer', 'Insurance'].includes(item.item_type)) {
      itemErrors.push(`Item ${index + 1}: Invalid or missing item_type`);
    }
    
    if (!item.item_name || item.item_name.trim() === '') {
      itemErrors.push(`Item ${index + 1}: Missing item_name`);
    }
    
    if (typeof item.cost !== 'number' || item.cost < 0) {
      itemErrors.push(`Item ${index + 1}: Invalid cost value`);
    }
    
    // Validate and normalize details based on item type
    const normalizedDetails = normalizeItemDetails(item, normalizedQuote);
    
    if (normalizedDetails.warnings.length > 0) {
      itemWarnings.push(...normalizedDetails.warnings.map(w => `Item ${index + 1}: ${w}`));
    }
    
    // Add normalized item
    normalizedItems.push({
      ...item,
      details: normalizedDetails.details
    });
    
    errors.push(...itemErrors);
    warnings.push(...itemWarnings);
  });
  
  normalizedQuote.quote_items = normalizedItems;

  // 3. Validate day assignments
  const dayValidation = validateDayAssignments(normalizedQuote);
  errors.push(...dayValidation.errors);
  warnings.push(...dayValidation.warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    normalizedQuote
  };
}

/**
 * Infers trip dates from quote items
 */
function inferTripDates(items: QuoteItem[]): { startDate?: string; endDate?: string } {
  const dates: Date[] = [];
  
  items.forEach(item => {
    // Extract dates from different item types
    if (item.details?.departure) {
      dates.push(new Date(item.details.departure));
    }
    if (item.details?.arrival) {
      dates.push(new Date(item.details.arrival));
    }
    if (item.details?.check_in) {
      dates.push(new Date(item.details.check_in + 'T00:00:00'));
    }
    if (item.details?.check_out) {
      dates.push(new Date(item.details.check_out + 'T00:00:00'));
    }
    if (item.details?.date) {
      dates.push(new Date(item.details.date + 'T00:00:00'));
    }
  });
  
  if (dates.length === 0) return {};
  
  dates.sort((a, b) => a.getTime() - b.getTime());
  
  return {
    startDate: dates[0].toISOString().split('T')[0],
    endDate: dates[dates.length - 1].toISOString().split('T')[0]
  };
}

/**
 * Normalizes item details based on item type
 */
function normalizeItemDetails(item: QuoteItem, quote: Quote): { details: any; warnings: string[] } {
  const warnings: string[] = [];
  let details = { ...item.details };
  
  switch (item.item_type) {
    case 'Flight':
      // Normalize flight details
      if (!details.departure && !details.startTime) {
        warnings.push('Missing departure time');
      }
      if (!details.arrival && !details.endTime) {
        warnings.push('Missing arrival time');
      }
      
      // Ensure consistent time format
      if (details.departure) {
        details.startTime = details.departure;
      }
      if (details.arrival) {
        details.endTime = details.arrival;
      }
      break;
      
    case 'Hotel':
      // Normalize hotel details
      if (!details.check_in && !details.checkInDate) {
        warnings.push('Missing check-in date');
      }
      if (!details.check_out && !details.checkOutDate) {
        warnings.push('Missing check-out date');
      }
      
      // Ensure consistent field names
      if (details.check_in && !details.checkInDate) {
        details.checkInDate = details.check_in;
      }
      if (details.check_out && !details.checkOutDate) {
        details.checkOutDate = details.check_out;
      }
      
      // Calculate nights if missing
      if (!details.nights && !details.numberOfNights && details.check_in && details.check_out) {
        const checkIn = new Date(details.check_in);
        const checkOut = new Date(details.check_out);
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        details.nights = nights;
        details.numberOfNights = nights;
      }
      break;
      
    case 'Tour':
    case 'Transfer':
      // Normalize activity details
      if (!details.date && !details.startTime) {
        warnings.push('Missing activity date/time');
      }
      break;
  }
  
  // Assign day index if missing
  if (details.day_index === undefined || details.day_index === null) {
    const dayIndex = calculateDayIndex(item, quote);
    if (dayIndex !== null) {
      details.day_index = dayIndex;
    } else {
      warnings.push('Could not determine day assignment');
    }
  }
  
  return { details, warnings };
}

/**
 * Calculates day index based on item date and trip start
 */
function calculateDayIndex(item: QuoteItem, quote: Quote): number | null {
  if (!quote.trip_start_date) return null;
  
  const tripStart = new Date(quote.trip_start_date + 'T00:00:00');
  let itemDate: Date | null = null;
  
  // Determine item date based on type
  if (item.details?.departure) {
    itemDate = new Date(item.details.departure);
  } else if (item.details?.check_in) {
    itemDate = new Date(item.details.check_in + 'T00:00:00');
  } else if (item.details?.date) {
    itemDate = new Date(item.details.date + 'T00:00:00');
  }
  
  if (!itemDate) return null;
  
  const diffTime = itemDate.getTime() - tripStart.getTime();
  const dayIndex = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, dayIndex);
}

/**
 * Validates day assignments across all items
 */
function validateDayAssignments(quote: Quote): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!quote.trip_start_date || !quote.trip_end_date) {
    return { errors, warnings };
  }
  
  const tripStart = new Date(quote.trip_start_date + 'T00:00:00');
  const tripEnd = new Date(quote.trip_end_date + 'T00:00:00');
  const totalDays = Math.ceil((tripEnd.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  quote.quote_items.forEach((item, index) => {
    const dayIndex = item.details?.day_index;
    
    if (dayIndex !== undefined && dayIndex !== null) {
      if (dayIndex < 0) {
        warnings.push(`Item ${index + 1}: Day index ${dayIndex} is negative`);
      } else if (dayIndex >= totalDays) {
        warnings.push(`Item ${index + 1}: Day index ${dayIndex} exceeds trip duration (${totalDays} days)`);
      }
    }
  });
  
  return { errors, warnings };
}

/**
 * Helper function to safely format dates from various input formats
 */
export function formatDateSafely(dateInput: string | Date | null | undefined, format: 'date' | 'time' | 'datetime' = 'date'): string {
  if (!dateInput) return '';
  
  try {
    let date: Date;
    
    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'string') {
      // Handle various string formats
      if (dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Date only format (YYYY-MM-DD)
        date = new Date(dateInput + 'T00:00:00');
      } else if (dateInput.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
        // Time only format (HH:MM or HH:MM:SS)
        const today = new Date().toISOString().split('T')[0];
        date = new Date(`${today}T${dateInput}`);
      } else {
        date = new Date(dateInput);
      }
    } else {
      return '';
    }
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateInput);
      return String(dateInput);
    }
    
    switch (format) {
      case 'time':
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case 'datetime':
        return date.toLocaleString();
      case 'date':
      default:
        return date.toLocaleDateString();
    }
  } catch (error) {
    console.warn('Error formatting date:', error);
    return String(dateInput || '');
  }
}