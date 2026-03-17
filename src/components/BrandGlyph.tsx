import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type GlyphVariant = 'core' | 'create' | 'join' | 'info';

type Props = {
  variant: GlyphVariant;
  size?: number;
};

const iconNameMap: Record<GlyphVariant, keyof typeof Ionicons.glyphMap> = {
  core: 'layers',
  create: 'add',
  join: 'link',
  info: 'sparkles',
};

const iconColorMap: Record<GlyphVariant, string> = {
  core: '#0A4FD9',
  create: '#0A4FD9',
  join: '#0A4FD9',
  info: '#1976D2',
};

export default function BrandGlyph({ variant, size = 64 }: Props) {
  const iconSize = Math.round(size * 0.48);

  return (
    <View style={[styles.outer, { width: size, height: size, borderRadius: size / 2 }]}> 
      <View style={[styles.inner, { borderRadius: size / 2 - 6 }]}> 
        <Ionicons name={iconNameMap[variant]} size={iconSize} color={iconColorMap[variant]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: '#0A4FD9',
    padding: 6,
    shadowColor: '#0A4FD9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  inner: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
