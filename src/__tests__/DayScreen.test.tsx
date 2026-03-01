import React from 'react';
import { render } from '@testing-library/react-native';
import DayScreen from '../screens/DayScreen';
import { Day } from '../types';

const mockDay: Day = {
  date: '2024-12-11',
  label: 'Thu, Dec 11',
  theme: 'Tokyo',
  activities: [
    { id: '1', time: '09:00', title: 'Breakfast', location: 'Ginza', notes: null, completed: false },
    { id: '2', time: '11:00', title: 'Explore Harajuku', location: 'Harajuku', notes: null, completed: true },
  ],
};

describe('DayScreen', () => {
  it('renders all activities', () => {
    const { getByText } = render(
      <DayScreen day={mockDay} onToggle={() => {}} />
    );
    expect(getByText('Breakfast')).toBeTruthy();
    expect(getByText('Explore Harajuku')).toBeTruthy();
  });

  it('renders day theme as header', () => {
    const { getByText } = render(
      <DayScreen day={mockDay} onToggle={() => {}} />
    );
    expect(getByText('Tokyo')).toBeTruthy();
  });
});
