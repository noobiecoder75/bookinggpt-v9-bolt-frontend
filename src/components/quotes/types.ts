export interface ItineraryItem {
  id: string;
  type: 'Flight' | 'Hotel' | 'Tour';
  name: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  cost: number;
  markup: number;
  markup_type: 'percentage' | 'fixed';
  details: any;
}

export interface DayPlan {
  id: string;
  name: string;
  isComplete: boolean;
  items: ItineraryItem[];
}

export interface QuoteDetails {
  days: DayPlan[];
  markup: number;
  discount: number;
}

export interface TravelRequirements {
  departureDate: string;
  returnDate: string;
  origin: string;
  destination: string;
} 