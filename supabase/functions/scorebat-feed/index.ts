// SURESTREAM V30 — ScoreBat adapter. Secret is stored as SCOREBAT_API_TOKEN in Supabase Edge Function secrets.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "GET, OPTIONS", "Content-Type": "application/json" };
serve(async (req) => {
 if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
 if (req.method !== "GET") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });
 const token = Deno.env.get("SCOREBAT_API_TOKEN");
 if (!token) return new Response(JSON.stringify({ error: "ScoreBat is not configured", code: "PROVIDER_NOT_CONFIGURED", items: [] }), { status: 503, headers: cors });
 try {
  const endpoint = Deno.env.get("SCOREBAT_API_URL") || "https://www.scorebat.com/video-api/v3/feed/";
  const url = new URL(endpoint); url.searchParams.set("token", token);
  const upstream = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
  if (!upstream.ok) return new Response(JSON.stringify({ error: "ScoreBat feed request failed", status: upstream.status, items: [] }), { status: 502, headers: cors });
  const payload = await upstream.json(); const items = Array.isArray(payload.response) ? payload.response : [];
  return new Response(JSON.stringify({ provider: "scorebat", mode: "free-feed", items, note: "ScoreBat free-feed content may be older, limited by league, and include provider branding or ads. This feed is not a live-broadcast entitlement." }), { headers: { ...cors, "Cache-Control": "public, max-age=60, s-maxage=180" } });
 } catch { return new Response(JSON.stringify({ error: "Unable to reach ScoreBat", items: [] }), { status: 502, headers: cors }); }
});
