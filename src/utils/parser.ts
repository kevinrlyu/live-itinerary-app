import AsyncStorage from '@react-native-async-storage/async-storage';
import { Day, Trip, ChecklistGroup } from "../types";
import { callLLM, LLMConfig } from "./llm";

// System prompt for parsing a SINGLE day's text into a day object.
// Kept as a constant so prompt caching works across calls.
const DAY_SYSTEM_PROMPT = `You are a travel itinerary parser. Given raw text for ONE DAY of a travel itinerary, extract all information and return it as a JSON object matching this exact structure:

{
  "date": "YYYY-MM-DD",
  "label": "short readable label like 'Wed, Dec 10'",
  "theme": "short description of the day like 'Tokyo' or 'Pre-Arrival'",
  "activities": [
    {
      "id": "use 'a1', 'a2', 'a3', ... counting up within this day",
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

Rules:
- Include ALL activities, restaurants, hotels, transport, and notable stops
- IMPORTANT: Preserve the exact order of activities as they appear in the document. Do NOT reorder, sort, or rearrange activities within a day.
- Convert times to 24-hour HH:MM format
- Use type "transport" for any transit instruction: driving, flying, taking a train/bus/subway/taxi/shuttle, transfers between locations, boarding a flight, etc.
  - For FLIGHTS (departures, landings, boarding): keep the time in the "time" field. Set the title to a concise action like "Land at HND", "Depart from NRT", "Board JL123 to Tokyo".
  - For GROUND TRANSPORT (taxi, train, bus, walk, drive, shinkansen): set "time" to null. Put the full natural description INCLUDING duration in the title, like "20min taxi from Haneda Airport to The Prince Park Tower Tokyo", "2hr Shinkansen from Tokyo to Kyoto".
- Use type "activity" for everything else (sightseeing, meals, hotels, check-in, etc.)
- Set category "hotel" for any hotel/accommodation check-in, check-out, or overnight stay
- For hotel check-ins: if the time is described as "room ready by X" or "check-in from X", do NOT put that time in the "time" field. Instead, include "Room ready by X:XXam/pm" as the first line of the "notes" field. The "time" field should only be set if there is a specific arrival time.
- Set category "meal" for any restaurant, meal, drinks, café, dining, or food-related activity
- Set category null for everything else (sightseeing, transport, general activities)
- IMPORTANT: When a general activity header (like "Explore Shinbashi") is followed by bulleted sub-items that are distinct locations or activities, create EACH sub-item as its own separate activity entry with parentId pointing to the header's id. Do NOT fold sub-items into the parent's description field. Each sub-item should be a full activity object with its own id, title, location, description, hours, etc.
- When a hotel/accommodation activity (like "Relax at Hotel", "Hotel morning", "Free time at resort") is followed by sub-activities at the same location (breakfast, pool, spa, onsen, checkout, etc.), these sub-activities should be children with parentId set to the hotel activity's id.
- Each activity's "location" must be the SPECIFIC place name suitable for a maps search. If adding geographic context (city, district), keep it in the same language as the place name (e.g. "洪崖洞民宿风貌区, 重庆" not "洪崖洞民宿风貌区, Chongqing"). For child activities under a group header, use the child's own specific place (e.g. "Shizuoka City Museum of Art"), NEVER the parent's location (e.g. NOT "Shizuoka Station").
- For group headers that have a time range (e.g. "6:30pm–8:00pm: Explore Shinbashi"), set time to the start and timeEnd to the end
- Use the description field ONLY for a brief inline note about a single activity (not for listing sub-items). The description must NOT repeat or restate the activity title.
- Extract hours of operation AND any related info (closures, days closed, seasonal hours) into the "hours" field. For example, "Hours: 9:00–17:00, Closed Mondays" should ALL go in the "hours" field, not split between "hours" and "notes". Everything after "Hours:" on the same bullet or line belongs in "hours".
- When an activity has multiple sub-bullet details (e.g. stay duration, cancellation policy, cost, tee time, fees), put each detail on its own line in the "notes" field, separated by newline characters (\\n). Do NOT concatenate them into one line.
- Preserve draft placeholders exactly as they appear: keep "__" (double underscore), "[spontaneous]", and any bracketed restaurant/time markers like "[Ajino Sapporo Oonishi]" or "[7:30pm]" in the output. These indicate the itinerary is still being planned.
- IMPORTANT: To keep the output compact, OMIT any field whose value is null. Do not include "field": null — just leave that field out entirely.
- Return ONLY the raw JSON object. Do NOT wrap it in a code block or add any text before or after it.`;

function generateId(): string {
  return `trip_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const MONTH_MAP: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};
const DOW_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

// Scan raw text for "Month Day (Dayname)" patterns and return the year that
// makes those date+day-of-week pairs consistent.
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

// Keywords that signal the start of a checklist section (case-insensitive).
// Used to detect lists appended before or after the day-by-day itinerary.
const CHECKLIST_SECTION_KEYWORDS = [
  // Food / culinary
  'local cuisine', 'local specialties', 'local food',
  'culinary', 'food guide', 'food list',
  'what to eat', 'what to try', 'must.?eat', 'must.?try',
  'regional (dishes|specialties|cuisine|food)',
  'food recommendations', 'dining guide',
  'dishes to try', 'foods to try',
  // Packing / shopping / general
  'packing list', 'shopping list', 'to.?do list',
  'checklist', 'things to (bring|pack|buy|do|remember)',
  'preparation', 'before (the|you|your) trip',
  'essentials', 'supplies',
];
const CHECKLIST_SECTION_PATTERN = new RegExp(
  `^\\s*(?:#{1,3}\\s*)?(?:${CHECKLIST_SECTION_KEYWORDS.join('|')})`,
  'im'
);

// Split raw document text into per-day chunks.
// Looks for day header patterns like "December 10 (Wednesday)" or "Day 1 — December 10".
// Returns { preamble, dayChunks, postamble } where preamble is text before the first day
// header and postamble is a checklist section found after the last day.
function splitTextByDay(text: string): { preamble: string; dayChunks: string[]; postamble: string } {
  // Match lines that start a new day: "Month Day" possibly followed by day-of-week
  const dayHeaderPattern = new RegExp(
    `^(?:day\\s+\\d+[^\\n]*)?\\s*(?:${MONTH_NAMES.join('|')})\\s+\\d{1,2}`,
    'gim'
  );

  const matches: { index: number }[] = [];
  let match;
  while ((match = dayHeaderPattern.exec(text)) !== null) {
    matches.push({ index: match.index });
  }

  if (matches.length <= 1) {
    // Can't split reliably — return the whole text
    return { preamble: '', dayChunks: [text], postamble: '' };
  }

  const preamble = matches[0].index > 0
    ? text.slice(0, matches[0].index).trim()
    : '';

  const dayChunks: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const chunk = text.slice(start, end).trim();
    if (chunk) dayChunks.push(chunk);
  }

  // Check if the last day chunk contains a checklist section after the itinerary content
  let postamble = '';
  if (dayChunks.length > 0) {
    const lastChunk = dayChunks[dayChunks.length - 1];
    const checklistMatch = CHECKLIST_SECTION_PATTERN.exec(lastChunk);
    if (checklistMatch) {
      // Split: everything before the keyword stays with the day, everything from the keyword becomes the postamble
      const dayPart = lastChunk.slice(0, checklistMatch.index).trim();
      postamble = lastChunk.slice(checklistMatch.index).trim();
      dayChunks[dayChunks.length - 1] = dayPart;
    }
  }

  return { preamble, dayChunks, postamble };
}

// Simple hash for cache comparison
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/** Extract JSON from a response that may be wrapped in code blocks or extra text. */
function extractJSON(text: string): string {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlock) return codeBlock[1].trim();
  if (text.trimStart().startsWith("```")) {
    return text.replace(/^[\s]*```(?:json)?[\s]*/, "").trim();
  }
  return (text.match(/\{[\s\S]*\}/) ?? [""])[0];
}

// Parse a single day's text chunk into a Day object
async function parseSingleDay(
  dayText: string,
  yearHint: string,
  llmConfig: LLMConfig,
): Promise<Day> {
  const responseText = await callLLM({
    config: llmConfig,
    systemPrompt: DAY_SYSTEM_PROMPT,
    userMessage: `${yearHint}Parse this single day of a travel itinerary into JSON:\n\n${dayText}`,
    maxTokens: 8192,
  });

  const jsonText = extractJSON(responseText);
  const parsed = JSON.parse(jsonText);

  // Post-process: infer type/category, fix child locations
  const actById: Record<string, any> = {};
  for (const act of parsed.activities ?? []) {
    actById[act.id] = act;
    inferActivityFields(act);
  }
  for (const act of parsed.activities ?? []) {
    if (act.parentId && actById[act.parentId]) {
      const parentLoc = (actById[act.parentId].location || '').toLowerCase();
      const childLoc = (act.location || '').toLowerCase();
      if (childLoc && parentLoc && childLoc === parentLoc) {
        act.location = act.title;
      }
    }
    if (act.parentId && !act.location) {
      act.location = act.title;
    }
  }

  return parsed as Day;
}

// Cache storage for per-day text hashes and parsed results
const dayCacheKey = (tripId: string) => `day_cache_${tripId}`;

interface DayCache {
  [hash: string]: Day;
}

async function loadDayCache(tripId: string): Promise<DayCache> {
  const json = await AsyncStorage.getItem(dayCacheKey(tripId));
  return json ? JSON.parse(json) : {};
}

async function saveDayCache(tripId: string, cache: DayCache): Promise<void> {
  await AsyncStorage.setItem(dayCacheKey(tripId), JSON.stringify(cache));
}

export async function parseItineraryText(
  text: string,
  docUrl: string,
  docTitle?: string,
  onProgress?: (status: string) => void,
  existingTripId?: string,
  llmConfig?: LLMConfig,
): Promise<Trip> {
  if (!llmConfig) throw new Error('No AI model configured. Please select a provider and enter an API key.');

  const config = llmConfig;
  const detectedYear = detectYearFromText(text);
  const yearHint = detectedYear
    ? `IMPORTANT: The dates in this itinerary are from the year ${detectedYear}. Use ${detectedYear} for all dates.\n\n`
    : "";

  const { preamble, dayChunks, postamble } = splitTextByDay(text);

  // If we couldn't split into multiple days, fall back to single-call parsing
  if (dayChunks.length <= 1) {
    onProgress?.("Parsing itinerary...");
    return parseFull(text, docUrl, docTitle, yearHint, config, onProgress);
  }

  // Start with empty cache on re-import to ensure latest prompt is used
  const cache: DayCache = {};
  const newCache: DayCache = {};

  onProgress?.(`Parsing ${dayChunks.length} days...`);

  // Parse days with limited concurrency (3 at a time) and retry logic
  const MAX_CONCURRENT = 3;
  const MAX_RETRIES = 2;
  const days: Day[] = new Array(dayChunks.length);

  let nextIndex = 0;
  const parseWithRetry = async () => {
    while (nextIndex < dayChunks.length) {
      const i = nextIndex++;
      const chunk = dayChunks[i];
      const hash = simpleHash(chunk);

      if (cache[hash]) {
        newCache[hash] = cache[hash];
        days[i] = cache[hash];
        onProgress?.(`Day ${i + 1} of ${dayChunks.length} (cached)`);
        continue;
      }

      let lastErr: Error | null = null;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            await new Promise((r) => setTimeout(r, 1000 * attempt));
            onProgress?.(`Retrying day ${i + 1}...`);
          }
          const day = await parseSingleDay(chunk, yearHint, config);
          newCache[hash] = day;
          days[i] = day;
          onProgress?.(`Parsed day ${i + 1} of ${dayChunks.length}`);
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err as Error;
        }
      }
      if (lastErr) {
        throw new Error(`Failed to parse day ${i + 1}: ${lastErr.message}`);
      }
    }
  };

  const workers = Array.from({ length: Math.min(MAX_CONCURRENT, dayChunks.length) }, () => parseWithRetry());
  await Promise.all(workers);

  // Renumber activity IDs to be globally unique across all days
  let idCounter = 1;
  for (const day of days) {
    const idMap: Record<string, string> = {};
    for (const act of day.activities ?? []) {
      const newId = `a${idCounter++}`;
      idMap[act.id] = newId;
      act.id = newId;
    }
    // Fix parentId references
    for (const act of day.activities ?? []) {
      if (act.parentId && idMap[act.parentId]) {
        act.parentId = idMap[act.parentId];
      }
    }
  }

  // Detect title from doc or first day
  const title = docTitle || "My Trip";

  const tripId = existingTripId || generateId();

  // Save the new cache
  await saveDayCache(tripId, newCache);

  // Extract checklists from preamble and/or postamble if present
  let checklists: ChecklistGroup[] | undefined;
  const checklistText = [preamble, postamble].filter((t) => t && t.length > 50).join('\n\n');
  if (checklistText) {
    try {
      onProgress?.("Extracting checklists...");
      checklists = await parseChecklists(checklistText, config);
    } catch {
      // Non-critical — skip if extraction fails
    }
  }

  onProgress?.("Done!");

  return { id: tripId, docUrl, title, days, defaultCurrency: 'USD', checklists } as Trip;
}

// Fallback: parse entire document in one call (for docs that can't be split by day)
async function parseFull(
  text: string,
  docUrl: string,
  docTitle: string | undefined,
  yearHint: string,
  llmConfig: LLMConfig,
  onProgress?: (status: string) => void,
): Promise<Trip> {
  const titleHint = docTitle
    ? `IMPORTANT: The title of this document is "${docTitle}". Use this exact string as the "title" field.\n\n`
    : "";

  const isLarge = text.length > 10000;
  const maxTokens = isLarge ? 32768 : 8192;

  // Full-doc system prompt (includes title and days[] wrapper)
  const fullSystemPrompt = DAY_SYSTEM_PROMPT.replace(
    'Given raw text for ONE DAY of a travel itinerary, extract all information and return it as a JSON object matching this exact structure:\n\n{\n  "date"',
    'Given raw text from a travel itinerary document, extract all information and return it as a JSON object matching this exact structure:\n\n{\n  "title": "string (trip name or destination)",\n  "days": [\n    {\n      "date"'
  ).replace(
    '  ]\n}\n\nRules:',
    '    ]\n    }\n  ]\n}\n\nRules:\n- IDs must be globally unique across the ENTIRE trip (count up: \'a1\', \'a2\', \'a3\', ... never reuse a number)\n- IMPORTANT: Determine the correct year by looking for it in the document title or body. If not explicitly stated, use the day-of-week hints in the document (e.g. "December 10 (Wednesday)") to identify the correct year — find the year where those dates match those days of the week.'
  );

  onProgress?.("Parsing itinerary...");

  const responseText = await callLLM({
    config: llmConfig,
    systemPrompt: fullSystemPrompt,
    userMessage: `${yearHint}${titleHint}Parse this travel itinerary into JSON:\n\n${text}`,
    maxTokens,
  });

  try {
    const jsonText = extractJSON(responseText);
    const parsed = JSON.parse(jsonText);
    if (docTitle) parsed.title = docTitle;

    for (const day of parsed.days ?? []) {
      const actById: Record<string, any> = {};
      for (const act of day.activities ?? []) {
        actById[act.id] = act;
        inferActivityFields(act);
      }
      for (const act of day.activities ?? []) {
        if (act.parentId && actById[act.parentId]) {
          const parentLoc = (actById[act.parentId].location || '').toLowerCase();
          const childLoc = (act.location || '').toLowerCase();
          if (childLoc && parentLoc && childLoc === parentLoc) {
            act.location = act.title;
          }
        }
        if (act.parentId && !act.location) {
          act.location = act.title;
        }
      }
    }

    return { ...parsed, id: generateId(), docUrl, defaultCurrency: 'USD' } as Trip;
  } catch {
    throw new Error(`AI returned invalid data: ${responseText.slice(0, 300)}`);
  }
}

// Extract checklists from document preamble/postamble
async function parseChecklists(text: string, llmConfig: LLMConfig): Promise<ChecklistGroup[]> {
  const checklistSystemPrompt = `You extract checklists and grouped lists from travel itinerary documents. Return a JSON array of groups with their items.

Format:
[
  {
    "title": "Clean, readable section title",
    "items": [
      { "name": "Item name (description in parentheses if present)" },
      { "name": "Another item" }
    ]
  }
]

Rules:
- For the "title": if the original section heading is already clean and intentional (e.g. "Aomori's Culinary Specialties"), keep it as-is. If it is messy, informal, or unclear (e.g. "STUFF TO BUY!!!", "food maybe?"), lightly clean it up into a concise, readable title that preserves the user's intent.
- IMPORTANT: Copy each item name EXACTLY as it appears in the original text — do not paraphrase, translate, or reword
- If an item has a description in parentheses, include the full text with parentheses verbatim in the "name" field
- Include all listed items: food, drinks, places, things to pack, things to buy, tasks, etc.
- If no list content is found, return []
- Return ONLY the raw JSON array. No code blocks, no extra text.`;

  const responseText = await callLLM({
    config: llmConfig,
    systemPrompt: checklistSystemPrompt,
    userMessage: `Extract any checklists or grouped lists from this text. This may include food/culinary lists, packing lists, shopping lists, to-do lists, or any other grouped items. If there are no lists, return an empty array [].\n\n${text}`,
    maxTokens: 4096,
  });

  let jsonText = responseText.trim();
  const codeBlock = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlock) jsonText = codeBlock[1].trim();
  const match = jsonText.match(/\[[\s\S]*\]/);
  if (match) jsonText = match[0];

  const parsed = JSON.parse(jsonText);
  if (!Array.isArray(parsed)) return [];

  return parsed.map((r: any) => ({
    title: r.title || r.region || 'General',
    items: (r.items || [])
      .map((item: any) => ({
        name: typeof item === 'string' ? item : (item.name || ''),
        checked: false,
      }))
      .filter((item: any) => item.name),
  }));
}

const TRANSPORT_KEYWORDS = [
  'take the', 'drive to', 'fly to', 'board the', 'transfer to',
  'taxi to', 'bus to', 'train to', 'shuttle', 'shinkansen',
  'flight to', 'depart', 'walk to', 'head to', 'ride to',
  'bullet train', 'metro to', 'subway to',
];
const HOTEL_KEYWORDS = [
  'check-in', 'check-out', 'checkout', 'check in',
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
