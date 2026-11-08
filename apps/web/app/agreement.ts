// Same filling rules as the server (apps/api/src/sellers/agreement.ts), so the seller sees exactly the text that gets recorded.
export type Section = { title: string; body: string[] };
export const fill = (t: string, v: Record<string, string>) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => v[k] ?? '');
export const renderText = (sections: Section[], v: Record<string, string>) => sections.map(s => `${s.title}\n${s.body.map(b => fill(b, v)).join('\n')}`).join('\n\n');
