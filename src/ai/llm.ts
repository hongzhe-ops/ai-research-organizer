import { getT } from '../store'
import type { Settings } from '../types'

export class LLMError extends Error {}

/** Calls the chosen provider directly from the browser with the researcher's own key. */
export async function complete(settings: Settings, system: string, user: string): Promise<string> {
  if (!settings.apiKey) throw new LLMError(getT().ai.noKey)
  let res: Response
  try {
    if (settings.provider === 'anthropic') {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': settings.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({ model: settings.model, max_tokens: 4096, system, messages: [{ role: 'user', content: user }] }),
      })
    } else {
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${settings.apiKey}` },
        body: JSON.stringify({ model: settings.model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
      })
    }
  } catch {
    throw new LLMError(getT().ai.unreachable)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error?.message || `Request failed with status ${res.status}.`
    throw new LLMError(res.status === 401 ? getT().ai.badKey : msg)
  }
  const text = settings.provider === 'anthropic'
    ? (data.content || []).map((c: { text?: string }) => c.text || '').join('')
    : data.choices?.[0]?.message?.content || ''
  return text
}

/** Pulls the first JSON value out of a model reply. */
export function parseJSON<T>(text: string): T {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fence ? fence[1] : text
  const start = body.search(/[[{]/)
  if (start < 0) throw new LLMError(getT().ai.noResults)
  const open = body[start]
  const close = open === '[' ? ']' : '}'
  const end = body.lastIndexOf(close)
  try {
    return JSON.parse(body.slice(start, end + 1)) as T
  } catch {
    throw new LLMError(getT().ai.unreadable)
  }
}
