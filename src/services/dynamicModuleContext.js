import { getDynamicSheet } from './proxyService';

export async function loadDynamicModuleContext(proxyUrl, email, blueprint = [], rowLimit = 20) {
  if (!proxyUrl || !email || !Array.isArray(blueprint)) return [];
  return Promise.all(blueprint
    .filter(section => section?.SheetRef)
    .map(async section => {
      let config = null;
      try { config = section.ConfigJSON ? JSON.parse(section.ConfigJSON) : null; } catch (error) {}
      const rows = await getDynamicSheet(proxyUrl, email, section.SheetRef).catch(() => []);
      return {
        sectionId: section.SectionID,
        name: section.Name,
        sheetRef: section.SheetRef,
        fields: config?.logFields || [],
        purpose: config?.subtitle || config?.reasoning || '',
        rows: rows.slice(-rowLimit),
      };
    }));
}

export function formatDynamicModuleContext(modules = []) {
  if (!modules.length) return 'No AI-built modules yet.';
  return modules.map(module => [
    `MODULE: ${module.name} [Sheet: ${module.sheetRef}]`,
    `Purpose: ${module.purpose || 'User-specific evolving log'}`,
    `Fields: ${(module.fields || []).map(field => `${field.key} (${field.type})`).join(', ') || 'Defined by sheet headers'}`,
    `Latest synced rows: ${JSON.stringify(module.rows || [])}`,
  ].join('\n')).join('\n\n');
}
