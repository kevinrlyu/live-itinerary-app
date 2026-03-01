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
- If a date cannot be determined, make a reasonable guess from context
- Return ONLY the JSON object, no other text`;

export async function parseItineraryText(text: string): Promise<Trip> {
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
    return JSON.parse(cleaned) as Trip;
  } catch {
    throw new Error(`AI returned invalid data: ${content.text.slice(0, 300)}`);
  }
}
