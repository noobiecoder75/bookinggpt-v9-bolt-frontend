import { supabase } from '../lib/supabase';

export interface AgentMarkupSettings {
  flight_markup: number;
  flight_markup_type: 'percentage' | 'fixed';
  hotel_markup: number;
  hotel_markup_type: 'percentage' | 'fixed';
  activity_markup: number;
  activity_markup_type: 'percentage' | 'fixed';
}

export interface MarkupValidationResult {
  isValid: boolean;
  error?: string;
  adjustedMarkup?: number;
  minimumMarkup: number;
}

export interface MarkupValidationError {
  message: string;
  minimumRequired: number;
  attempted: number;
  itemType: string;
}

const DEFAULT_MARKUP_SETTINGS: AgentMarkupSettings = {
  flight_markup: 10,
  flight_markup_type: 'percentage',
  hotel_markup: 15,
  hotel_markup_type: 'percentage',
  activity_markup: 20,
  activity_markup_type: 'percentage',
};

export async function getAgentMarkupSettings(): Promise<AgentMarkupSettings> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return DEFAULT_MARKUP_SETTINGS;

    const { data, error } = await supabase
      .from('user_settings')
      .select('setting_value')
      .eq('user_id', user.user.id)
      .eq('setting_key', 'markup_settings')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching markup settings:', error);
      return DEFAULT_MARKUP_SETTINGS;
    }

    return data?.setting_value || DEFAULT_MARKUP_SETTINGS;
  } catch (error) {
    console.error('Error fetching markup settings:', error);
    return DEFAULT_MARKUP_SETTINGS;
  }
}

export function getMarkupForItemType(
  itemType: 'Flight' | 'Hotel' | 'Tour' | 'Transfer',
  markupSettings: AgentMarkupSettings
): { markup: number; markup_type: 'percentage' | 'fixed' } {
  switch (itemType) {
    case 'Flight':
      return {
        markup: markupSettings.flight_markup,
        markup_type: markupSettings.flight_markup_type,
      };
    case 'Hotel':
      return {
        markup: markupSettings.hotel_markup,
        markup_type: markupSettings.hotel_markup_type,
      };
    case 'Tour':
      return {
        markup: markupSettings.activity_markup,
        markup_type: markupSettings.activity_markup_type,
      };
    case 'Transfer':
      // Use flight markup for transfers as they're similar
      return {
        markup: markupSettings.flight_markup,
        markup_type: markupSettings.flight_markup_type,
      };
    default:
      return {
        markup: 0,
        markup_type: 'percentage',
      };
  }
}

/**
 * Validates that a markup is not below the global minimum for the item type
 */
export async function validateMarkup(
  itemType: 'Flight' | 'Hotel' | 'Tour' | 'Transfer',
  proposedMarkup: number,
  markupType: 'percentage' | 'fixed' = 'percentage'
): Promise<MarkupValidationResult> {
  try {
    const globalSettings = await getAgentMarkupSettings();
    const minimumMarkup = getMarkupForItemType(itemType, globalSettings);
    
    // Only validate percentage markups for now (fixed markups are more complex)
    if (markupType !== 'percentage') {
      return {
        isValid: true,
        minimumMarkup: minimumMarkup.markup
      };
    }
    
    if (proposedMarkup < minimumMarkup.markup) {
      return {
        isValid: false,
        error: `Markup for ${itemType} cannot be below the global minimum of ${minimumMarkup.markup}%. Please set a markup of at least ${minimumMarkup.markup}% or update your global settings.`,
        adjustedMarkup: minimumMarkup.markup,
        minimumMarkup: minimumMarkup.markup
      };
    }
    
    return {
      isValid: true,
      minimumMarkup: minimumMarkup.markup
    };
  } catch (error) {
    console.error('Error validating markup:', error);
    return {
      isValid: false,
      error: 'Unable to validate markup. Please try again.',
      minimumMarkup: 0
    };
  }
}

/**
 * Enforces minimum markup and returns the appropriate markup value
 */
export async function enforceMinimumMarkup(
  itemType: 'Flight' | 'Hotel' | 'Tour' | 'Transfer',
  proposedMarkup: number = 0,
  markupType: 'percentage' | 'fixed' = 'percentage'
): Promise<{ markup: number; markup_type: 'percentage' | 'fixed'; wasAdjusted: boolean }> {
  try {
    const globalSettings = await getAgentMarkupSettings();
    const minimumMarkup = getMarkupForItemType(itemType, globalSettings);
    
    // For percentage markups, enforce minimum
    if (markupType === 'percentage') {
      const finalMarkup = Math.max(proposedMarkup, minimumMarkup.markup);
      return {
        markup: finalMarkup,
        markup_type: markupType,
        wasAdjusted: finalMarkup > proposedMarkup
      };
    }
    
    // For fixed markups, just return as-is for now
    return {
      markup: proposedMarkup,
      markup_type: markupType,
      wasAdjusted: false
    };
  } catch (error) {
    console.error('Error enforcing minimum markup:', error);
    return {
      markup: proposedMarkup,
      markup_type: markupType,
      wasAdjusted: false
    };
  }
}

/**
 * Gets the default markup for a new item based on global settings
 */
export async function getDefaultMarkupForNewItem(
  itemType: 'Flight' | 'Hotel' | 'Tour' | 'Transfer'
): Promise<{ markup: number; markup_type: 'percentage' | 'fixed' }> {
  try {
    const globalSettings = await getAgentMarkupSettings();
    return getMarkupForItemType(itemType, globalSettings);
  } catch (error) {
    console.error('Error getting default markup:', error);
    return {
      markup: 0,
      markup_type: 'percentage'
    };
  }
}

/**
 * Creates a user-friendly error message for markup validation failures
 */
export function createMarkupValidationError(
  itemType: string,
  attempted: number,
  minimum: number
): MarkupValidationError {
  return {
    message: `${itemType} markup of ${attempted}% is below the minimum required ${minimum}%. Please increase the markup to at least ${minimum}% or update your global markup settings.`,
    minimumRequired: minimum,
    attempted: attempted,
    itemType: itemType
  };
} 