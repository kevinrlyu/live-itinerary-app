import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface Props {
  size: number;
  height?: number;
  color: string;
}

// Receipt/bill icon — outline with internal lines
export default function ReceiptIcon({ size, height, color }: Props) {
  const h = height ?? size;
  return (
    <Svg width={size} height={h} viewBox="2.5 0.5 18 22.5" fill="none">
      {/* Receipt outline with zigzag bottom */}
      <Path
        d="M5 1.5 C4.2 1.5 3.5 2.2 3.5 3 L3.5 22 L5.5 20.5 L7.5 22 L9.5 20.5 L11.5 22 L13.5 20.5 L15.5 22 L17.5 20.5 L19.5 22 L19.5 3 C19.5 2.2 18.8 1.5 18 1.5 Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Text lines */}
      <Path d="M7 6.5 L16 6.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M7 10 L16 10" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M7 13.5 L13 13.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </Svg>
  );
}
