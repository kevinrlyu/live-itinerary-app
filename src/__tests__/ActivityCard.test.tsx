import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ActivityCard from '../components/ActivityCard';
import { Activity } from '../types';

const mockActivity: Activity = {
  id: '1',
  time: '10:00',
  title: 'Ueno Park',
  location: 'Ueno, Tokyo',
  notes: null,
  completed: false,
};

describe('ActivityCard', () => {
  it('renders activity title and time', () => {
    const { getByText } = render(
      <ActivityCard activity={mockActivity} isCurrent={false} onToggle={() => {}} />
    );
    expect(getByText('Ueno Park')).toBeTruthy();
    expect(getByText('10:00')).toBeTruthy();
  });

  it('calls onToggle when checkmark is pressed', () => {
    const onToggle = jest.fn();
    const { getByTestId } = render(
      <ActivityCard activity={mockActivity} isCurrent={false} onToggle={onToggle} />
    );
    fireEvent.press(getByTestId('toggle-button'));
    expect(onToggle).toHaveBeenCalledWith('1');
  });

  it('shows Directions button when location is present', () => {
    const { getByText } = render(
      <ActivityCard activity={mockActivity} isCurrent={false} onToggle={() => {}} />
    );
    expect(getByText('Directions')).toBeTruthy();
  });
});
