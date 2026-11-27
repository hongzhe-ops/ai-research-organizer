// Verifies that every demo quote appears verbatim in its source.
import { demoProject } from '../src/demo.ts'
const p = demoProject()
let bad = 0
for (const e of p.evidence) {
  const s = p.sources.find((x) => x.id === e.sourceId)!
  if (!s.content.includes(e.quote)) { bad++; console.log('MISSING', e.id, e.quote) }
}
const ids = new Set(p.evidence.map((e) => e.id))
for (const t of p.themes) for (const x of t.evidenceIds) if (!ids.has(x)) { bad++; console.log('BAD THEME REF', t.id, x) }
for (const i of p.insights) for (const x of [...i.supporting, ...i.counter]) if (!ids.has(x)) { bad++; console.log('BAD INSIGHT REF', i.id, x) }
console.log(bad ? `${bad} problems` : `OK: ${p.evidence.length} quotes verified`)
process.exit(bad ? 1 : 0)
