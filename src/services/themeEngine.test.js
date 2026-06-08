import { personalizeTheme, THEME_PRESETS } from './themeEngine';

test('creates stable user-specific theme colors without mutating the preset', () => {
  const first = personalizeTheme(THEME_PRESETS.cyberpunk, 'google-sub-a');
  const sameUser = personalizeTheme(THEME_PRESETS.cyberpunk, 'google-sub-a');
  const otherUser = personalizeTheme(THEME_PRESETS.cyberpunk, 'google-sub-b');

  expect(first).toEqual(sameUser);
  expect(first.primaryColor).not.toBe(otherUser.primaryColor);
  expect(THEME_PRESETS.cyberpunk.primaryColor).toBe('#7c3aed');
});
