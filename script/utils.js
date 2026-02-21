// funzione globale per riattivare l'audio dopo un input dell'utente
export function unlockAudio(scene) {
    if (scene.sound.context.state === 'suspended') {
        scene.sound.context.resume();
    }
}