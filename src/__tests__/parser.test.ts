import { parseItineraryText } from '../utils/parser';

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              title: 'Tokyo Trip',
              days: [
                {
                  date: '2025-12-10',
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
      }),
    },
  })),
}));

describe('parseItineraryText', () => {
  it('returns a Trip with id and docUrl set', async () => {
    const docUrl = 'https://docs.google.com/document/d/abc/edit';
    const trip = await parseItineraryText('some itinerary text', docUrl);
    expect(trip.title).toBe('Tokyo Trip');
    expect(trip.id).toBeTruthy();
    expect(trip.docUrl).toBe(docUrl);
    expect(trip.days[0].activities[0].time).toBe('19:25');
  });
});
