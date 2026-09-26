import { CONFIG } from './config.js';

// Replace this oscillator bed with local ambience files when they become available.
// Placeholders require no downloaded or copyrighted assets.
export function startAmbience() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return { stop() {} };
    const ctx = new AudioContext(); const gain = ctx.createGain(); gain.gain.value = CONFIG.audio.volume; gain.connect(ctx.destination);
    const osc = ctx.createOscillator(), lfo = ctx.createOscillator(), mod = ctx.createGain();
    const low = ctx.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 110;
    osc.type = 'sine'; osc.frequency.value = CONFIG.audio.frequency; lfo.frequency.value = 0.12; mod.gain.value = 1.2;
    lfo.connect(mod); mod.connect(osc.frequency); osc.connect(low); low.connect(gain); osc.start(); lfo.start();
    return { stop() { gain.gain.setTargetAtTime(0, ctx.currentTime, .3); setTimeout(() => ctx.close(), 1000); } };
  } catch { return { stop() {} }; }
}
