import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const JINA_API = "https://api.jina.ai/v1/embeddings";
const model = "jina-embeddings-v3";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const jinaResponse = await axios.post(
      JINA_API,
      { model, input: query },
      { headers: { Authorization: `Bearer ${process.env.JINA_API_KEY}` } }
    );

    const embedding = jinaResponse.data.data[0].embedding;

    const { data, error } = await supabase.rpc('match_constraints', {
      query_vec: embedding,
      match_count: 5,
    });

    if (error) {
      console.error(error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ results: data });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
