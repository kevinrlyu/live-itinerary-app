import { parseItineraryText } from '../utils/parser';

// Mock the Anthropic SDK so tests don't make real API calls
jest.mock('@anthropic-ai/sdk', () => {
  const mockCreate = jest.fn().mockResolvedValue({
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          title: 'Tokyo Trip',
          days: [
            {
              date: '2024-12-10',
              label: 'Wed, Dec 10',
              theme: 'Pre-Arrival',
              activities: [
                {
                  id: '1',
                  time: '19:25',
                  title: 'Arrive at Tokyo Haneda',
                  location: 'Tokyo Haneda Airport',
                  notes: 'Flight arrives 7:25pm',
                  completed: false,
                },
              ],
            },
          ],
        }),
      },
    ],
  });

  const MockAnthropic = jest.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
    },
  }));

  return {
    __esModule: true,
    default: MockAnthropic,
  };
});

describe('parseItineraryText', () => {
  it('returns a Trip object with days and activities', async () => {
    const trip = await parseItineraryText('some itinerary text');
    expect(trip.title).toBe('Tokyo Trip');
    expect(trip.days).toHaveLength(1);
    expect(trip.days[0].activities).toHaveLength(1);
    expect(trip.days[0].activities[0].time).toBe('19:25');
  });
});
