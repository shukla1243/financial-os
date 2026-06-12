import { validateProposal } from './evolutionEngine';

test('rejects low-confidence or unsafe AI module proposals', () => {
  expect(validateProposal({ decision: 'create', confidence: 0.4 }, [])).toBeNull();
  expect(validateProposal({
    decision: 'create',
    confidence: 0.9,
    sectionName: 'Bad App',
    fields: [{ key: '<script>', label: 'Bad', type: 'code' }],
    metrics: [],
  }, [])).toBeNull();
});

test('accepts a bounded reusable module schema', () => {
  expect(validateProposal({
    decision: 'create',
    confidence: 0.9,
    sectionName: 'Commitment OS',
    fields: [{ key: 'Amount', label: 'Amount', type: 'number' }, { key: 'Note', label: 'Note', type: 'text' }],
    metrics: [{ label: 'TOTAL', field: 'Amount', type: 'sum' }],
  }, [])).toMatchObject({ sectionId: 'commitment_os', sheetRef: 'commitmentosLog' });
});
