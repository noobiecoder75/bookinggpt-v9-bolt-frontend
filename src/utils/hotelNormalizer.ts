/**
 * Hotel Data Normalizer
 * 
 * Handles the critical difference between Hotelbeds API hotels and manually entered hotels:
 * - Hotelbeds API: 'cost' field typically represents total stay cost
 * - Manual Entry: 'cost' field typically represents per-night rate
 * 
 * This normalizer creates a consistent data structure for all hotel pricing calculations.
 */

export type HotelSource = 'hotelbeds' | 'manual';

export interface RawHotelItem {
  id: string | number;
  item_type: 'Hotel';
  item_name: string;
  cost: number; // AMBIGUOUS: could be per-night or total stay
  markup: number;
  markup_type: 'percentage' | 'fixed';
  quantity: number;
  details: {
    nights?: number;
    numberOfNights?: number;
    span_days?: number;
    check_in?: string;
    check_out?: string;
    checkInDate?: string;
    checkOutDate?: string;
    source?: HotelSource;
    hotelbeds_booking_id?: string;
    // Other hotel-specific fields
    [key: string]: any;
  };
}

export interface NormalizedHotelItem extends Omit<RawHotelItem, 'details'> {
  details: RawHotelItem['details'] & {
    pricing: {
      source: HotelSource;
      isPerNightRate: boolean;
      costPerNight: number;
      totalCostBase: number; // Total cost before markups
      nights: number;
      originalCostField: number; // Preserve original cost for debugging
    };
  };
}

/**
 * Determines the number of nights from various possible fields
 */
function extractNights(details: RawHotelItem['details']): number {
  // Priority order for extracting nights
  if (details.nights && details.nights > 0) {
    return details.nights;
  }
  
  if (details.numberOfNights && details.numberOfNights > 0) {
    return details.numberOfNights;
  }
  
  if (details.span_days && details.span_days > 0) {
    return details.span_days;
  }
  
  // Calculate from dates if available
  const checkIn = details.check_in || details.checkInDate;
  const checkOut = details.check_out || details.checkOutDate;
  
  if (checkIn && checkOut) {
    const checkInDate = new Date(checkIn + 'T00:00:00');
    const checkOutDate = new Date(checkOut + 'T00:00:00');
    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (nights > 0) {
      return nights;
    }
  }
  
  // Default to 1 night if nothing else is available
  return 1;
}

/**
 * Determines the hotel source with fallback logic
 */
function determineHotelSource(details: RawHotelItem['details']): HotelSource {
  // Priority 1: Explicit source field
  if (details.source) {
    return details.source;
  }
  
  // Priority 2: Presence of Hotelbeds-specific fields
  if (details.hotelbeds_booking_id || details.hotelbeds_id) {
    return 'hotelbeds';
  }
  
  // Priority 3: Check for other API-specific indicators
  if (details.api_source === 'hotelbeds' || details.provider === 'hotelbeds') {
    return 'hotelbeds';
  }
  
  // Priority 4: Infer from data structure patterns
  // If it has structured date fields AND nights info, likely from API
  const hasDateFields = (details.check_in || details.checkInDate) && 
                       (details.check_out || details.checkOutDate);
  const hasNightsInfo = details.nights || details.numberOfNights || details.span_days;
  
  if (hasDateFields && hasNightsInfo) {
    // Hotels with structured booking data are likely from API sources like Hotelbeds
    return 'hotelbeds';
  }
  
  // Default: Assume manual entry
  return 'manual';
}

/**
 * Normalizes hotel pricing data to handle dual sources consistently
 */
export function normalizeHotelPricing(item: RawHotelItem): NormalizedHotelItem {
  const nights = extractNights(item.details);
  const source = determineHotelSource(item.details);
  
  // Critical logic: Interpret the 'cost' field based on source
  let costPerNight: number;
  let totalCostBase: number;
  let isPerNightRate: boolean;
  
  if (source === 'manual') {
    // Manual entries: cost field is typically per-night rate
    isPerNightRate = true;
    costPerNight = item.cost;
    totalCostBase = item.cost * nights;
  } else {
    // Hotelbeds API: cost field is typically total stay cost
    isPerNightRate = false;
    totalCostBase = item.cost;
    costPerNight = nights > 0 ? item.cost / nights : item.cost;
  }
  
  return {
    ...item,
    details: {
      ...item.details,
      pricing: {
        source,
        isPerNightRate,
        costPerNight,
        totalCostBase,
        nights,
        originalCostField: item.cost
      }
    }
  };
}

/**
 * Validates that a hotel item has been properly normalized
 */
export function isNormalizedHotelItem(item: any): item is NormalizedHotelItem {
  return (
    item &&
    item.item_type === 'Hotel' &&
    item.details &&
    item.details.pricing &&
    typeof item.details.pricing.costPerNight === 'number' &&
    typeof item.details.pricing.totalCostBase === 'number' &&
    typeof item.details.pricing.nights === 'number'
  );
}

/**
 * Batch normalizes an array of hotel items
 */
export function normalizeHotelItems(items: RawHotelItem[]): NormalizedHotelItem[] {
  return items.map(item => {
    if (item.item_type === 'Hotel') {
      return normalizeHotelPricing(item);
    }
    // Return non-hotel items unchanged (they'll be typed as NormalizedHotelItem but that's okay)
    return item as NormalizedHotelItem;
  });
}

/**
 * Debug helper to compare original vs normalized pricing
 */
export function debugHotelPricing(item: RawHotelItem): {
  original: { cost: number; nights: number };
  normalized: { costPerNight: number; totalCostBase: number; source: HotelSource };
  potentialIssue?: string;
} {
  const normalized = normalizeHotelPricing(item);
  const pricing = normalized.details.pricing;
  
  const result = {
    original: {
      cost: item.cost,
      nights: pricing.nights
    },
    normalized: {
      costPerNight: pricing.costPerNight,
      totalCostBase: pricing.totalCostBase,
      source: pricing.source
    }
  };
  
  // Check for potential issues
  if (pricing.source === 'manual' && item.cost > 1000) {
    (result as any).potentialIssue = 'Manual hotel cost > $1000 - might be total instead of per-night';
  }
  
  if (pricing.source === 'hotelbeds' && item.cost < 50) {
    (result as any).potentialIssue = 'Hotelbeds hotel cost < $50 - might be per-night instead of total';
  }
  
  return result;
}