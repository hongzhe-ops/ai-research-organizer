import { evZh, extraEvZh, insightsZh, logZh, metaZh, sourcesZh, themesZh } from './demo-zh.ts'
import type { Lang } from './i18n'
import type { Evidence, Insight, LogEntry, Project, Source, Theme } from './types'

/*
 * A fictional study used as the demo project. All participants and posts are invented.
 * Every evidence quote below is an exact substring of its source (checked by scripts/check-demo.ts).
 */

const DAY = 86_400_000
const T0 = Date.UTC(2026, 10, 18, 9, 30)

const sources: Source[] = [
  {
    id: 's1', type: 'interview', participant: 'P1 · Maya, brand designer', title: 'Interview with Maya', addedAt: T0,
    content: `Interviewer: How do you usually receive feedback from clients?
Maya: Honestly, it's everywhere. Some clients email, some send WhatsApp voice notes, one client just comments on the PDF. I spend the first hour of every revision round just collecting what people said.
Interviewer: What's the hardest part?
Maya: Contradictions. The marketing lead wants the logo bigger and the founder wants it quieter, and they never talk to each other. I end up being the one who has to decide whose feedback wins.
Interviewer: Do you use any tools for this?
Maya: I tried Figma comments, but my clients don't want to create accounts. They'd rather send a screenshot with a red circle on it.
Interviewer: How do you know you've addressed everything?
Maya: I keep a checklist in Notes. If I miss one tiny comment, that's the one they remember.`,
  },
  {
    id: 's2', type: 'interview', participant: 'P2 · Jonas, UI designer', title: 'Interview with Jonas', addedAt: T0 + 600_000,
    content: `Interviewer: Walk me through your last feedback round.
Jonas: I shared a Figma prototype link. The client left about forty comments in two days, which was actually great, because everything was in one place.
Interviewer: So Figma worked well?
Jonas: For that client, yes. They were a tech company, everyone already had Figma. With smaller clients it's a different story, they get lost in the interface.
Interviewer: What about vague feedback?
Jonas: "Make it pop" is my nightmare. I usually reply with two or three options so they can point at something instead of describing it.
Interviewer: How long does a round take?
Jonas: The design changes take a day. Getting a clear answer can take a week.`,
  },
  {
    id: 's3', type: 'interview', participant: 'P3 · Priya, illustrator', title: 'Interview with Priya', addedAt: T0 + 1_200_000,
    content: `Interviewer: How do clients give you feedback?
Priya: Mostly email, long threads with five people cc'd. By reply number twelve nobody knows which version we're talking about.
Interviewer: How do you handle versions?
Priya: I name files v1, v2, v2-final, v2-final-really. It's a joke, but it's also my actual system.
Interviewer: Have you ever had a dispute about feedback?
Priya: Once a client said I ignored their notes. I had to dig through three weeks of email to prove they approved the change. Now I screenshot every approval.
Interviewer: What would help?
Priya: Something that remembers who said what, and when, without me being the archivist.`,
  },
  {
    id: 's4', type: 'interview', participant: 'P4 · Tom, motion designer', title: 'Interview with Tom', addedAt: T0 + 1_800_000,
    content: `Interviewer: How do you collect client feedback?
Tom: I just jump on a call. Fifteen minutes on Zoom saves me a day of emails.
Interviewer: Do you write anything down?
Tom: I record the call and send a short summary afterwards. The client confirms it and that's our agreement.
Interviewer: Do you find feedback scattered across channels?
Tom: Not really. I tell clients up front that feedback only counts if it's on the call or in the summary. Setting that rule early solved most of it.
Interviewer: Anything frustrating?
Tom: Clients who say yes on the call and then change their mind on Slack two days later.`,
  },
  {
    id: 's5', type: 'interview', participant: 'P5 · Lena, product designer', title: 'Interview with Lena', addedAt: T0 + 2_400_000,
    content: `Interviewer: What does feedback look like for you?
Lena: Screenshots, mostly. Clients annotate on their phone and send them in Slack. It's fast for them and messy for me.
Interviewer: How do you organise it?
Lena: I paste everything into a Miro board and group it. It takes time, but it helps me see patterns, like five comments that are really about one problem.
Interviewer: Would you let a tool group it automatically?
Lena: Maybe for the first pass. But I'd want to see why it grouped things together. If it merged two comments that are actually different, I'd lose trust fast.
Interviewer: Who decides when feedback conflicts?
Lena: Usually me, and I hate it. I'd rather show the client the conflict and let them decide.`,
  },
  {
    id: 's6', type: 'web', title: 'Forum thread: contradictory client feedback', url: 'https://example.com/forum/contradictory-feedback', addedAt: T0 + DAY,
    content: `Thread: How do you deal with contradictory client feedback?
Original post: My client's team keeps sending conflicting notes through different people. I feel like a referee, not a designer.
Reply 1: I make them nominate one decision-maker before the project starts. Feedback from anyone else goes through that person.
Reply 2: I put all comments in a shared doc and highlight the conflicts in red. Seeing them side by side usually makes the client sort it out themselves.
Reply 3: Contradictory feedback usually means the client doesn't know what they want yet. I go back to the brief.`,
  },
]

type E = [id: string, sourceId: string, quote: string, status: Evidence['status'], rationale: string, note?: string]
const ev: E[] = [
  ['e1', 's1', 'Some clients email, some send WhatsApp voice notes, one client just comments on the PDF.', 'confirmed', 'Describes feedback arriving through several unconnected channels.'],
  ['e2', 's1', 'I spend the first hour of every revision round just collecting what people said.', 'confirmed', 'Quantifies admin time spent before design work starts.'],
  ['e3', 's1', 'The marketing lead wants the logo bigger and the founder wants it quieter, and they never talk to each other.', 'confirmed', 'A concrete example of conflicting stakeholder feedback.'],
  ['e4', 's1', 'I end up being the one who has to decide whose feedback wins.', 'confirmed', 'The designer carries the burden of resolving conflicts.'],
  ['e5', 's1', "my clients don't want to create accounts. They'd rather send a screenshot with a red circle on it.", 'confirmed', 'Clients resist new tools and default to familiar ones.'],
  ['e6', 's1', "If I miss one tiny comment, that's the one they remember.", 'edited', 'Fear of missing a single comment.', 'Signals reputational risk, not just effort.'],
  ['e7', 's2', 'The client left about forty comments in two days, which was actually great, because everything was in one place.', 'confirmed', 'A case where a single shared tool worked well.'],
  ['e8', 's2', "With smaller clients it's a different story, they get lost in the interface.", 'confirmed', 'Tool fit depends on the client, not the designer.'],
  ['e9', 's2', 'I usually reply with two or three options so they can point at something instead of describing it.', 'suggested', 'A workaround for vague feedback.'],
  ['e10', 's2', 'The design changes take a day. Getting a clear answer can take a week.', 'suggested', 'Waiting for clarity takes longer than the design work itself.'],
  ['e11', 's3', "By reply number twelve nobody knows which version we're talking about.", 'confirmed', 'Long email threads lose track of versions.'],
  ['e12', 's3', 'I had to dig through three weeks of email to prove they approved the change.', 'confirmed', 'Missing approval records lead to disputes.'],
  ['e13', 's3', 'Something that remembers who said what, and when, without me being the archivist.', 'confirmed', 'An explicit wish for an automatic record of feedback.'],
  ['e14', 's4', 'Fifteen minutes on Zoom saves me a day of emails.', 'confirmed', 'A synchronous call replaces scattered written feedback.'],
  ['e15', 's4', "I tell clients up front that feedback only counts if it's on the call or in the summary. Setting that rule early solved most of it.", 'confirmed', 'A process rule prevents channel fragmentation.'],
  ['e16', 's4', 'Clients who say yes on the call and then change their mind on Slack two days later.', 'suggested', 'Decisions are reopened in a different channel.'],
  ['e17', 's5', "Clients annotate on their phone and send them in Slack. It's fast for them and messy for me.", 'confirmed', 'Convenience for clients creates mess for designers.'],
  ['e18', 's5', 'it helps me see patterns, like five comments that are really about one problem.', 'confirmed', 'Manual grouping reveals underlying problems.'],
  ['e19', 's5', "I'd want to see why it grouped things together. If it merged two comments that are actually different, I'd lose trust fast.", 'confirmed', 'Automatic grouping must be explainable.'],
  ['e20', 's5', "I'd rather show the client the conflict and let them decide.", 'confirmed', 'Prefers making conflicts visible over resolving them alone.'],
  ['e21', 's6', 'I feel like a referee, not a designer.', 'confirmed', 'Conflict resolution is felt as outside the designer role.'],
  ['e22', 's6', 'I make them nominate one decision-maker before the project starts.', 'confirmed', 'Resolves conflict through process rather than visibility.'],
  ['e23', 's6', 'Seeing them side by side usually makes the client sort it out themselves.', 'suggested', 'Visible conflicts get resolved by clients.'],
  ['e24', 's2', 'I shared a Figma prototype link.', 'rejected', 'Mentions the tool used for sharing.', 'Descriptive only, no attitude or behaviour worth tracking.'],
]
const evidence: Evidence[] = ev.map(([id, sourceId, quote, status, rationale, note]) => ({
  id, sourceId, quote, status, rationale, note, origin: 'ai',
}))
evidence.push({
  id: 'e25', sourceId: 's3', quote: 'Now I screenshot every approval.', status: 'confirmed', origin: 'researcher',
  note: 'Added manually. The AI missed this workaround.',
})

const themes: Theme[] = [
  { id: 't1', name: 'Feedback arrives through too many channels', description: 'Email, chat, voice notes and annotated screenshots all carry feedback, and none of them talk to each other.', evidenceIds: ['e1', 'e2', 'e17', 'e11'], origin: 'ai', status: 'confirmed', locked: true },
  { id: 't2', name: 'Designers end up refereeing client conflicts', description: 'When stakeholders disagree, the designer is left to decide whose feedback wins.', evidenceIds: ['e3', 'e4', 'e21', 'e20', 'e16'], origin: 'ai', status: 'confirmed', locked: false },
  { id: 't3', name: 'A record of approval protects the designer', description: 'Designers keep their own evidence of who approved what, to defend against disputes.', evidenceIds: ['e12', 'e25', 'e13', 'e6'], origin: 'ai', status: 'suggested', locked: false },
  { id: 't4', name: 'Clients stick to tools they already use', description: 'A better tool only helps if clients are willing to use it.', evidenceIds: ['e5', 'e8', 'e7'], origin: 'ai', status: 'suggested', locked: false },
  { id: 't5', name: 'Rules set early prevent feedback chaos', description: 'Agreeing how and where feedback is given, before work begins.', evidenceIds: ['e15', 'e22', 'e14'], origin: 'ai', status: 'edited', locked: false },
  { id: 't6', name: 'Clarity, not effort, is the bottleneck', description: 'Designers wait longer for a clear answer than they spend making changes.', evidenceIds: ['e10', 'e9'], origin: 'ai', status: 'suggested', locked: false },
]

const insights: Insight[] = [
  {
    id: 'i1', statement: 'Fragmented feedback channels create hidden admin work that designers absorb before any design happens.',
    themeIds: ['t1', 't5'], supporting: ['e1', 'e2', 'e17', 'e11'], counter: ['e14', 'e15', 'e7'], origin: 'ai', status: 'confirmed',
    decisionNote: 'Kept, but the counter-evidence shows process rules can remove most of this work.',
  },
  {
    id: 'i2', statement: 'Designers want conflicts made visible to clients rather than resolved on their behalf.',
    themeIds: ['t2'], supporting: ['e20', 'e23', 'e4', 'e21'], counter: ['e22'], origin: 'ai', status: 'suggested',
  },
  {
    id: 'i3', statement: 'A clear record of who approved what matters more to freelancers than faster revision tools.',
    themeIds: ['t3'], supporting: ['e12', 'e25', 'e13', 'e6'], counter: ['e10'], origin: 'ai', status: 'suggested',
  },
  {
    id: 'i4', statement: 'Automatic grouping of feedback is only acceptable if the reasoning behind it can be inspected.',
    themeIds: [], supporting: ['e19', 'e18'], counter: [], origin: 'ai', status: 'suggested',
  },
  {
    id: 'i5', statement: 'Clients prefer giving feedback directly in Figma.',
    themeIds: ['t4'], supporting: ['e7'], counter: ['e5', 'e8'], origin: 'ai', status: 'rejected',
    decisionNote: 'Contradicted by two of three mentions. Only true for tech-savvy clients.',
  },
]

const log: LogEntry[] = [
  { id: 'l1', at: T0 + DAY + 3_600_000, actor: 'ai', text: 'Extracted 24 evidence quotes from 6 sources. 2 proposed quotes were discarded because they did not match the source text.' },
  { id: 'l2', at: T0 + DAY + 3_700_000, actor: 'ai', text: 'Grouped evidence into 6 themes.' },
  { id: 'l3', at: T0 + DAY + 3_800_000, actor: 'ai', text: 'Drafted 5 insights with supporting and counter evidence.' },
  { id: 'l4', at: T0 + 2 * DAY, actor: 'researcher', text: 'Rejected evidence: "I shared a Figma prototype link."', target: { kind: 'evidence', id: 'e24' } },
  { id: 'l5', at: T0 + 2 * DAY + 60_000, actor: 'researcher', text: 'Added evidence manually: "Now I screenshot every approval."', target: { kind: 'evidence', id: 'e25' } },
  { id: 'l6', at: T0 + 2 * DAY + 600_000, actor: 'researcher', text: 'Renamed theme to "Rules set early prevent feedback chaos".', target: { kind: 'theme', id: 't5' } },
  { id: 'l7', at: T0 + 2 * DAY + 900_000, actor: 'researcher', text: 'Confirmed and locked theme "Feedback arrives through too many channels".', target: { kind: 'theme', id: 't1' } },
  { id: 'l8', at: T0 + 2 * DAY + 1_500_000, actor: 'researcher', text: 'Confirmed insight after reviewing 4 supporting and 3 counter quotes.', target: { kind: 'insight', id: 'i1' } },
  { id: 'l9', at: T0 + 2 * DAY + 1_800_000, actor: 'researcher', text: 'Rejected insight: "Clients prefer giving feedback directly in Figma." Reason: Contradicted by two of three mentions.', target: { kind: 'insight', id: 'i5' } },
]

function zhProject(): Project {
  const evidence: Evidence[] = evZh.map(([id, sourceId, quote, status, rationale, note]) => ({ id, sourceId, quote, status, rationale, note, origin: 'ai' }))
  evidence.push({ id: 'e25', sourceId: 's3', quote: extraEvZh.quote, status: 'confirmed', origin: 'researcher', note: extraEvZh.note })
  return { ...metaZh, isDemo: true, sources: sourcesZh, evidence, themes: themesZh, insights: insightsZh, log: [...logZh].reverse() }
}

export function demoProject(lang: Lang = 'en'): Project {
  if (lang === 'zh') return structuredClone(zhProject())
  return structuredClone({
    name: 'Freelance designers and client feedback',
    question: 'How do freelance designers collect, interpret and act on client feedback?',
    isDemo: true,
    sources, evidence, themes, insights, log: [...log].reverse(),
  })
}

export function emptyProject(lang: Lang = 'en'): Project {
  return { name: lang === 'zh' ? '未命名研究' : 'Untitled study', question: '', isDemo: false, sources: [], evidence: [], themes: [], insights: [], log: [] }
}
