# JURIX — AI-Powered Legal Assistant for Indian Law
## Project Report

---

## 1. EXECUTIVE SUMMARY

Jurix is a Retrieval-Augmented Generation (RAG) system that answers questions about Indian law in plain language. It indexes two distinct corpora — statutory texts (Constitution, IPC, IT Act) and Supreme Court judgments scraped from IndianKanoon — into a PostgreSQL/pgvector database, then uses Google Gemini 2.5 Flash to plan queries, retrieve relevant chunks across both corpora, and synthesize a structured answer with proper citations and links to the source judgments.

The system is delivered as a FastAPI backend with two front-ends: a React 19 + Vite chat UI (primary) and a Streamlit app (legacy/dev). A scraping pipeline keeps the case database up to date.

---

## 2. PROBLEM STATEMENT

Indian citizens struggle to access legal information because:

- Legal language is dense and hard to parse for non-lawyers.
- Even a brief consultation costs ₹500–₹5000.
- The Constitution, IPC, IT Act and case law are spread across multiple sources with no unified search.
- Generic LLM chatbots hallucinate and give no citation trail back to the actual provision or judgment.

**Goal:** a free assistant that answers a layperson's legal question grounded in the actual text of Indian statutes and Supreme Court judgments, with verifiable citations.

---

## 3. OBJECTIVES

1. Build a RAG pipeline grounded in the Constitution, IPC, IT Act, and Indian Supreme Court judgments.
2. Use **two separate corpora** (statutes vs. cases) so retrieval can be tuned per source.
3. Have the LLM **plan its own retrieval** — decide whether a query needs statutes, cases, or both, before searching.
4. Produce structured, citation-rich answers with clickable IndianKanoon links.
5. Provide a clean conversational UI with a fallback Streamlit interface for fast iteration.
6. Keep the ingestion pipeline scriptable so new judgments can be added in batches.

---

## 4. SYSTEM ARCHITECTURE

```
┌───────────────────────────────────────────────────────────────┐
│  React 19 + Vite Frontend  (chat UI, file attach, curtain)    │
│  Streamlit App (alternate)                                    │
└───────────────────┬───────────────────────────────────────────┘
                    │  HTTP/JSON  (POST /api/query …)
┌───────────────────▼───────────────────────────────────────────┐
│  FastAPI Backend  (main.py)                                   │
│  • /api/query             unified query                       │
│  • /api/query/analyze     show retrieval plan only            │
│  • /api/documents/upload  PDF ingestion                       │
│  • /health, /api/stats, /api/database/test                    │
└───────────────────┬───────────────────────────────────────────┘
                    │
        ┌───────────▼────────────┐
        │  Query Planner (LLM)   │  analyze_and_generate_queries
        │  → {legal_docs:[...],  │  Gemini returns JSON plan
        │     cases:[...]}       │
        └───────────┬────────────┘
                    │
        ┌───────────▼────────────────────────────────────┐
        │  Vector Search                                 │
        │  • text-embedding-004 (768-dim)                │
        │  • pgvector cosine distance (<=>)              │
        │  • legal_docs top_k=7 │ cases top_k=11         │
        │  • dedupe by hash of first 100 chars           │
        │  • merge & rank by similarity, take top 18     │
        └───────────┬────────────────────────────────────┘
                    │
        ┌───────────▼────────────┐
        │  Answer Generator      │  Gemini 2.5 Flash with
        │  (statutes + cases     │  template that splits
        │   prompt template)     │  statutory vs case context
        └────────────────────────┘
                    │
        ┌───────────▼─────────────────────────┐
        │  PostgreSQL + pgvector              │
        │  legal_docs(content, embedding,     │
        │             title)                  │
        │  cases(doc_id, case_title,          │
        │        section_type, content,       │
        │        embedding)                   │
        └─────────────────────────────────────┘

        ┌──────────────────────────────────────────────┐
        │  Offline: scraper.py                         │
        │  IndianKanoon → search parser → case parser  │
        │   → section-aware chunking → embeddings →    │
        │   cases table                                │
        └──────────────────────────────────────────────┘
```

---

## 5. BACKEND (Python / FastAPI)

### 5.1 File Map

| File | Role |
|---|---|
| `main.py` | FastAPI app, REST endpoints, CORS, in-memory stats |
| `app.py` | Streamlit alternate UI (chat + ingestion) |
| `db.py` | psycopg2 wrapper: `get_db_connection`, `insert_many`, `fetch_similar_documents`, `check_if_docid_exists` |
| `ingestion.py` | PDF processing, Gemini embeddings, case-section chunking, DB writes |
| `llm.py` | The brains: query planner + unified retrieval + answer synthesis |
| `agent.py` | Experimental Google ADK `LlmAgent` wired to a `get_context` tool (not used by main.py) |
| `scraper.py` | IndianKanoon Supreme Court scraper (curl_cffi, Chrome impersonation) |
| `document_search_parser.py` | BS4 parser for IK search-result pages (titles, doc_ids, pagination) |
| `case_document_parser.py` | BS4 parser for IK judgment pages, splits by `data-structure` attributes |
| `prompts.py` | Holds the `SUMMARIZE_FACTS_PROMPT` template |

### 5.2 Database Schema (pgvector)

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE legal_docs (
    id        SERIAL PRIMARY KEY,
    content   TEXT,
    embedding vector(768),
    title     TEXT
);

CREATE TABLE cases (
    id           SERIAL PRIMARY KEY,
    doc_id       TEXT,           -- IndianKanoon doc id (stable URL key)
    case_title   TEXT,
    section_type TEXT,           -- Facts | Issues | Court's Reasoning | Conclusion
    content      TEXT,
    embedding    vector(768)
);

-- Cosine similarity search:
-- 1 - (embedding <=> query_embedding) AS similarity
```

The `<=>` operator is pgvector's cosine distance; the code converts it to similarity = `1 - distance`.

### 5.3 Embedding & Chunking

- **Model:** `text-embedding-004` (Google), 768-dim, batched 100 chunks per request.
- **Statutes (`legal_docs`):** `RecursiveCharacterTextSplitter` with `chunk_size=1000`, `overlap=200`, run on PyPDF-loaded pages.
- **Cases (`cases`):** Section-aware chunking instead of uniform splitting — see §5.5.

### 5.4 The Query Pipeline (`llm.py`)

The query flow is the most distinctive piece of the system. Three steps:

**Step 1 — Query Planning.** `analyze_and_generate_queries(user_query)` calls Gemini with a prompt that returns strict JSON:

```json
{ "legal_docs": ["Article 21"], "cases": [] }
```

The model is instructed to:
- Use the statutes corpus for direct provision lookups (Article X, Section Y).
- Use the cases corpus only when the user explicitly asks for case law / judgments / precedents / interpretations.
- Generate 2–3 focused queries max for complex questions.
- Return `[]` for an unused corpus.

A keyword fallback (`'section'`, `'article'`, `'ipc'`, `'case'`, `'precedent'`, …) handles the JSON-parse-failure case.

**Step 2 — Multi-corpus Retrieval.** `answer_query_unified(query)`:
- Embeds each planned sub-query.
- Hits `legal_docs` with `top_k=7` per sub-query and `cases` with `top_k=11`.
- Deduplicates on `hash(content[:100])`.
- Tags every hit with its `source_table` so the prompt can present them differently.
- Sorts by similarity and keeps the top 18.

**Step 3 — Answer Synthesis.** `get_gemini_response_unified` builds a prompt that:
- Splits context into **Statutory Provisions** and **Court Judgments** sections.
- For cases, includes the IndianKanoon `doc_id` so the LLM can render a real link: `https://indiankanoon.org/doc/<doc_id>`.
- Uses one of two response templates:
  - **General legal query**: Overview → Detailed Explanation → What This Means For You → Legal References → Related Case Laws.
  - **Case analysis / outcome prediction**: Case Summary → Legal Analysis → Outcome Assessment (chances of success: Strong/Moderate/Weak) → Recommendations → Similar Precedents.
- Always closes with a "not a substitute for legal advice" disclaimer.

### 5.5 Case Ingestion (the interesting part)

`process_case_for_ingestion(structured_content)` in `ingestion.py` chunks judgments **by section** rather than by raw character count, because the four sections of a judgment have different retrieval value:

| Section | Strategy | Why |
|---|---|---|
| Facts | LLM-summarized into 100–250 words via `SUMMARIZE_FACTS_PROMPT`, stored as a single chunk | Raw facts are verbose and dilute embedding similarity; a dense summary embeds better |
| Issues | Split, `chunk_size=1200`, `overlap=150` | Issues are short, dense, and best matched as small units |
| Court's Reasoning | Split, `chunk_size=1500`, `overlap=200` | The longest section, needs more context per chunk |
| Conclusion | Single chunk if ≤2000 chars, else split | Usually short and self-contained |

If the fact summarization fails, the entire case is skipped (case is treated as failed). This is a deliberate quality-over-quantity choice.

### 5.6 The Scraper (`scraper.py`)

- Uses `curl_cffi` impersonating Chrome to bypass bot protection on indiankanoon.org.
- Targets Supreme Court documents in a date window (currently `1-10-2023` to `31-10-2023`).
- For each result page: parses with `document_search_parser` → for each case: fetches the judgment HTML, parses with `case_document_parser` → calls `insert_case_into_db`.
- Walks pagination via `next_page_url`.
- `check_if_docid_exists` (in `db.py`) lets the scraper skip already-ingested cases (currently commented out, but ready).

The `case_document_parser` keys off the `data-structure` attribute on `<div class="judgments">` children:

```
'Facts'      → Facts
'Issue'      → Issues
'PetArg'     → Petitioner's Arguments
'RespArg'    → Respondent's Arguments
'Section'    → Analysis of the law
'Precedent'  → Precedent Analysis
'CDiscource' → Court's Reasoning
'Conclusion' → Conclusion
```

It strips signature/page-number footers via regex before storing.

### 5.7 REST API

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/query` | Run the unified RAG pipeline; optional `debug` flag exposes the query plan |
| `POST` | `/api/query/analyze` | Run only the planner; useful for inspection / UI hints |
| `POST` | `/api/documents/upload` | Multipart PDF + title → ingest into `legal_docs` |
| `GET` | `/health` | Pings the DB; returns `{status, database_connected, message}` |
| `GET` | `/api/stats` | In-memory counters (`documents_processed`, `total_queries`) |
| `GET` | `/api/database/test` | DB connectivity check |
| `GET` | `/` | Endpoint manifest |

CORS is wide open (`allow_origins=["*"]`) — fine for development, must be tightened before any deployment.

---

## 6. FRONTEND (React 19 + Vite)

### 6.1 Stack

- React 19, Vite 7, no router (single page), no Tailwind — handwritten CSS using CSS variables.
- Only two runtime deps (`react`, `react-dom`); rest are dev/build.

### 6.2 Layout

```
src/
├── App.jsx               # state, layout, health-check, message orchestration
├── main.jsx              # React root
├── App.css, index.css    # global tokens & layout
├── components/
│   ├── ChatMessage.jsx   # markdown-ish renderer (## / ### / lists / 🔗 links)
│   ├── ChatInput.jsx     # textarea + file attach (PDF/TXT/DOCX), base64
│   ├── Sidebar.jsx       # menu (Cmd/Ctrl+B)
│   └── CurtainLoader.jsx # opening animation
├── services/api.js       # sendQuery, checkHealth, getStats, uploadDocument
└── styles/               # per-component CSS
```

### 6.3 UX Behavior

- On mount: `checkHealth()` → green/red status pill in the header.
- Empty state: welcome screen with three feature cards and three example-query chips that fire a real query when clicked.
- Each user message is appended optimistically; a typing-dots loader shows while the backend is working.
- Attachments are read with `FileReader.readAsDataURL`, the data: prefix stripped, and the base64 payload sent inside the JSON body alongside `query`.
- `Cmd/Ctrl + B` toggles the sidebar (handy keyboard shortcut, registered globally).
- A custom `formatContent` parser handles the markdown subset Gemini emits: `##` and `###` headings (with leading-emoji extraction), numbered/bulleted lists, `---` dividers, `**bold**`, `(X vs Y)` styled as case references, and `🔗 https://indiankanoon.org/doc/...` rendered as a "View Case Document" link button.

### 6.4 Known Issue Spotted in Code

`src/services/api.js` defines `API_BASE_URL = 'http://localhost:8005'` while `main.py` runs on port `8000`. Either the FastAPI server needs to be started on `8005` or the constant needs to be changed to `8000` for the React UI to reach the backend.

---

## 7. RAG DESIGN DECISIONS WORTH CALLING OUT

1. **Two corpora, not one.** Statutes and judgments are queried separately because their semantics differ. Mixing them in one table dilutes statutory hits when the user just wants "Article 21".
2. **LLM-planned retrieval.** Rather than always searching everything, Gemini first decides what to search and produces query strings tuned per corpus. This is what avoids noisy case-law results creeping into a simple "what does Article 21 say" answer.
3. **Section-aware case chunking.** Treating `Facts`/`Issues`/`Reasoning`/`Conclusion` differently — and summarizing facts before embedding — is a pragmatic embedding-quality move; long verbose facts otherwise drown the similarity signal.
4. **Citations as part of the prompt contract.** The answer template forces Gemini to render IndianKanoon links from the `doc_id` it receives in context, so every cited case is clickable and verifiable.
5. **Two UIs, one backend.** The Streamlit app and the React app share the same `answer_query_unified` flow, which keeps experimentation cheap.

---

## 8. SETUP & RUN

```bash
# Backend
pip install -r requirements.txt
# Set .env: GOOGLE_API_KEY, user, password, host, port, dbname
python main.py                              # FastAPI on :8000

# Or the Streamlit UI
streamlit run app.py

# Frontend
cd frontend
npm install
npm run dev                                 # Vite on :5173
# (fix API_BASE_URL in src/services/api.js to match the backend port)

# Scraper (one-shot)
python scraper.py
```

Required environment variables: `GOOGLE_API_KEY` plus PostgreSQL creds (`user`, `password`, `host`, `port`, `dbname`).

---

## 9. LIMITATIONS

- **Coverage:** Constitution + IPC + IT Act + Supreme Court only. CrPC, CPC, labour and tax law are not yet ingested.
- **Stats are in-memory.** `documents_processed` and `total_queries` reset on every server restart — not durable.
- **No auth, no rate-limit.** Any client can hit `/api/query`; an attacker can blow through the Gemini quota.
- **Single-language documents.** Source PDFs are English; multilingual queries work via the LLM but ground truth is English-only.
- **No streaming.** Responses are returned in one shot, so larger answers feel slower than they need to.
- **Frontend port mismatch** between `api.js` (8005) and `main.py` (8000) — needs to be fixed.
- **`agent.py` is dead code** in the current request path; it's an experimental Google ADK port not wired into FastAPI.

---

## 10. FUTURE WORK

1. Ingest CrPC, CPC, Evidence Act, Companies Act, IT Rules.
2. Persist stats and query history to a `query_logs` table.
3. Stream Gemini responses to the UI (Server-Sent Events) so long answers render progressively.
4. Add an answer cache keyed by query embedding to absorb repeat questions cheaply.
5. Bilingual response formatting (Hindi ↔ English) with the existing legal corpus.
6. Replace the in-memory dedupe with a re-ranker (e.g., cross-encoder) on top retrieved candidates.
7. Switch CORS to a real allowlist before any deployment.
8. Add automated evaluation: a fixed set of (question → expected article/section) pairs to measure retrieval precision per release.

---

## 11. CONCLUSION

Jurix is a working, citation-grounded legal RAG system for Indian law. Its strengths come from three deliberate choices: **separating statutes from case law in storage**, **letting the LLM plan retrieval per corpus**, and **chunking judgments by their natural sections** (with a summarized Facts block) before embedding. These let it answer both narrow statutory queries ("Article 21?") and broad reasoning questions ("how have courts interpreted equality?") from one endpoint, with verifiable links to the source judgment on IndianKanoon. It is not a substitute for a lawyer — but as a free first-line legal explainer, it closes a real gap.
