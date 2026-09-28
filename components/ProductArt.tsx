import React from 'react';
import Svg, {
  Rect,
  Circle,
  Path,
  G,
  Line,
  Ellipse,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import type { ProductForm } from '../lib/types';

// Original, form-based product illustrations rendered as SVG. These always
// render (offline, no copyright issues) and stand in until an admin uploads a
// real product photo (which then overrides via image_url).

const palette: Record<ProductForm, { bg: string; a: string; b: string }> = {
  tablet: { bg: '#E3F5EF', a: '#0B9E7A', b: '#8FD9C4' },
  capsule: { bg: '#FBEFE3', a: '#F2994A', b: '#F6C79A' },
  syrup: { bg: '#E7EEFB', a: '#4A78F2', b: '#A9C0F6' },
  drops: { bg: '#E9F7FB', a: '#2F9BC9', b: '#A6DCEC' },
  tube: { bg: '#F3E9FB', a: '#9B51E0', b: '#CDA6EC' },
  injection: { bg: '#FBE9EF', a: '#E0503A', b: '#F0A6B4' },
  sachet: { bg: '#F5F1E3', a: '#C9A227', b: '#E4D28F' },
  spray: { bg: '#E9FBF1', a: '#2E9E5B', b: '#A6ECC2' },
  inhaler: { bg: '#EAEFF3', a: '#5C7A99', b: '#AFC2D2' },
  device: { bg: '#EEF1F3', a: '#546170', b: '#B6C0C9' },
  generic: { bg: '#EDF1F0', a: '#0B9E7A', b: '#9FBDB4' },
};

function Art({ form, size }: { form: ProductForm; size: number }) {
  const c = palette[form] ?? palette.generic;
  const s = size;
  // Everything is drawn in a 100x100 viewBox, scaled to `size`.
  return (
    <Svg width={s} height={s} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.6" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" rx="16" fill={c.bg} />
      {renderForm(form, c)}
    </Svg>
  );
}

function renderForm(form: ProductForm, c: { a: string; b: string }) {
  switch (form) {
    case 'tablet':
      // Blister strip with round pills.
      return (
        <G>
          <Rect x="24" y="20" width="52" height="60" rx="8" fill="#FFFFFF" stroke={c.b} strokeWidth="2" />
          {[0, 1, 2].map((row) =>
            [0, 1].map((col) => (
              <Circle
                key={`${row}-${col}`}
                cx={38 + col * 24}
                cy={33 + row * 18}
                r="8"
                fill={c.a}
                opacity={0.85}
              />
            )),
          )}
          <Line x1="50" y1="20" x2="50" y2="80" stroke={c.b} strokeWidth="1.5" />
        </G>
      );
    case 'capsule':
      return (
        <G>
          {[-18, 6].map((dx, i) => (
            <G key={i} rotation={-30} origin="50, 50">
              <Rect x={30 + dx} y="30" width="40" height="18" rx="9" fill={c.b} />
              <Rect x={30 + dx} y="30" width="20" height="18" rx="9" fill={c.a} />
            </G>
          ))}
        </G>
      );
    case 'syrup':
      return (
        <G>
          <Rect x="34" y="16" width="14" height="8" rx="2" fill={c.a} />
          <Rect x="30" y="24" width="40" height="60" rx="8" fill="#FFFFFF" stroke={c.b} strokeWidth="2" />
          <Rect x="30" y="52" width="40" height="32" rx="8" fill={c.a} opacity={0.85} />
          <Rect x="36" y="34" width="28" height="16" rx="3" fill="#F2F6F5" />
        </G>
      );
    case 'drops':
      return (
        <G>
          <Rect x="40" y="16" width="20" height="10" rx="2" fill={c.a} />
          <Rect x="43" y="26" width="14" height="26" rx="4" fill="#FFFFFF" stroke={c.b} strokeWidth="2" />
          <Path d="M50 58 C44 66 44 74 50 78 C56 74 56 66 50 58 Z" fill={c.a} />
        </G>
      );
    case 'tube':
      return (
        <G>
          <Path d="M34 26 L66 26 L62 82 L38 82 Z" fill="#FFFFFF" stroke={c.b} strokeWidth="2" />
          <Rect x="44" y="18" width="12" height="10" rx="2" fill={c.a} />
          <Rect x="38" y="40" width="24" height="20" rx="3" fill={c.a} opacity={0.85} />
        </G>
      );
    case 'injection':
      return (
        <G rotation={35} origin="50, 50">
          <Rect x="30" y="44" width="44" height="12" rx="4" fill="#FFFFFF" stroke={c.b} strokeWidth="2" />
          <Rect x="34" y="46" width="22" height="8" rx="2" fill={c.a} opacity={0.8} />
          <Line x1="74" y1="50" x2="86" y2="50" stroke={c.a} strokeWidth="2" />
          <Rect x="24" y="42" width="6" height="16" rx="2" fill={c.a} />
        </G>
      );
    case 'sachet':
      return (
        <G>
          <Rect x="28" y="24" width="44" height="52" rx="4" fill="#FFFFFF" stroke={c.b} strokeWidth="2" />
          <Path d="M28 24 h44 l-4 6 h-36 Z" fill={c.a} />
          <Rect x="36" y="40" width="28" height="20" rx="3" fill={c.a} opacity={0.8} />
        </G>
      );
    case 'spray':
      return (
        <G>
          <Rect x="42" y="14" width="16" height="12" rx="2" fill={c.a} />
          <Rect x="34" y="26" width="32" height="58" rx="8" fill="#FFFFFF" stroke={c.b} strokeWidth="2" />
          <Circle cx="50" cy="52" r="12" fill={c.a} opacity={0.85} />
        </G>
      );
    case 'inhaler':
      return (
        <G>
          <Rect x="40" y="20" width="20" height="30" rx="4" fill={c.a} />
          <Path d="M40 46 L60 46 L70 76 L34 76 Z" fill="#FFFFFF" stroke={c.b} strokeWidth="2" />
        </G>
      );
    case 'device':
      return (
        <G>
          <Rect x="26" y="30" width="48" height="40" rx="8" fill="#FFFFFF" stroke={c.b} strokeWidth="2" />
          <Rect x="34" y="38" width="32" height="14" rx="3" fill={c.a} opacity={0.85} />
          <Circle cx="42" cy="60" r="4" fill={c.b} />
          <Circle cx="58" cy="60" r="4" fill={c.b} />
        </G>
      );
    default:
      return (
        <G>
          <Rect x="28" y="28" width="44" height="44" rx="8" fill="#FFFFFF" stroke={c.b} strokeWidth="2" />
          <Path d="M50 36 v28 M36 50 h28" stroke={c.a} strokeWidth="6" strokeLinecap="round" />
        </G>
      );
  }
}

export default Art;
