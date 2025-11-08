/**
 * Merge Engine
 * Traceability: FR-11 — consolidation/merge of child forms into a parent form.
 */
export type MergeStrategy = {
  [sectionId: string]: 'sum' | 'avg' | 'max' | 'min' | 'concat';
};

export function mergeForms(children: any[], strategy: MergeStrategy) {
  const result: any = {};
  for (const [sectionId, strat] of Object.entries(strategy)) {
    const values = children.map((c) => c?.data?.[sectionId]).filter(Boolean);
    if (!values.length) continue;
    switch (strat) {
      case 'sum':
        result[sectionId] = values.reduce((a: number, b: number) => a + Number(b), 0);
        break;
      case 'avg':
        result[sectionId] = values.reduce((a: number, b: number) => a + Number(b), 0) / values.length;
        break;
      case 'max':
        result[sectionId] = Math.max(...values.map(Number));
        break;
      case 'min':
        result[sectionId] = Math.min(...values.map(Number));
        break;
      case 'concat':
        result[sectionId] = values.flat();
        break;
    }
  }
  return result;
}

