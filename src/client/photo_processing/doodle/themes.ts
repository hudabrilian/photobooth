export type ThemeConfig = {
  id: string;
  name: string;
  elements: string[];
  max_elements: number;
  outline: boolean;
  blush: boolean;
};

export class ThemeManager {
  private static themes: ThemeConfig[] = [];
  private static loaded = false;

  public static async loadThemes(): Promise<ThemeConfig[]> {
    if (this.loaded) return this.themes;

    try {
      const response = await fetch('/photo_processing/themes.json');
      if (response.ok) {
        const data = await response.json();
        this.themes = data.themes || [];
        this.loaded = true;
      }
    } catch (err) {
      console.warn('Failed to fetch themes.json, using fallback configuration', err);
    }

    if (this.themes.length === 0) {
      this.themes = [
        {
          id: 'korean',
          name: 'Korean Pastel',
          elements: ['hearts/heart1', 'sparkle/sparkle1', 'flowers/flower1', 'ribbons/ribbon1'],
          max_elements: 18,
          outline: true,
          blush: true
        },
        {
          id: 'retro',
          name: 'Retro Pop',
          elements: ['stars/star1', 'sparkle/sparkle1', 'clouds/cloud1'],
          max_elements: 12,
          outline: true,
          blush: false
        },
        {
          id: 'birthday',
          name: 'Birthday Party',
          elements: ['stars/star1', 'sparkle/sparkle1', 'text/hbd'],
          max_elements: 15,
          outline: true,
          blush: true
        },
        {
          id: 'summer',
          name: 'Summer Vibe',
          elements: ['flowers/flower1', 'clouds/cloud1'],
          max_elements: 10,
          outline: false,
          blush: true
        },
        {
          id: 'christmas',
          name: 'Christmas Joy',
          elements: ['stars/star1', 'sparkle/sparkle1'],
          max_elements: 14,
          outline: true,
          blush: true
        }
      ];
      this.loaded = true;
    }

    return this.themes;
  }

  public static getTheme(id: string): ThemeConfig | undefined {
    return this.themes.find((t) => t.id === id);
  }
}
