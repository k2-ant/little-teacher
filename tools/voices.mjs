// Generate the students' Spanish voice clips with ElevenLabs.
// Usage: ELEVENLABS_API_KEY=... node tools/voices.mjs   (skips clips that already exist)
import fs from 'fs';
import path from 'path';
import { allPhrases, owlOnlyPhrases, ttsText, clipSlug } from '../js/i18n.js';

export const VOICES = {
  bunny: { id: 'CPv3Zr3CQCqE4ZzuCgBP', name: 'Lulu - Adorable, Bright & Playful' },
  puppy: { id: 'ihKwLOjVUMG4lgUI6meZ', name: 'Leo - Curious Character' },
  turtle: { id: 'WOY6pnQ1WCg0mrOZ54lM', name: 'Thorthugo - Playful, High-pitched Friend' },
  owl: { id: 'U9tZtg3uJtVgXPkvosWR', name: 'Kate - Playful Latina Storyteller' },
  frog: { id: 'iFhPOZcajR7W3sDL39qJ', name: 'Blackie - Girlish, Cute, and Cheerful' },
};
const KEY = process.env.ELEVENLABS_API_KEY || 'proxy-injected';
const OUT = 'audio';
const phrases = allPhrases(), owlOnly = owlOnlyPhrases();
const jobs = [];
for (const [kind, v] of Object.entries(VOICES)) {
  fs.mkdirSync(path.join(OUT, kind), { recursive: true });
  for (const key of kind === 'owl' ? [...phrases, ...owlOnly] : phrases) {
    const file = path.join(OUT, kind, clipSlug(key) + '.mp3');
    if (!fs.existsSync(file)) jobs.push({ kind, voice: v.id, key, file });
  }
}
console.log(`${phrases.length} phrases x ${Object.keys(VOICES).length} voices, ${jobs.length} clips to make`);

async function tts(job, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${job.voice}?output_format=mp3_44100_64`, {
      method: 'POST',
      headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({
        text: ttsText(job.key),
        model_id: 'eleven_multilingual_v2',
        language_code: 'es',
        voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true },
      }),
    }).catch(e => ({ ok: false, status: 0, text: async () => String(e) }));
    if (res.ok) { fs.writeFileSync(job.file, Buffer.from(await res.arrayBuffer())); return true; }
    const msg = await res.text();
    if (res.status === 400 && /language_code/.test(msg) && i === 0) { job.noLang = true; }
    console.warn(`retry ${job.kind} "${job.key}": ${res.status} ${msg.slice(0, 160)}`);
    await new Promise(r => setTimeout(r, 1500 * (i + 1)));
  }
  return false;
}
let done = 0, failed = 0;
const workers = Array.from({ length: 4 }, async () => {
  while (jobs.length) {
    const j = jobs.shift();
    if (await tts(j)) done++; else failed++;
    if ((done + failed) % 50 === 0) console.log(`${done} done, ${failed} failed`);
  }
});
await Promise.all(workers);

// manifest: phrase -> file slug, per voice
const manifest = { voices: Object.fromEntries(Object.entries(VOICES).map(([k, v]) => [k, v.name])), clips: {}, owlOnly };
for (const key of [...phrases, ...owlOnly]) manifest.clips[key] = clipSlug(key);
fs.writeFileSync(path.join(OUT, 'clips.json'), JSON.stringify(manifest, null, 1));
console.log(`finished: ${done} made, ${failed} failed`);
