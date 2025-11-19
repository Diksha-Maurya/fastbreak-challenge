# FastBreak Constraint Search – Template Matching Engine

This project implements a search pipeline that classifies natural-language sports scheduling constraints into predefined templates using embeddings and vector similarity. It includes a Next.js frontend, Supabase backend, and Jina embedding service.

---

## 🚀 **Live Demo**

**Frontend:** [https://fastbreak-challenge.vercel.app/](https://fastbreak-challenge.vercel.app/)

---

## 📦 **Setup Instructions**

### **1. Clone the repository**

```bash
git clone https://github.com/Diksha-Maurya/fastbreak-challenge.git
cd fastbreak-challenge
```

---

### **2. Install dependencies**

#### **Backend / Next.js**

```bash
npm install
```

---

### **3. Create your environment file**

Create a file *.env.local* in the root folder with the template below:

```bash
JINA_API_KEY=<PUT VALUES HERE>
NEXT_PUBLIC_SUPABASE_URL=<PUT VALUES HERE>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<PUT VALUES HERE>
NEXT_PUBLIC_SITE_URL=<PUT VALUES HERE>
```

Update the variables with your real values.

---

### **4. Run the development server**

```bash
npm run dev
```

Your app will be available on:

```
http://localhost:3000
```

---

## 🧱 **Architecture Overview**

### **1. Frontend (Next.js App Router)**

* Once logged-in, the UI provides a clean search interface on the `/search` page.
* Calls `/api/search` and receives the nearest embedding matches.
* Converts cosine distance into a **confidence score**.
* Uses regex-based parsing to extract structured parameters:
  - `min`, `max`
  - `games`
  - `rounds`
  - `venues`
  - `networks`
  - `teams`
* Builds a normalized English constraint (`parsedConstraint`) based on the matched template.
* Shows **alternatives** when confidence is low.

---

### **2. Backend (Next.js API Routes)**

* Receives search query.
* Embeds user text using **Jina Embeddings v4**.
* Performs vector similarity search via a Supabase RPC (`search_constraints`) that uses pgvector inside Postgres.
* Calls a Supabase RPC `search_constraints(q, k)` that returns:
  - `template`
  - `text`
  - `distance` (pgvector cosine distance)
* Applies heuristic “nudging” to distance based on query text.
* Returns sorted results to the frontend.

---

### **3. Database (Supabase + pgvector)**

This project uses Postgres with the `pgvector` extension (via Supabase) to store embeddings for each constraint example.

#### Enable `pgvector`

In the Supabase SQL editor, run:

```sql
-- Enable pgvector extension (may also be enabled via the Supabase UI)
create extension if not exists vector;
```

#### Create tables

```sql
-- TEMPLATES: defines each constraint category
create table if not exists templates (
  id       serial primary key,
  name     text not null unique,
  ordinal  int  unique not null
);

-- CONSTRAINTS_CORPUS: sample/example texts tied to a template
create table if not exists constraints_corpus (
  id          bigserial primary key,
  template_id int  not null references templates(id) on delete cascade,
  text        text not null,
  emb         vector(1024) not null
);
```

#### Indexes

```sql
-- Avoid duplicate examples for the same template
create unique index if not exists constraints_corpus_unique
  on constraints_corpus (template_id, text);

-- Speed up lookups by template
create index if not exists constraints_corpus_template_id_idx
  on constraints_corpus (template_id);

-- Vector index for fast similarity search
create index if not exists constraints_corpus_emb_ivfflat_idx
  on constraints_corpus
  using ivfflat (emb vector_cosine_ops);
```
---

### **4. Embeddings Service**

* Uses Jina AI Embeddings API:

  * Endpoint: `https://api.jina.ai/v1/embeddings`
  * Model: `jina-embeddings-v4` [https://jina.ai/models/jina-embeddings-v4]
* Embedding dimension: **1024**
* Returned vector used for vector search against pgvector.

---

## 🔍 **Search Implementation Explained**

### **1. User enters a query**

Text is sent to:

```
POST /api/search
{
  "query": "at least 2 back-to-back games before bye"
}
```

---

### 2. Pipeline inside `/api/search`

1. **Embed the query using Jina**
   - The API route calls `https://api.jina.ai/v1/embeddings` with `jina-embeddings-v4`.
   - The returned embedding is a 1024-dimensional vector.

2. **Vector search via Supabase RPC**
   - The query embedding is passed to a Postgres function `search_constraints(q, k)`.
   - `search_constraints` performs a pgvector similarity search over `constraints_corpus.emb` and returns the top `k` matches, including:
     - `template`
     - `text`
     - `distance` (pgvector cosine-distance metric: lower = more similar)

3. **Heuristic template nudging**
   - Before returning results, the API applies small adjustments (“nudges”) to `distance` based on the query text:
     - Sequence / back-to-back language → favors **Template 2**.
     - Per-team schedule pattern language → favors **Template 3**.
     - Generic scheduling with networks/venues/rivalry → tiny nudge toward **Template 1**.
   - The adjusted results are re-sorted by distance and sent back to the frontend.

4. **Response**
   - The route returns:
     ```json
     {
       "results": [
         {
           "template": "Template 2: Sequence Constraints",
           "text": "...",
           "distance": 0.21,
           "...": "other columns from search_constraints"
         },
         ...
       ]
     }
     ```


#### **Step C — Scoring and confidence**

* The closest match (smallest distance) is chosen as the top template.
* Similarity is computed as: `similarity = 1 - distance`
* Confidence is mapped to `[0, 1]` using:
  `confidence = (similarity + 1) / 2`
* When confidence < 0.75, alternative matches are included.

---

### **3. Parameter Extraction (Frontend)**

Regex-based parsing on the frontend extracts:
- `min`, `max`
- `games`
- `rounds`
- `venues`
- `networks`
- `teams`

These values are then assembled into a normalized English constraint via
`buildParsedConstraint(template, parameters)`.

If parameters are empty or confidence < 0.7, the UI avoids hallucination and shows a helpful error instead.

---

## 🗂️ Project Structure

```
/src
    /app
        /api/search
            /route.ts
        /auth
            /callback
            /sign-in
            /sign-out
        /search/page.tsx
/scripts
    seed.ts
.env.example
README.md
```

---

## 🛠️ **Tech Stack**

* **Next.js 14 (App Router)**
* **TypeScript**
* **Supabase (Postgres + pgvector)**
* **Jina Embeddings v4**
* **TailwindCSS**
* **Vercel (Deployment)**

---

## 🧪 Seeding the Database

Run:

```bash
npm run seed
```


This will:

* Insert templates
* Insert corpus examples
* Generate embeddings
* Upload to Supabase

---

## **Future Improvements** 

Since this project focuses on semantic template selection rather than full NLP parsing, a few enhancements could further improve accuracy and robustness:

* LLM-based parameter extraction: Replace heuristics with a small LLM call for better handling of team names, rounds, and complex phrasing.

* Expanded template examples: Adding more paraphrases would tighten embedding clusters and reduce borderline misclassifications.

* Smarter entity recognition: Improve detection of teams, venues, and rounds using a small dictionary or lightweight NER model.

* Better negation & number parsing: Handle cases like “never,” “exactly,” or “no later than” more precisely.

* More natural parsed constraints: Generate cleaner, user-friendly constraint sentences instead of a strict canonical structure.

These improvements are not required for the challenge but would make the system more robust and production-ready.

---
