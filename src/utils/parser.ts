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
- Use type "transport" for any transit instruction: driving, flying, taking a train/bus/subway/taxi/shuttle, transfers between locations, boarding a flight, etc. These are typically phrased like "Take the X to Y", "Drive to Z", "Board the X flight", "Transfer to hotel", etc.
- Use type "activity" for everything else (sightseeing, meals, hotels, check-in, etc.)
- Set category "hotel" for any hotel/accommodation check-in, check-out, or overnight stay
- Set category "meal" for any restaurant, meal, drinks, café, dining, or food-related activity
- Set category null for everything else (sightseeing, transport, general activities)
- IMPORTANT: When a general activity header (like "Explore Shinbashi") is followed by bulleted sub-items that are distinct locations or activities, create EACH sub-item as its own separate activity entry with parentId pointing to the header's id. Do NOT fold sub-items into the parent's description field. Each sub-item should be a full activity object with its own id, title, location, description, hours, etc.
- For group headers that have a time range (e.g. "6:30pm–8:00pm: Explore Shinbashi"), set time to the start and timeEnd to the end
- Use the description field ONLY for a brief inline note about a single activity (not for listing sub-items)
- Extract hours from sub-bullets that mention hours of operation (e.g. "Open 9am–5pm", "Closes at 17:00")
- IMPORTANT: Determine the correct year by looking for it in the document title or body. If not explicitly stated, use the day-of-week hints in the document (e.g. "December 10 (Wednesday)") to identify the correct year — find the year where those dates match those days of the week.
- Return ONLY the JSON object, no other text`;

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

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: `${yearHint}${titleHint}Parse this travel itinerary into JSON:\n\n${text}`,
      },
    ],
    system: SYSTEM_PROMPT,
  });

  console.log("Anthropic client request");
  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response from AI");

  try {
    // Extract JSON from a code block if present, otherwise find the raw object
    const codeBlock = content.text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const jsonText = codeBlock
      ? codeBlock[1].trim()
      : (content.text.match(/\{[\s\S]*\}/) ?? [""])[0];
    const parsed = JSON.parse(jsonText);
    if (docTitle) parsed.title = docTitle;
    return { ...parsed, id: generateId(), docUrl } as Trip;
  } catch {
    throw new Error(`AI returned invalid data: ${content.text.slice(0, 300)}`);
  }
}
