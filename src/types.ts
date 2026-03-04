export interface Activity {
  id: string;
  type?: 'activity' | 'transport';  // transport = transit instruction (tappable faint row)
  category?: 'hotel' | 'meal' | null; // hotel = pink accent, meal = red accent
  time: string | null;              // HH:MM start time
  timeEnd?: string | null;          // HH:MM end time (for group headers with a time range)
  title: string;
  location: string | null;
  description?: string | null;      // short description from sub-bullets
  hours?: string | null;            // hours of operation from sub-bullets
  notes: string | null;
  completed: boolean;
  parentId?: string | null;         // set when this activity is a sub-item under a group header
  expense?: { amount: number; currency: string } | null;
}

export interface Day {
  date: string;
  label: string;
  theme: string;
  activities: Activity[];
}

export interface Trip {
  id: string;         // unique identifier
  docUrl: string;     // original Google Doc URL for re-import
  title: string;
  days: Day[];
  defaultCurrency: string;  // e.g. "JPY", "CNY", "USD"
}

export interface TripMeta {
  id: string;
  title: string;
  dateRange: string;  // e.g. "Dec 10–13"
  docUrl: string;
}
