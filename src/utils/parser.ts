import Anthropic from "@anthropic-ai/sdk";
import { Trip } from "../types";

const client = new Anthropic({
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

const SYSTEM_PROMPT = `You are a travel itinerary parser. Given raw text from a travel itinerary document, extract all information and return it as a JSON object matching this exact structure:

{
  "title": "string (trip name or destination)",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "label": "short readable label like 'Wed, Dec 10'",
      "theme": "short description of the day like 'Tokyo' or 'Pre-Arrival'",
      "activities": [
        {
          "id": "globally unique string across the entire trip — use 'a1', 'a2', 'a3', ... counting up across ALL days",
          "type": "'activity' or 'transport'",
          "category": "'hotel' for hotel/accommodation check-in/check-out, 'meal' for restaurants/meals/drinks/dining, or null for everything else",
          "time": "HH:MM in 24-hour format (start time), or null if no time specified",
          "timeEnd": "HH:MM in 24-hour format (end time, only for group headers that show a time range like '6:30pm–8:00pm'), or null",
          "title": "activity name",
          "location": "place name or address, or null",
          "description": "short 1-2 sentence description of the activity or place from sub-bullets, or null",
          "hours": "hours of operation extracted from sub-bullets (e.g. '9:00–17:00'), or null",
          "notes": "any remaining details not captured in description or hours, or null",
          "completed": false,
          "parentId": "id of the parent group-header activity if this is a sub-item under a general activity description, or null"
        }
      ]
    }
  ]
}

Rules:
- Include ALL activities, restaurants, hotels, transport, and notable stops
- Convert times to 24-hour HH:MM format
- IDs must be globally unique across the ENTIRE trip (count up: 'a1', 'a2', 'a3', ... never reuse a number)
- Use type "transport" for any transit instruction: driving, flying, taking a train/bus/subway/taxi/shuttle, transfers between locations, boarding a flight, etc.
  - For FLIGHTS (departures, landings, boarding): keep the time in the "time" field. Set the title to a concise action like "Land at HND", "Depart from NRT", "Board JL123 to Tokyo".
  - For GROUND TRANSPORT (taxi, train, bus, walk, drive, shinkansen): set "time" to null. Put the full natural description INCLUDING duration in the title, like "20min taxi from Haneda Airport to The Prince Park Tower Tokyo", "2hr Shinkansen from Tokyo to Kyoto".
- Use type "activity" for everything else (sightseeing, meals, hotels, check-in, etc.)
- Set category "hotel" for any hotel/accommodation check-in, check-out, or overnight stay
- Set category "meal" for any restaurant, meal, drinks, café, dining, or food-related activity
- Set category null for everything else (sightseeing, transport, general activities)
- IMPORTANT: When a general activity header (like "Explore Shinbashi") is followed by bulleted sub-items that are distinct locations or activities, create EACH sub-item as its own separate activity entry with parentId pointing to the header's id. Do NOT fold sub-items into the parent's description field. Each sub-item should be a full activity object with its own id, title, location, description, hours, etc.
- Each activity's "location" must be the SPECIFIC place name suitable for Google Maps search. For child activities under a group header, use the child's own specific place (e.g. "Shizuoka City Museum of Art"), NEVER the parent's location (e.g. NOT "Shizuoka Station").
- For group headers that have a time range (e.g. "6:30pm–8:00pm: Explore Shinbashi"), set time to the start and timeEnd to the end
- Use the description field ONLY for a brief inline note about a single activity (not for listing sub-items). The description must NOT repeat or restate the activity title.
- Extract hours from sub-bullets that mention hours of operation (e.g. "Open 9am–5pm", "Closes at 17:00")
- IMPORTANT: Determine the correct year by looking for it in the document title or body. If not explicitly stated, use the day-of-week hints in the document (e.g. "December 10 (Wednesday)") to identify the correct year — find the year where those dates match those days of the week.
- Preserve draft placeholders exactly as they appear: keep "__" (double underscore), "[spontaneous]", and any bracketed restaurant/time markers like "[Ajino Sapporo Oonishi]" or "[7:30pm]" in the output. These indicate the itinerary is still being planned.
- IMPORTANT: To keep the output compact, OMIT any field whose value is null. Do not include "field": null — just leave that field out entirely.
- Return ONLY the raw JSON object. Do NOT wrap it in a code block or add any text before or after it.`;

function generateId(): string {
  return `trip_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const MONTH_MAP: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};
const DOW_MAP: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

// Scan raw text for "Month Day (Dayname)" patterns and return the year that
// makes those date+day-of-week pairs consistent (e.g. "December 10 (Wednesday)" → 2025).
function detectYearFromText(text: string): number | null {
  const pattern =
    /(\w+)\s+(\d{1,2})\s*[\(,]\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi;
  const currentYear = new Date().getFullYear();
  for (const m of text.matchAll(pattern)) {
    const month = MONTH_MAP[m[1].toLowerCase()];
    const day = parseInt(m[2]);
    const dow = DOW_MAP[m[3].toLowerCase()];
    if (month === undefined || isNaN(day) || dow === undefined) continue;
    for (let year = currentYear - 2; year <= currentYear + 5; year++) {
      const d = new Date(year, month, day);
      if (d.getMonth() === month && d.getDay() === dow) return year;
    }
  }
  return null;
}

export async function parseItineraryText(
  text: string,
  docUrl: string,
  docTitle?: string,
): Promise<Trip> {
  const detectedYear = detectYearFromText(text);
  const yearHint = detectedYear
    ? `IMPORTANT: The dates in this itinerary are from the year ${detectedYear}. Use ${detectedYear} for all dates.\n\n`
    : "";
  const titleHint = docTitle
    ? `IMPORTANT: The title of this document is "${docTitle}". Use this exact string as the "title" field.\n\n`
    : "";

  // Use Sonnet for large itineraries (more output tokens), Haiku for smaller ones
  const isLarge = text.length > 10000;
  const model = isLarge ? "claude-sonnet-4-5-20241022" : "claude-haiku-4-5-20251001";
  const maxTokens = isLarge ? 16384 : 8192;

  const message = await client.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [
      {
        role: "user",
        content: `${yearHint}${titleHint}Parse this travel itinerary into JSON:\n\n${text}`,
      },
    ],
    system: SYSTEM_PROMPT,
  });

  const content = message.content[0];
  console.log("Claude stop_reason:", message.stop_reason);
  if (content.type !== "text") throw new Error("Unexpected response from AI");
  console.log("Claude response length:", content.text.length, "chars");

  try {
    // Extract JSON: handle code blocks (complete or truncated), or raw object
    let jsonText = "";
    const codeBlock = content.text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (codeBlock) {
      jsonText = codeBlock[1].trim();
    } else if (content.text.trimStart().startsWith("```")) {
      // Truncated code block (no closing ```) — strip the opening marker
      jsonText = content.text.replace(/^[\s]*```(?:json)?[\s]*/, "").trim();
    } else {
      jsonText = (content.text.match(/\{[\s\S]*\}/) ?? [""])[0];
    }
    const parsed = JSON.parse(jsonText);
    if (docTitle) parsed.title = docTitle;

    // Post-process: infer type/category, fix child locations
    for (const day of parsed.days ?? []) {
      const actById: Record<string, any> = {};
      for (const act of day.activities ?? []) {
        actById[act.id] = act;
        inferActivityFields(act);
      }
      // If a child's location matches its parent's, use the child's title instead
      for (const act of day.activities ?? []) {
        if (act.parentId && actById[act.parentId]) {
          const parentLoc = (actById[act.parentId].location || '').toLowerCase();
          const childLoc = (act.location || '').toLowerCase();
          if (childLoc && parentLoc && childLoc === parentLoc) {
            act.location = act.title;
          }
        }
        // If no location set on a child, default to its title (it's usually a place name)
        if (act.parentId && !act.location) {
          act.location = act.title;
        }
      }
    }

    return { ...parsed, id: generateId(), docUrl } as Trip;
  } catch {
    throw new Error(`AI returned invalid data: ${content.text.slice(0, 300)}`);
  }
}

const TRANSPORT_KEYWORDS = [
  'take the', 'drive to', 'fly to', 'board the', 'transfer to',
  'taxi to', 'bus to', 'train to', 'shuttle', 'shinkansen',
  'flight to', 'depart', 'walk to', 'head to', 'ride to',
  'bullet train', 'metro to', 'subway to',
];
const HOTEL_KEYWORDS = [
  'hotel', 'check-in', 'check-out', 'checkout', 'check in',
  'accommodation', 'hostel', 'airbnb', 'ryokan', 'inn',
];
const MEAL_KEYWORDS = [
  'breakfast', 'lunch', 'dinner', 'restaurant', 'café', 'cafe',
  'drinks', 'bar', 'dining', 'meal', 'food hall', 'izakaya',
  'ramen', 'sushi', 'brunch',
];

function inferActivityFields(act: any): void {
  const title = (act.title || '').toLowerCase();

  // Infer type
  if (!act.type || act.type === 'activity') {
    if (TRANSPORT_KEYWORDS.some((kw) => title.includes(kw))) {
      act.type = 'transport';
    }
  }
  if (!act.type) act.type = 'activity';

  // Infer category
  if (!act.category) {
    if (HOTEL_KEYWORDS.some((kw) => title.includes(kw))) {
      act.category = 'hotel';
    } else if (MEAL_KEYWORDS.some((kw) => title.includes(kw))) {
      act.category = 'meal';
    } else {
      act.category = null;
    }
  }
}
