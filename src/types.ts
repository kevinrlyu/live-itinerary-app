export interface Activity {
  id: string;
  time: string | null;
  title: string;
  location: string | null;
  notes: string | null;
  completed: boolean;
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
}

export interface TripMeta {
  id: string;
  title: string;
  dateRange: string;  // e.g. "Dec 10–13"
  docUrl: string;
}
