import React from 'react';
import Svg, { G, Path } from 'react-native-svg';

interface Props {
  size: number;
  color: string;
}

export default function WalkIcon({ size, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="55 8 155 175">
      {/* Head */}
      <G transform="matrix(25.882 0 0 -25.882 132.75 45.76)">
        <Path
          d="m0,0c.283-.023.529.188.553.471s-.19.529-.473.552-.529-.189-.551-.472 .188-.53.471-.551"
          fill={color}
          stroke={color}
          strokeWidth={0.08}
        />
      </G>
      {/* Body, arms, legs — single filled shape, with stroke for thickness */}
      <G transform="matrix(25.882 0 0 -25.882 121.47 51.218)">
        <Path
          d="m0,0c.102.07.225.117.361.105 .176-.013.321-.123.409-.255l.517-1.028 .707-.486c.061-.047.098-.121.09-.203-.01-.127-.121-.223-.248-.211-.039.002-.07.017-.106.033l-.771.531c-.023.02-.043.043-.059.069l-.193.384-.232-1.023 .91-1.076c.021-.033.035-.072.043-.111l.246-1.299c-.002-.03.002-.047 0-.071-.014-.193-.182-.334-.373-.32-.158.014-.276.131-.313.275l-.232,1.217-.74.811-.172-.789c-.006-.037-.055-.116-.069-.147l-.711-1.197c-.07-.109-.189-.18-.324-.168-.193.014-.336.182-.32.373 .004.055.027.111.047.15l.66,1.108 .551,2.439-.36-.291-.191-.869c-.025-.111-.127-.203-.246-.193-.129.01-.223.121-.213.25 0,.01.002.019.004.031l.226,1.014c.014.043.038.082.071.111l1.031.836z"
          fill={color}
          stroke={color}
          strokeWidth={0.12}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}
