import { supabase } from './supabase';
export type VideoItem = { title?: string; embed?: string; videos?: Array<{title?: string; embed?: string}>; url?: string; [key:string]: unknown };
export type VideoFeedResult = { provider: string; mode: string; items: VideoItem[]; note?: string; error?: string };
/** Provider-neutral interface: future DAZN/other approved provider adapters implement the same contract. */
export async function getVideoFeed(): Promise<VideoFeedResult> {
 if (supabase) {
  const { data, error } = await supabase.functions.invoke('scorebat-feed', { method: 'GET' });
  if (!error && data) return { provider: data.provider || 'scorebat', mode: data.mode || 'free-feed', items: Array.isArray(data.items) ? data.items : [], note: data.note, error: data.error };
 }
 const response = await fetch('/api/scorebat');
 const data = await response.json();
 if (!response.ok) throw new Error(data.error || 'Video provider unavailable');
 return { provider: data.provider || 'scorebat', mode: 'free-feed', items: data.items || data.response || [], note: data.note };
}
