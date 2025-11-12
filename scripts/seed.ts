import * as dotenv from 'dotenv'
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const JINA_API = "https://api.jina.ai/v1/embeddings";
const model = "jina-embeddings-v3";

const constraints = [
  { template: "Constraint 1", text: "The player must be older than 18." },
  { template: "Constraint 2", text: "The match should last 90 minutes." },
  { template: "Constraint 3", text: "Team size should not exceed 11 players." },
];

async function generateEmbedding(text: string) {
  const res = await axios.post(
    JINA_API,
    { input: text, model },
    {
      headers: {
        Authorization: `Bearer ${process.env.JINA_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
  return res.data.data[0].embedding;
}

async function main() {
  for (const c of constraints) {
    const embedding = await generateEmbedding(c.text);
    const { error } = await supabase.from("constraints_corpus").insert({
      template: c.template,
      text: c.text,
      emb: embedding,
    });
    if (error) console.error(error);
    else console.log(`Inserted: ${c.template}`);
  }
  console.log("Seeding complete!");
}

main().catch(console.error);

