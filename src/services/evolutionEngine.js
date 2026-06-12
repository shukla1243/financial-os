import { callAI } from './aiService';
import { extractJsonObject } from './aiJson';
import { createDynamicSheet, appendDynamicRow, writeToBlueprint } from './proxyService';

const SAFE_FIELD_TYPES = new Set(['text', 'number', 'date']);
const SAFE_METRIC_TYPES = new Set(['sum', 'avg', 'count', 'unique']);

const slug = value => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 32);

function deterministicOpportunity(expense) {
  const text = `${expense.description || ''} ${expense.note || ''} ${expense.mode || ''}`.toLowerCase();
  if (/\bemi\b|\binstallment\b|\binterest rate\b/.test(text)) {
    return {
      decision: 'create',
      confidence: 0.92,
      sectionName: 'Commitment OS',
      icon: '📆',
      purpose: 'Track financed purchases, installments, and remaining commitments.',
      reasoning: 'This entry includes a multi-month financial commitment, which benefits from progress and cost tracking.',
      swot: {
        strength: 'Makes recurring debt obligations visible.',
        weakness: 'Needs future installment updates.',
        opportunity: 'Can reveal total financing cost and payoff progress.',
        threat: 'Incomplete terms can make projections approximate.',
      },
      fields: [
        { key: 'Description', label: 'Commitment', type: 'text' },
        { key: 'Amount', label: 'Installment Amount', type: 'number' },
        { key: 'Mode', label: 'Payment Mode', type: 'text' },
        { key: 'Note', label: 'Terms / Notes', type: 'text' },
      ],
      metrics: [
        { label: 'TOTAL COMMITTED', field: 'Amount', type: 'sum', prefix: '₹' },
        { label: 'PAYMENTS LOGGED', field: 'Date', type: 'count' },
        { label: 'AVG INSTALLMENT', field: 'Amount', type: 'avg', prefix: '₹' },
      ],
    };
  }
  return null;
}

function validateProposal(raw, existingBlueprint) {
  if (!raw || raw.decision !== 'create' || Number(raw.confidence) < 0.75) return null;
  const sectionId = slug(raw.sectionName);
  if (!sectionId || (existingBlueprint || []).some(section => section.SectionID === sectionId)) return null;
  const fields = (raw.fields || []).slice(0, 8)
    .filter(field => /^[A-Za-z][A-Za-z0-9_]{0,29}$/.test(field.key || '') && SAFE_FIELD_TYPES.has(field.type));
  const metrics = (raw.metrics || []).slice(0, 6)
    .filter(metric => fields.some(field => field.key === metric.field) || metric.field === 'Date')
    .filter(metric => SAFE_METRIC_TYPES.has(metric.type));
  if (fields.length < 2 || metrics.length < 1) return null;
  return {
    ...raw,
    sectionId,
    sheetRef: `${sectionId.replace(/_/g, '')}Log`.slice(0, 40),
    fields,
    metrics,
  };
}

async function askForOpportunity(expense, existingBlueprint, financialContext) {
  const prompt = `You are FinancialOS's bounded product architect.
Analyze one confirmed financial entry and decide whether a reusable mini-app would create meaningful ongoing value.
Do not create a module for ordinary one-off purchases. Prefer "none".
Existing modules: ${(existingBlueprint || []).map(section => section.Name).join(', ') || 'none'}
Financial context: ${JSON.stringify(financialContext || {})}
Current entry: ${JSON.stringify(expense)}

Return JSON only:
{
  "decision": "create|none",
  "confidence": 0.0,
  "sectionName": "short reusable OS name",
  "icon": "single emoji",
  "purpose": "one sentence",
  "reasoning": "one sentence",
  "swot": {"strength":"","weakness":"","opportunity":"","threat":""},
  "fields": [{"key":"PascalCaseKey","label":"Label","type":"text|number|date"}],
  "metrics": [{"label":"LABEL","field":"PascalCaseKey","type":"sum|avg|count|unique","prefix":"","suffix":""}]
}`;
  const response = await callAI({ contents: prompt, temperature: 0.15, maxTokens: 900 });
  return extractJsonObject(response.candidates?.[0]?.content?.parts?.[0]?.text || '');
}

function buildConfig(proposal) {
  return {
    title: `${proposal.icon || '✨'} ${proposal.sectionName}`,
    subtitle: proposal.purpose,
    reasoning: proposal.reasoning,
    swot: proposal.swot,
    logFields: proposal.fields,
    metrics: proposal.metrics.map((metric, index) => ({
      label: metric.label,
      field: metric.field,
      [metric.type]: true,
      prefix: metric.prefix || '',
      suffix: metric.suffix || '',
      color: ['#a78bfa', '#06b6d4', '#10b981', '#f59e0b', '#f472b6'][index % 5],
    })),
    chartField: proposal.metrics.find(metric => metric.type === 'sum' || metric.type === 'avg')?.field || '',
    chartLabel: proposal.sectionName,
  };
}

function buildEntryRow(expense, proposal) {
  const source = {
    Date: expense.date,
    Month: expense.month,
    Year: expense.year,
    Description: expense.description,
    Amount: expense.amount,
    Category: expense.category,
    Mode: expense.mode,
    Note: expense.note,
  };
  const row = { Date: expense.date, Month: expense.month, Year: expense.year };
  proposal.fields.forEach(field => { row[field.key] = source[field.key] ?? ''; });
  row.ClientID = expense.id || '';
  return row;
}

async function logDecision(proxyUrl, email, expense, decision, proposal) {
  const headers = ['Date', 'Entry', 'Decision', 'Module', 'Confidence', 'Reasoning', 'Strength', 'Weakness', 'Opportunity', 'Threat', 'ClientID'];
  await createDynamicSheet(proxyUrl, email, 'EvolutionLog', headers);
  await appendDynamicRow(proxyUrl, email, 'EvolutionLog', [
    expense.date, expense.description, decision, proposal?.sectionName || '', proposal?.confidence || 0,
    proposal?.reasoning || 'No useful reusable enhancement identified.',
    proposal?.swot?.strength || '', proposal?.swot?.weakness || '',
    proposal?.swot?.opportunity || '', proposal?.swot?.threat || '', expense.id || '',
  ]);
}

export async function evolveFromExpense(proxyUrl, email, expense, existingBlueprint = [], financialContext = {}) {
  let raw = deterministicOpportunity(expense);
  if (!raw) {
    try { raw = await askForOpportunity(expense, existingBlueprint, financialContext); } catch (error) { raw = { decision: 'none' }; }
  }
  const proposal = validateProposal(raw, existingBlueprint);
  await logDecision(proxyUrl, email, expense, proposal ? 'created' : 'none', proposal || raw);
  if (!proposal) return null;

  const config = buildConfig(proposal);
  const headers = ['Date', 'Month', 'Year', ...proposal.fields.map(field => field.key), 'ClientID'];
  await createDynamicSheet(proxyUrl, email, proposal.sheetRef, headers);
  await appendDynamicRow(proxyUrl, email, proposal.sheetRef, buildEntryRow(expense, proposal));
  const section = {
    SectionID: proposal.sectionId,
    Name: `${proposal.icon || '✨'} ${proposal.sectionName}`,
    Icon: proposal.icon || '✨',
    SheetRef: proposal.sheetRef,
    Status: 'Active',
    ConfigJSON: JSON.stringify(config),
  };
  await writeToBlueprint(proxyUrl, email, section);
  return section;
}

export { validateProposal };
