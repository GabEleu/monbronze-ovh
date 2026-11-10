/**
 * Sons du site (BRIEF.md §3.6), COUPÉS PAR DÉFAUT et entièrement SYNTHÉTISÉS avec la
 * Web Audio API : aucun fichier audio tiers, donc aucune licence à gérer.
 *   - ambiance d'atelier : grondement grave du four (bruit filtré, respiration lente) ;
 *   - tintement : cloche métallique (synthèse additive, partiels inharmoniques du bronze) ;
 *   - ciselet : petit coup sec (bruit bref, filtre passe-bande).
 * Rien ne joue sans un geste explicite de l'utilisateur (bouton « Son »).
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let ambience: { stop: () => void } | null = null;
let enabled = false;

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
  }
  return ctx;
}

function noiseBuffer(c: AudioContext, seconds: number) {
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function startAmbience(c: AudioContext) {
  const source = c.createBufferSource();
  source.buffer = noiseBuffer(c, 4);
  source.loop = true;
  const low = c.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = 140;
  const gain = c.createGain();
  gain.gain.value = 0;
  gain.gain.linearRampToValueAtTime(0.16, c.currentTime + 2);
  // Respiration du four : légère modulation lente du volume.
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.12;
  const depth = c.createGain();
  depth.gain.value = 0.05;
  lfo.connect(depth).connect(gain.gain);
  source.connect(low).connect(gain).connect(master!);
  source.start();
  lfo.start();
  return {
    stop() {
      const t = c.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.6);
      source.stop(t + 0.7);
      lfo.stop(t + 0.7);
    },
  };
}

/** Active ou coupe le son (appelé depuis le bouton « Son », donc après un geste). */
export function setSoundEnabled(on: boolean) {
  enabled = on;
  if (!on) {
    ambience?.stop();
    ambience = null;
    return;
  }
  const c = audio();
  if (!c) return;
  if (c.state === "suspended") {
    // Son activé lors d'une visite précédente : on attend un geste pour reprendre.
    const resume = () => {
      void c.resume();
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
    window.addEventListener("pointerdown", resume);
    window.addEventListener("keydown", resume);
    void c.resume();
  }
  ambience ??= startAmbience(c);
}

/** Tintement du bronze (clic sur une sculpture). */
export function playTing() {
  if (!enabled) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  // Partiels inharmoniques d'une cloche en bronze.
  for (const [ratio, amp, decay] of [
    [1, 0.22, 2.4],
    [2.76, 0.12, 1.6],
    [5.4, 0.07, 0.9],
    [8.93, 0.04, 0.5],
  ] as const) {
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 660 * ratio;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(amp, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(g).connect(master!);
    osc.start(t);
    osc.stop(t + decay + 0.05);
  }
}

/** Petit coup de ciselet (survol de la section des ateliers). */
export function playChisel() {
  if (!enabled) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  const source = c.createBufferSource();
  source.buffer = noiseBuffer(c, 0.08);
  const band = c.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 3200 + Math.random() * 900;
  band.Q.value = 6;
  const g = c.createGain();
  g.gain.setValueAtTime(0.18, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  source.connect(band).connect(g).connect(master!);
  source.start(t);
}
