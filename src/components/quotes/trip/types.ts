export interface Trip {
  id: string;
  name: string;
  status: 'Planning' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled' | 'Published';
  type: 'Regular Trip' | 'Group Trip' | 'Corporate Trip' | 'Luxury Trip';
  startDate: string;
  endDate: string;
  currency: string;
  pricingVisible: boolean;
  pdfDownloadEnabled: boolean;
  tags: string[];
  customer?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  total_price: number;
  markup: number;
  discount: number;
  notes: string;
}

export interface Booking {
  id: string;
  type: string;
  name: string;
  date: string;
  status: string;
}

export interface ActivityItem {
  id: string;
  type: 'milestone' | 'activity';
  title: string;
  date: string;
  icon: React.ReactNode;
  user?: string;
}

export interface Traveler {
  id: string;
  name: string;
  email: string;
  type: 'Adult' | 'Child' | 'Senior';
}

export interface ItineraryOption {
  id: string;
  name: string;
  dateRange: string;
  isActive: boolean;
}

export interface TravelRequirements {
  adults: number;
  children: number;
  seniors: number;
  departureDate: string;
  returnDate: string;
  origin: string;
  destination: string;
  tripType: 'flight' | 'hotel' | 'flight+hotel' | 'tour' | 'custom';
  specialRequests: string;
}

export interface ItineraryItem {
  id: string;
  type: 'Flight' | 'Hotel' | 'Tour' | 'Transfer';
  name: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  cost: number;
  markup: number;
  markup_type: 'percentage' | 'fixed';
  details: any;
  // For linked flight items (return flights)
  linkedItemId?: string;
  isReturnFlight?: boolean;
  flightDirection?: 'outbound' | 'return';
}

export interface DayPlan {
  id: string;
  dayIndex: number;
  name: string;
  items: ItineraryItem[];
  isComplete: boolean;
} 