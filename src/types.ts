export interface Activity {
  id: string;
  time: string | null;       // "14:30" in 24h format, or null if no time given
  title: string;
  location: string | null;
  notes: string | null;
  completed: boolean;
}

export interface Day {
  date: string;              // "2024-12-10"
  label: string;             // "Wed, Dec 10"
  theme: string;             // "Tokyo" or "Pre-Arrival"
  activities: Activity[];
}

export interface Trip {
  title: string;
  days: Day[];
}
