import { getSettings } from "./storage.js";

const audioCache = new Map();

export function playSound(src) {
    let audio = audioCache.get(src);
    const { soundEnabled, sfxVolume } = getSettings();
    if (!soundEnabled) {
        return;
    }

    if (!audio) {
        audio = new Audio(src);
        audioCache.set(src, audio);
    }

    audio.currentTime = 0;
    audio.volume = Math.max(0, Math.min(100, Number(sfxVolume))) / 100;
    audio.play().catch(() => {
        console.warn(`Failed to play audio: ${src}`);
    });
}