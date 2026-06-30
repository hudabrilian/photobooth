import { ThemeConfig } from './themes';

export type RuleInput = {
  numFaces: number;
  smileScore: number;
  isCouple: boolean;
};

export function evaluateRules(input: RuleInput, baseTheme: ThemeConfig): ThemeConfig {
  const theme = { ...baseTheme, elements: [...baseTheme.elements] };

  if (input.smileScore > 0.8) {
    if (!theme.elements.includes('hearts/heart1')) {
      theme.elements.push('hearts/heart1');
    }
    theme.max_elements = Math.min(theme.max_elements + 4, 25);
  }

  if (input.numFaces >= 4) {
    if (!theme.elements.includes('stars/star1')) {
      theme.elements.push('stars/star1');
    }
    if (!theme.elements.includes('sparkle/sparkle1')) {
      theme.elements.push('sparkle/sparkle1');
    }
    theme.max_elements = Math.min(theme.max_elements + 6, 30);
  }

  if (input.numFaces === 2 || input.isCouple) {
    if (!theme.elements.includes('ribbons/ribbon1')) {
      theme.elements.push('ribbons/ribbon1');
    }
    if (!theme.elements.includes('hearts/heart1')) {
      theme.elements.push('hearts/heart1');
    }
    theme.max_elements = Math.min(theme.max_elements + 4, 22);
  }

  return theme;
}

export function autoSelectTheme(input: RuleInput): string {
  if (input.numFaces >= 4) {
    return 'birthday';
  }
  if (input.numFaces === 2) {
    return 'korean';
  }
  if (input.smileScore > 0.7) {
    return 'korean';
  }
  return 'retro';
}
