import { extractJsonObject } from './aiJson';

test('extracts marked JSON with trailing model text', () => {
  expect(extractJsonObject(
    'PROFILE_COMPLETE:{"name":"User","goals":[{"name":"Trip"}]} Done!',
    'PROFILE_COMPLETE:'
  )).toEqual({ name: 'User', goals: [{ name: 'Trip' }] });
});

test('extracts JSON from markdown fences', () => {
  expect(extractJsonObject('```json\n{"themeName":"Night"}\n```')).toEqual({ themeName: 'Night' });
});
