# AI Research Organizer

An AI-assisted synthesis tool for product designers and user researchers. Import interview transcripts, PDFs and web pages. The AI drafts evidence, themes and insights, and **every insight stays traceable to the exact words a participant said**. The researcher confirms, edits or rejects each one.

**Live demo:** https://hongzhe-ops.github.io/ai-research-organizer/

The interface and the demo study are available in Chinese and English (toggle in the header; it follows the browser language by default). The demo opens with a fictional study, *Freelance designers and client feedback*, so it can be explored without an API key. Connect your own Anthropic or OpenAI key in Settings to analyse your own material.

## The problem

Qualitative synthesis is slow, and AI makes it faster in a way researchers don't trust. Secondary research for this project found:

- Manual work is the top frustration in synthesis, and reading and structuring data are the biggest pain points (Lyssna Research Synthesis Report 2025).
- Trust in AI drops as tasks become more interpretive. It is high for summarising and much lower for turning findings into recommendations.
- AI-generated quotes are the weakest link. In a workshop where the same synthesis prompt was run many times, every participant found misquoted or invented passages.
- The risk is not only wrong output but *automation bias*: researchers accepting AI groupings without thinking.

## Design principles

| Principle | How it shows up in the product |
| --- | --- |
| **Evidence before conclusions** | An insight is never shown without its quotes. Insights the AI drafts without evidence are discarded. |
| **AI proposes, the researcher decides** | AI drafts are drawn in *pencil* (dashed). Researcher decisions are in *ink* (solid). Nothing turns to ink without a human action. |
| **Show the counter-evidence** | Every insight shows quotes that challenge it next to the quotes that support it. The AI is instructed to look for them. |
| **Coverage, not confidence** | No made-up confidence scores. Insights show how many participants and sources stand behind them, and flag claims that rest on a single person. |
| **Every decision is traceable** | Edits and rejections require a reason. The activity log records what the AI proposed and what the researcher decided. |

## Key interaction decisions

- **Verbatim check.** Every quote the AI proposes is matched against the source text before it is shown. Quotes that don't appear in the source are discarded, and the activity log reports how many.
- **Two-way trace.** From an insight you can open any quote in its source, highlighted in context. From any highlight in a source you can see which themes and insights rely on it.
- **Light friction before confirming.** An insight can only be confirmed from its evidence panel, so the researcher has to look at the supporting and challenging quotes first.
- **Locked themes.** The researcher can lock a theme. Re-running AI clustering never renames, splits or removes locked, confirmed or edited themes, and never proposes rejected themes again.
- **Researcher-added evidence.** Select any passage in a source to add a quote the AI missed. It is marked as added by you.

## Built with

React, TypeScript, Vite, Tailwind CSS, Zustand and PDF.js. It runs entirely in the browser. Data is stored in `localStorage`, and AI calls go straight from the browser to the provider you choose, using your own key.

```bash
npm install
npm run dev
node --experimental-strip-types scripts/check-demo.ts   # verifies every demo quote exists in its source
```

## Notes

- All demo participants, quotes and forum posts are fictional.
- Your API key and research material stay in your browser, except when you run AI analysis, which sends the material to the AI provider you selected.
