import { normalizeTheme, personalizeTheme, THEME_PRESETS } from './themeEngine';

test('creates stable user-specific theme colors without mutating the preset', () => {
  const first = personalizeTheme(THEME_PRESETS.cyberpunk, 'google-sub-a');
  const sameUser = personalizeTheme(THEME_PRESETS.cyberpunk, 'google-sub-a');
  const otherUser = personalizeTheme(THEME_PRESETS.cyberpunk, 'google-sub-b');

  expect(first).toEqual(sameUser);
  expect(first.primaryColor).not.toBe(otherUser.primaryColor);
  expect(THEME_PRESETS.cyberpunk.primaryColor).toBe('#7c3aed');
});

test('normalizes malformed generated themes to valid UI options', () => {
  const theme = normalizeTheme({ themeName: 'Custom', layout: 'broken', decorations: 'unknown' });
  expect(theme.themeName).toBe('Custom');
  expect(theme.layout).toBe(THEME_PRESETS.freelancer.layout);
  expect(theme.decorations).toBe(THEME_PRESETS.freelancer.decorations);
});

test('keeps built-in anime theme atmosphere options', () => {
  const theme = normalizeTheme(THEME_PRESETS.oceanDragon);
  expect(theme.themeName).toBe('Ocean Dragon');
  expect(theme.decorations).toBe('water-ripples');
});

test('normalizes the generated visual direction grammar', () => {
  const theme = normalizeTheme({
    surfaceStyle: 'hologram',
    panelShape: 'cut-corner',
    motionStyle: 'cinematic',
    contentDensity: 'spacious',
    heroStyle: 'orbital',
    navStyle: 'dock',
    glowStrength: 'high',
  });
  expect(theme.surfaceStyle).toBe('hologram');
  expect(theme.panelShape).toBe('cut-corner');
  expect(theme.motionStyle).toBe('cinematic');
  expect(theme.navStyle).toBe('dock');
});

test('rejects executable or unknown visual direction values', () => {
  const theme = normalizeTheme({ motionStyle: '<script>', navStyle: 'javascript:alert(1)' });
  expect(theme.motionStyle).toBe('float');
  expect(theme.navStyle).toBe('bar');
});
