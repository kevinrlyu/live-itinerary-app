import Anthropic from '@anthropic-ai/sdk';
import { Trip } from '../types';

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
          "id": "unique string like '1', '2', etc.",
          "time": "HH:MM in 24-hour format, or null if no time specified",
          "title": "activity name",
          "location": "place name or address, or null",
          "notes": "any extra detail, or null",
          "completed": false
        }
      ]
    }
  ]
}

Rules:
- Include ALL activities, restaurants, hotels, transport, and notable stops
- Convert times to 24-hour HH:MM format
- IMPORTANT: Determine the correct year by looking for it in the document title or body. If not explicitly stated, use the day-of-week hints in the document (e.g. "December 10 (Wednesday)") to identify the correct year — find the year where those dates match those days of the week.
- Return ONLY the JSON object, no other text`;

function generateId(): string {
  return `trip_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const DAY_NAME_TO_INDEX: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

// If Claude guessed the wrong year, correct it by matching the day-of-week
// from the label (e.g. "Wed, Dec 10") against the parsed date.
function correctYear(days: Trip['days']): Trip['days'] {
  for (const day of days) {
    const labelWord = day.label.split(/[,\s]/)[0].toLowerCase().slice(0, 3);
    const expectedDow = DAY_NAME_TO_INDEX[labelWord];
    if (expectedDow === undefined) continue;

    const [yyyy, mm, dd] = day.date.split('-').map(Number);
    const actual = new Date(`${day.date}T12:00:00`);
    if (actual.getDay() === expectedDow) continue; // already correct

    // Search ±5 years from the parsed year for a match
    for (let delta = -5; delta <= 5; delta++) {
      if (delta === 0) continue;
      const candidate = `${yyyy + delta}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
      if (new Date(`${candidate}T12:00:00`).getDay() === expectedDow) {
        day.date = candidate;
        break;
      }
    }
  }
  return days;
}

export async function parseItineraryText(text: string, docUrl: string): Promise<Trip> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Parse this travel itinerary into JSON:\n\n${text}`,
      },
    ],
    system: SYSTEM_PROMPT,
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response from AI');

  try {
    const cleaned = content.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    parsed.days = correctYear(parsed.days ?? []);
    return { ...parsed, id: generateId(), docUrl } as Trip;
  } catch {
    throw new Error(`AI returned invalid data: ${content.text.slice(0, 300)}`);
  }
}
