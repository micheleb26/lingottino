// Riattiva il contesto audio dopo un'interazione dell'utente.
// I browser sospendono l'audio finché non c'è un input dell'utente (policy autoplay).
export function unlockAudio(scene) {
    const ctx = scene.sound.context;
    if (ctx && ctx.state === 'suspended') {
        ctx.resume();
    }
}
