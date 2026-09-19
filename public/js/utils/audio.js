import { getSettings } from "./storage";

const audioCache = new Map();

export function playSound(src) {
    let audio = audioCache.get(src);
    const { enabledSound, effectVolume } = getSettings();
    if (!enabledSound) {
        return;
    }

    if (!audio) {
        audio = new Audio(src);
        audioCache.set(src, audio);
    }

    audio.currentTime = 0;
    audio.volume = effectVolume;
    audio.play().catch(() => {
        console.warn(`Failed to play audio: ${src}`);
    });
}