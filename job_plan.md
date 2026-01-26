---
name: Jobs Scheduler Brainstorm
overview: Brainstorm and plan for moving long-running chat analysis and RAG indexing off the request path using a hosted job service, so the app returns quickly and the analysis page shows an "Indexing..." state until embeddings are ready.
todos: []
isProject: false
---

# Job scheduler for uploads, analysis, and RAG

## Current bottleneck

Today everything runs inside a single `/api/analyze` request:

- Parse chat (platform-specific; can be heavy for large Telegram/Instagram JSON).
- Save analysis row.
- **Embedding loop**: for each chunk (e.g. ~1 chunk per 8 messages), you call Gemini `text-embedding-004` and insert into `message_embeddings`. This is **sequential** in [lib/rag/store.ts](lib/rag/store.ts) (`for (const chunk of chunks) { await generateEmbedding(...); await db.insert(...); }`).
- Delete blob, return.

For a 5k-message chat that’s hundreds of chunks and hundreds of round-trips. On Vercel you’re limited by route duration (often 10–60s), so big chats will time out or fail. A job queue moves the heavy work to a background invocation with higher limits (or multiple steps).

---

## Target flow (async UX)

- User submits file (or blob URL) and clicks “Analyze”.
- **API** creates the analysis row with a status like `job_status: 'pending'`, enqueues a job, and **returns immediately** with `analysisId`.
- User is redirected to `/analysis/[id]`. The dashboard can render from `stats` right away; the RAG chatbot area shows “Indexing conversation… We’ll notify you when it’s ready” (or similar).
- **Background job** (invoked by the queue service):
- If you keep “parse in API”: job receives `analysisId` + `blobUrl` (or stored file ref), fetches content, parses, updates `stats` if needed, then runs embedding.
- If you move “parse” into the job: API only validates and stores blob ref + metadata, creates a “pending” analysis row, enqueues one job that does parse → save stats → embed.
- When the job finishes, it sets `job_status: 'ready'` (or `embeddings_ready_at`). The analysis page can poll an endpoint or use a lightweight “sync”/webhook so the “Indexing…” state disappears and the chatbot becomes usable.

So the “scheduler” here is really **background job execution** triggered by “analysis created” or “file uploaded”, not cron-based scheduling.

---

## Hosted job services that fit (Vercel + no Redis)

You said you’re on **Vercel**, want **async UX**, and are fine with a **hosted queue/jobs SaaS**. These three work well:

| Service | How it runs jobs | Best for |
|--------|-------------------|----------|
| **Inngest** | Invokes your Next.js API routes (or Inngest “fns”) via HTTP. Steps can be retried and chained. Built-in retries, event-driven or step-based. | Durable workflows (parse → embed), retries, and “run this route in the background” with minimal extra infra. |
| **Trigger.dev** | Triggers your code (same repo) in their cloud; long-running runs, logging, retries. You define tasks and call `trigger.run()`. | Same idea as Inngest; stronger emphasis on DX and observability; can use Redis under the hood on their side. |
| **QStash (Upstash)** | HTTP-based: you enqueue by “call this URL at this time.” No worker process; your API route *is* the worker when QStash calls it. | Simple “call back this endpoint” with delays/retries. Good if you want a tiny, URL-based queue and already use Upstash. |

**Recommendation for your stack:** **Inngest** or **Trigger.dev**. Both give you “enqueue from `/api/analyze` and run a multi-step background workflow” without running a worker yourself. Inngest is a bit more “event + function” oriented; Trigger.dev is very “task + run” oriented. Either is a strong fit.

**QStash** is a good fit if you want the smallest abstraction (literally “POST this URL to be called later”) and are fine composing retries and splitting “parse” vs “embed” yourself (e.g. one QStash message per phase).

---

## Design choices to decide

1. **Where does “parse” run?**

- **Option A – Parse in API, embed in job**  
API fetches blob, parses, writes `chat_analysis` with full `stats`, then enqueues a job with `analysisId` + `messagePayload` (or a blob path the job can read). Job only does `embedAndStoreMessages`.
Pros: dashboard is fully useful as soon as you land on the page. Cons: parsing still counts against the API route’s time/memory; very large files might still push limits.
- **Option B – Parse and embed in job**  
API creates a “pending” row (e.g. minimal metadata + `blobUrl`), enqueues one job. Job fetches from blob, parses, updates the row with `stats`, then runs embedding.
Pros: API is very fast; all heavy work is in the job. Cons: dashboard might need to show “Processing…” until the job has at least written `stats`.

For “analysis visible soon, RAG later,” Option A is enough. For “everything heavy in the background,” Option B is cleaner.

2. **Schema**

- Add something like `job_status` (`'pending' | 'ready' | 'failed'`) or `embeddings_ready_at: timestamp` on `chat_analysis` so the UI and the chatbot know when RAG is ready. Your [analysis chat route](app/api/analysis/[id]/chat/route.ts) already handles missing embeddings with a message; you’ll feed it this status so the analysis page can show “Indexing…” instead of the chat input until ready.

3. **How does the UI know when indexing is done?**

- **Polling**: Analysis page polls e.g. `GET /api/analyses/[id]` or `GET /api/analyses/[id]/status `every few seconds while `job_status === 'pending'`.
- **Inngest/Trigger.dev “sync” or webhooks**: Some setups let you subscribe to “run completed” and call an API that flips status; or you use Inngest’s “invoke a sync” so the client can subscribe and get a push. If you don’t need real-time push, polling is the smallest change.

4. **Idempotency and retries**

- Make the job idempotent (e.g. “ensure embeddings for `analysisId`”): if the job is retried, it can skip already-embedded chunks or overwrite safely. Your `embedAndStoreMessages` currently doesn’t support resuming; you could add “delete then re-embed” for the whole analysis, or design a “embed from chunk K” path later if you need partial resume.

---

## Suggested high-level steps

- **Backend**
- Add `job_status` (or `embeddings_ready_at`) to `chat_analysis` and a small migration.
- Integrate one job service (e.g. Inngest): event `analysis.created` or `analysis.parse.complete` with payload `{ analysisId, blobUrl? }` or `{ analysisId, messages }`.
- In `/api/analyze`: create analysis row with `job_status: 'pending'`, (optionally) parse in-request, send event to the job service, return `{ analysisId }` immediately. If you move parse into the job, create a minimal row and send `{ analysisId, blobUrl, platform, name }`.
- New route or Inngest “fn” that the service invokes: load data (from payload or by re-fetching blob), run parsing if in job, update stats if needed, run `embedAndStoreMessages`, set `job_status: 'ready'`, then delete blob if still present.
- Optionally add `GET /api/analyses/[id]/status `that returns `{ jobStatus }` (or derive from `embeddings_ready_at`) for polling.

- **Frontend**
- After submit, redirect to `/analysis/[id] `as you do today; consider returning `analysisId` from the API without waiting for the job.
- On the analysis page, if `embedding_status === 'pending'`, show “Indexing conversation…” in the chatbot area and poll status until `ready` (or use a “sync”/webhook if you adopt it).
- When `ready`, show the normal chat UI; existing RAG logic already uses `checkEmbeddingsExist` and can rely on this status.

- **Observability**
- Use the job service’s dashboard (Inngest/Trigger.dev) to inspect runs, retries, and failures. Log `analysisId` and any blob refs in the job so you can trace which analysis failed.

---

## Summary

- **Use a hosted job service** (Inngest or Trigger.dev preferred) so long-running parse + RAG indexing run in the background on Vercel-friendly infra.
- **Return from `/api/analyze` quickly** with `analysisId` and a "pending" embedding status; do heavy work in a job that the service invokes.
- **Add a minimal embedding-status field** and, on the analysis page, show "Indexing…" until it's ready; polling is enough for the first version.
- Choosing "parse in API vs in job" and "Inngest vs Trigger.dev" are the main decisions; everything else (schema, polling, idempotency) follows from those.

---

## ✅ Decision: Inngest + Option B (Parse and Embed in Job)

### Why Inngest over Trigger.dev?

| Factor | Inngest | Trigger.dev |
|--------|---------|-------------|
| **Free Tier** | 50,000 executions/month | $5 monthly credit (harder to estimate) |
| **Concurrency** | 5 concurrent steps | 10 concurrent runs |
| **Deployment** | No separate deploy — works inline with Next.js routes | Similar, but slightly more setup |
| **Vercel Integration** | Built specifically for serverless/Vercel | Also works, but Inngest is more native |
| **Step Functions** | First-class durable steps with retries | Task-based, similar capability |

**Key reasons for Inngest:**
1. **No separate infrastructure** — Inngest invokes your Next.js API routes via HTTP. No workers, no Redis, no extra processes.
2. **Generous free tier** — 50k executions/month is more than enough for a chat analysis tool.
3. **Durable workflows** — Built-in retries and step orchestration for the parse → embed pipeline.
4. **Vercel-native** — Designed to work seamlessly with Vercel's serverless model.

### Why Option B (Parse + Embed in Job)?

- API returns **instantly** — just creates a minimal pending row.
- **All heavy work** (parsing large JSON/text files + embedding) runs in background.
- Simpler API route — minimal validation, then hand off to job.
- Dashboard shows "Processing..." until stats are ready.

### Branch Name

```
feat/inngest-background-embeddings
```