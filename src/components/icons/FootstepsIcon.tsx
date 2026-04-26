import React from 'react';
import Svg, { Path, G } from 'react-native-svg';

interface Props {
  size: number;
  color: string;
}

export default function FootstepsIcon({ size, color }: Props) {
  // Each trotter print: two teardrop toe pads + heart-shaped heel pad
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      {/* Left trotter — upper left */}
      <G transform="translate(2, 0) rotate(-15, 8, 6)">
        {/* Left toe */}
        <Path d="M5.5,2 C5,2 4.2,3 4.2,4.2 C4.2,5.2 4.8,5.8 5.5,5.8 C6.2,5.8 6.8,5.2 6.8,4.2 C6.8,3 6,2 5.5,2Z" />
        {/* Right toe */}
        <Path d="M8.5,2 C8,2 7.2,3 7.2,4.2 C7.2,5.2 7.8,5.8 8.5,5.8 C9.2,5.8 9.8,5.2 9.8,4.2 C9.8,3 9,2 8.5,2Z" />
        {/* Heel pad */}
        <Path d="M7,6.5 C5.5,6.5 4.5,7.5 4.8,9 C5,10 5.8,10.8 7,10.8 C8.2,10.8 9,10 9.2,9 C9.5,7.5 8.5,6.5 7,6.5Z" />
      </G>

      {/* Right trotter — lower right */}
      <G transform="translate(14, 10) rotate(15, 5, 6)">
        {/* Left toe */}
        <Path d="M3,2 C2.5,2 1.7,3 1.7,4.2 C1.7,5.2 2.3,5.8 3,5.8 C3.7,5.8 4.3,5.2 4.3,4.2 C4.3,3 3.5,2 3,2Z" />
        {/* Right toe */}
        <Path d="M6,2 C5.5,2 4.7,3 4.7,4.2 C4.7,5.2 5.3,5.8 6,5.8 C6.7,5.8 7.3,5.2 7.3,4.2 C7.3,3 6.5,2 6,2Z" />
        {/* Heel pad */}
        <Path d="M4.5,6.5 C3,6.5 2,7.5 2.3,9 C2.5,10 3.3,10.8 4.5,10.8 C5.7,10.8 6.5,10 6.7,9 C7,7.5 6,6.5 4.5,6.5Z" />
      </G>
    </Svg>
  );
}
