import { Router } from 'express';
import Anthropic   from '@anthropic-ai/sdk';

const router = Router();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ── System prompt builder ─────────────────────────────────────────────────
function buildSystemPrompt(context = {}) {
  const { builds = [], products = [], schema = {}, page = 'release', filters = {} } = context;

  const buildSummary = builds.slice(0, 60).map((b) =>
    `{product:${b.product}, release:${b.release}, build:#${b.build}, platform:${b.platform}, status:${b.status}, duration:${b.duration}s, stages:[${b.stages.map(s=>`${s.name}(${s.s})`).join(',')}]}`
  ).join('\n');

  const productList = products.map((p) =>
    `- ${p.name} | domain:${p.domain_name || p.domain} | BU:${p.business_unit_name || p.business_unit}`
  ).join('\n');

  const schemaInfo = Object.entries(schema)
    .map(([table, rows]) => `${table}: ${rows.map(r => r.name || r.email || r.version || r.id).join(', ')}`)
    .join('\n');

  const filterInfo = Object.entries(filters)
    .filter(([,v]) => v)
    .map(([k,v]) => `${k}=${v}`)
    .join(', ') || 'none';

  const activeCount = builds.length;

  return `You are an intelligent CI/CD pipeline assistant embedded inside "Pipeline Observatory" — a CI/CD observability dashboard.

## YOUR ROLE
Help users query, understand and explore their pipeline build data, release metrics, and CI health. You can compute metrics on-the-fly from the build data provided below.

## CURRENT CONTEXT
- Active page: ${page === 'release' ? 'Release Dashboard' : page === 'ci-metrics' ? 'CI Build Metrics' : 'Settings'}
- Active filters: ${filterInfo}
- Active build events: ${activeCount} records visible

## PRODUCTS IN SYSTEM
${productList || 'No products loaded yet.'}

## ACTIVE BUILD EVENTS (${activeCount} records)
${buildSummary || 'No active build events.'}

## REFERENCE SCHEMA
${schemaInfo || 'No schema data.'}

## CAPABILITIES
You can:
1. Calculate green build rates, failure rates, success counts for any product/release/platform combo
2. Compute DORA metrics (deployment frequency, lead time, change failure rate, MTTR estimate)
3. Compare releases or platforms
4. Identify flaky builds or recurring failures
5. Summarise stage-level failures
6. Suggest dashboard filters to drill down
7. Answer questions about release timelines

## INTERACTION STYLE
- Be concise but precise — use numbers and percentages
- Use markdown tables/lists for structured data
- If the query is ambiguous, ask ONE clarifying question
- If filters would help narrow results, suggest them
- Format durations as "Xm Ys" (e.g. "14m 35s")
- Highlight critical findings in bold

## IMPORTANT
- Only answer questions relevant to CI/CD, builds, releases, or pipeline metrics
- If asked something unrelated, politely redirect to pipeline topics
- Never make up data — compute from the build records provided above`;
}

// ── POST /api/v1/chat ─────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { messages = [], context = {} } = req.body;

  if (!messages.length) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    // Mock response when no API key is configured
    return res.json({
      role:    'assistant',
      content: '⚠️ **AI assistant not configured.**\n\nTo enable the AI chatbot, set `ANTHROPIC_API_KEY` in your `.env` file:\n```\nANTHROPIC_API_KEY=your-key-here\n```\nGet your key at [console.anthropic.com](https://console.anthropic.com).',
    });
  }

  try {
    const systemPrompt = buildSystemPrompt(context);

    // Convert messages to Anthropic format (filter out system messages)
    const anthropicMessages = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }));

    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:     systemPrompt,
      messages:   anthropicMessages,
    });

    const text = response.content[0]?.text || 'Sorry, I could not generate a response.';

    res.json({ role: 'assistant', content: text });
  } catch (err) {
    console.error('[Chat] Claude API error:', err.message);

    if (err.status === 401) {
      return res.status(401).json({ error: 'Invalid ANTHROPIC_API_KEY. Please check your .env file.' });
    }
    if (err.status === 429) {
      return res.status(429).json({ error: 'Rate limited by Claude API. Please wait a moment and try again.' });
    }

    res.status(500).json({ error: 'Chat service error: ' + err.message });
  }
});

export default router;
