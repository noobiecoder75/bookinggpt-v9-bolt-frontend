/**
 * Unified Pricing Utility
 * 
 * Provides consistent pricing calculations across all components.
 * Handles both global and individual markup strategies.
 * Prevents multi-day item double-counting.
 */

export type MarkupStrategy = 'global' | 'individual' | 'mixed';

export interface PricingItem {
  id: string | number;
  cost: number;
  markup: number;
  markup_type: 'percentage' | 'fixed';
  quantity: number;
  item_type: string;
  details?: {
    day_index?: number;
    span_days?: number;
    nights?: number;
    numberOfNights?: number;
    checkInDate?: string;
    checkOutDate?: string;
    [key: string]: any;
  };
}

export interface PricingQuote {
  id: string | number;
  markup: number;
  discount: number;
  markup_strategy?: MarkupStrategy;
  quote_items?: PricingItem[];
}

export interface PricingOptions {
  includeGlobalMarkup?: boolean;
  includeDiscount?: boolean;
  includeQuantity?: boolean;
  isClientView?: boolean;
  markupStrategy?: MarkupStrategy;
}

export interface ProcessedItem extends PricingItem {
  isMultiDay: boolean;
  isUnique: boolean;
  effectiveMarkup: number;
  effectiveMarkupType: 'percentage' | 'fixed';
  totalCost: number;
  displayCost: number;
}

/**
 * Determines the markup strategy for a quote
 */
export function determineMarkupStrategy(quote: PricingQuote): MarkupStrategy {
  // If explicitly set, use that strategy
  if (quote.markup_strategy) {
    return quote.markup_strategy;
  }

  // If no items, default to global
  if (!quote.quote_items || quote.quote_items.length === 0) {
    return 'global';
  }

  // Check if any items have individual markups
  const hasIndividualMarkups = quote.quote_items.some(item => 
    item.markup && item.markup > 0
  );

  // If items have individual markups, use individual strategy
  if (hasIndividualMarkups) {
    return 'individual';
  }

  // Default to global markup
  return 'global';
}

/**
 * Processes multi-day items to prevent double-counting
 */
export function processMultiDayItems(items: PricingItem[]): ProcessedItem[] {
  const processedItems: ProcessedItem[] = [];
  const seenItemIds = new Set<string | number>();

  for (const item of items) {
    const isMultiDay = isMultiDayItem(item);
    const isUnique = !seenItemIds.has(item.id);
    
    // For multi-day items, only count once
    if (isMultiDay && !isUnique) {
      continue;
    }

    seenItemIds.add(item.id);

    const processedItem: ProcessedItem = {
      ...item,
      isMultiDay,
      isUnique,
      effectiveMarkup: item.markup || 0,
      effectiveMarkupType: item.markup_type || 'percentage',
      totalCost: 0, // Will be calculated later
      displayCost: 0 // Will be calculated later
    };

    processedItems.push(processedItem);
  }

  return processedItems;
}

/**
 * Checks if an item spans multiple days
 */
export function isMultiDayItem(item: PricingItem): boolean {
  if (item.item_type === 'Hotel') {
    // Check for span_days
    if (item.details?.span_days && item.details.span_days > 1) {
      return true;
    }
    
    // Check for nights
    const nights = item.details?.nights || item.details?.numberOfNights;
    if (nights && nights > 1) {
      return true;
    }
    
    // Check for date range
    if (item.details?.checkInDate && item.details?.checkOutDate) {
      const checkIn = new Date(item.details.checkInDate + 'T00:00:00');
      const checkOut = new Date(item.details.checkOutDate + 'T00:00:00');
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      return nights > 1;
    }
  }
  
  return false;
}

/**
 * Gets the effective markup for an item based on strategy
 */
export function getEffectiveMarkup(
  item: PricingItem, 
  quote: PricingQuote, 
  strategy: MarkupStrategy
): { markup: number; markup_type: 'percentage' | 'fixed' } {
  switch (strategy) {
    case 'global':
      return {
        markup: quote.markup || 0,
        markup_type: 'percentage'
      };
      
    case 'individual':
      return {
        markup: item.markup || 0,
        markup_type: item.markup_type || 'percentage'
      };
      
    case 'mixed':
      // Use individual markup if available, otherwise fall back to global
      if (item.markup && item.markup > 0) {
        return {
          markup: item.markup,
          markup_type: item.markup_type || 'percentage'
        };
      }
      return {
        markup: quote.markup || 0,
        markup_type: 'percentage'
      };
      
    default:
      return {
        markup: 0,
        markup_type: 'percentage'
      };
  }
}

/**
 * Calculates the price for a single item
 */
export function calculateItemPrice(
  item: PricingItem, 
  quote: PricingQuote, 
  options: PricingOptions = {}
): number {
  const {
    includeQuantity = true,
    markupStrategy = determineMarkupStrategy(quote)
  } = options;

  // Base cost
  let baseCost = item.cost;
  
  // Apply quantity
  if (includeQuantity) {
    baseCost *= (item.quantity || 1);
  }

  // Get effective markup
  const effectiveMarkup = getEffectiveMarkup(item, quote, markupStrategy);

  // Apply markup
  let markupAmount = 0;
  if (effectiveMarkup.markup_type === 'percentage') {
    markupAmount = baseCost * (effectiveMarkup.markup / 100);
  } else {
    markupAmount = effectiveMarkup.markup;
  }

  return baseCost + markupAmount;
}

/**
 * Calculates the total price for a quote
 */
export function calculateQuoteTotal(
  quote: PricingQuote, 
  options: PricingOptions = {}
): number {
  const {
    includeDiscount = true,
    markupStrategy = determineMarkupStrategy(quote)
  } = options;

  if (!quote.quote_items || quote.quote_items.length === 0) {
    return quote.markup || 0;
  }

  // Process items to handle multi-day items
  const processedItems = processMultiDayItems(quote.quote_items);

  // Calculate total from individual items
  let total = 0;
  for (const item of processedItems) {
    const itemPrice = calculateItemPrice(item, quote, { ...options, markupStrategy });
    total += itemPrice;
  }

  // Apply global discount if enabled
  if (includeDiscount && quote.discount) {
    total = total * (1 - quote.discount / 100);
  }

  return total;
}

/**
 * Calculates the total for a specific day (for itinerary display)
 */
export function calculateDayTotal(
  items: PricingItem[], 
  quote: PricingQuote, 
  dayIndex: number,
  options: PricingOptions = {}
): number {
  const dayItems = items.filter(item => {
    // Check if item belongs to this day
    if (item.details?.day_index === dayIndex) {
      return true;
    }
    
    // For multi-day items, check if this day is within the span
    if (isMultiDayItem(item)) {
      const startDay = item.details?.day_index || 0;
      const spanDays = item.details?.span_days || 1;
      return dayIndex >= startDay && dayIndex < startDay + spanDays;
    }
    
    return false;
  });

  // Calculate total for this day
  let dayTotal = 0;
  const processedItems = processMultiDayItems(dayItems);
  
  for (const item of processedItems) {
    const itemPrice = calculateItemPrice(item, quote, options);
    
    // For multi-day items, distribute cost across days
    // NOTE: This works correctly with TripOverviewRefactored's cost-per-day model:
    // - TripOverviewRefactored stores: cost = totalCost/spanDays, quantity = spanDays
    // - calculateItemPrice computes: itemPrice = cost * quantity = totalCost
    // - Day calculation: itemPrice / spanDays = totalCost / spanDays (correct per-day amount)
    if (item.isMultiDay) {
      const spanDays = item.details?.span_days || 1;
      dayTotal += itemPrice / spanDays;
    } else {
      dayTotal += itemPrice;
    }
  }

  return dayTotal;
}

/**
 * Calculates the total for a specific day when items have already been filtered
 * and potentially duplicated by the ClientItinerary component
 */
export function calculateFilteredDayTotal(
  dayItems: PricingItem[], 
  quote: PricingQuote, 
  options: PricingOptions = {}
): number {
  if (!dayItems || dayItems.length === 0) {
    return 0;
  }

  let dayTotal = 0;
  const processedItems = processMultiDayItems(dayItems);

  for (const item of processedItems) {
    const itemPrice = calculateItemPrice(item, quote, options);
    
    // Check if this item has been marked as a multi-day display item
    if (item.details?.isMultiDayDisplay && item.details?.originalSpanDays) {
      // This item has been duplicated across days by ClientItinerary
      // Calculate the per-day cost
      const spanDays = item.details.originalSpanDays;
      dayTotal += itemPrice / spanDays;
    } else if (item.isMultiDay) {
      // Standard multi-day item handling
      const spanDays = item.details?.span_days || 1;
      dayTotal += itemPrice / spanDays;
    } else {
      // Single-day item
      dayTotal += itemPrice;
    }
  }

  return dayTotal;
}

/**
 * Gets the display price for an item (e.g., per-night for hotels)
 */
export function getItemDisplayPrice(
  item: PricingItem, 
  quote: PricingQuote, 
  options: PricingOptions = {}
): number {
  const totalPrice = calculateItemPrice(item, quote, options);
  
  // For hotels, show per-night price
  if (item.item_type === 'Hotel') {
    const nights = item.details?.nights || item.details?.numberOfNights;
    if (nights && nights > 1) {
      return totalPrice / nights;
    }
    
    // Calculate from dates if nights not available
    if (item.details?.checkInDate && item.details?.checkOutDate) {
      const checkIn = new Date(item.details.checkInDate + 'T00:00:00');
      const checkOut = new Date(item.details.checkOutDate + 'T00:00:00');
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      if (nights > 1) {
        return totalPrice / nights;
      }
    }
  }
  
  return totalPrice;
}

/**
 * Calculates average markup percentage for a quote
 */
export function calculateAverageMarkup(
  quote: PricingQuote, 
  options: PricingOptions = {}
): number {
  const { markupStrategy = determineMarkupStrategy(quote) } = options;

  if (!quote.quote_items || quote.quote_items.length === 0) {
    return quote.markup || 0;
  }

  // For global markup, return the global markup
  if (markupStrategy === 'global') {
    return quote.markup || 0;
  }

  // For individual markup, calculate weighted average
  const processedItems = processMultiDayItems(quote.quote_items);
  
  let totalCost = 0;
  let totalWithMarkup = 0;

  for (const item of processedItems) {
    const baseCost = item.cost * (item.quantity || 1);
    const itemPrice = calculateItemPrice(item, quote, options);
    
    totalCost += baseCost;
    totalWithMarkup += itemPrice;
  }

  if (totalCost === 0) return 0;
  
  return ((totalWithMarkup - totalCost) / totalCost) * 100;
}

/**
 * Validates pricing consistency between components
 */
export function validatePricingConsistency(
  quote: PricingQuote,
  calculatedTotal: number,
  tolerance: number = 0.01
): { isValid: boolean; difference: number; message: string } {
  const expectedTotal = calculateQuoteTotal(quote);
  const difference = Math.abs(calculatedTotal - expectedTotal);
  const isValid = difference <= tolerance;

  return {
    isValid,
    difference,
    message: isValid 
      ? 'Pricing is consistent' 
      : `Pricing inconsistency detected: ${difference.toFixed(2)} difference`
  };
}

/**
 * Formats price for display
 */
export function formatPrice(
  price: number, 
  currency: string = 'USD', 
  options: Intl.NumberFormatOptions = {}
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  }).format(price);
}

/**
 * Default pricing options
 */
export const DEFAULT_PRICING_OPTIONS: PricingOptions = {
  includeGlobalMarkup: true,
  includeDiscount: true,
  includeQuantity: true,
  isClientView: false,
  markupStrategy: 'global'
};

/**
 * Client-specific pricing options (hides markup details)
 */
export const CLIENT_PRICING_OPTIONS: PricingOptions = {
  includeGlobalMarkup: true,
  includeDiscount: true,
  includeQuantity: true,
  isClientView: true,
  markupStrategy: 'global'
};

/**
 * Validates hotel pricing consistency and provides debugging information
 */
export function validateHotelPricing(
  quote: PricingQuote,
  tolerance: number = 0.01
): {
  isValid: boolean;
  issues: Array<{
    itemId: string | number;
    issue: string;
    severity: 'warning' | 'error';
    originalCost: number;
    normalizedCost: number;
    source: string;
  }>;
  totalDiscrepancy: number;
} {
  const issues: any[] = [];
  let totalDiscrepancy = 0;
  
  if (!quote.quote_items) {
    return { isValid: true, issues: [], totalDiscrepancy: 0 };
  }
  
  for (const item of quote.quote_items) {
    if (item.item_type === 'Hotel') {
      // Simple validation without normalization
      if (item.cost > 1000) {
        issues.push({
          itemId: item.id,
          issue: `Hotel cost $${item.cost} seems high - verify if this is per-night or total`,
          severity: 'warning' as const,
          originalCost: item.cost,
          normalizedCost: item.cost,
          source: 'unknown'
        });
      }
      
      if (item.cost < 10) {
        issues.push({
          itemId: item.id,
          issue: `Hotel cost $${item.cost} seems low - verify pricing`,
          severity: 'warning' as const,
          originalCost: item.cost,
          normalizedCost: item.cost,
          source: 'unknown'
        });
      }
    }
  }
  
  return {
    isValid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    totalDiscrepancy
  };
}