import { formatDynamicModuleContext, loadDynamicModuleContext } from './dynamicModuleContext';

jest.mock('./proxyService', () => ({ getDynamicSheet: jest.fn() }));

test('loads blueprint schemas and latest backend rows for AI context', async () => {
  const { getDynamicSheet } = require('./proxyService');
  getDynamicSheet.mockResolvedValue([{ Description: 'Bed frame', Amount: 1950 }]);
  const modules = await loadDynamicModuleContext('proxy', 'user@example.com', [{
    SectionID: 'commitment_os',
    Name: 'Commitment OS',
    SheetRef: 'commitmentosLog',
    ConfigJSON: JSON.stringify({ subtitle: 'Track commitments', logFields: [{ key: 'Amount', type: 'number' }] }),
  }]);
  expect(modules[0]).toMatchObject({ sectionId: 'commitment_os', purpose: 'Track commitments', rows: [{ Amount: 1950 }] });
  expect(formatDynamicModuleContext(modules)).toContain('Latest synced rows');
});
