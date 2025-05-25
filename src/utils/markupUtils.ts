import { supabase } from '../lib/supabase';

export interface AgentMarkupSettings {
  flight_markup: number;
  flight_markup_type: 'percentage' | 'fixed';
  hotel_markup: number;
  hotel_markup_type: 'percentage' | 'fixed';
  activity_markup: number;
  activity_markup_type: 'percentage' | 'fixed';
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