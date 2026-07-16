import { playShine } from './shine.js';

// Indicatore delle vite a forma di cuore: un cuore pieno (rosso) per ogni vita,
// un cuore vuoto (contorno grigio) per quelle perse. A intervalli regolari fa
// "brillare" un cuore pieno scelto a caso tra quelli mostrati.
export class HeartsDisplay {
    constructor(scene, x, y, maxLives, { size = 36, gap = 8, shineEveryMs = 2200, depth = 1000 } = {}) {
        this.scene = scene;
        this.maxLives = maxLives;
        this.lives = maxLives;
        this.hearts = [];

        for (let i = 0; i < maxLives; i++) {
            const cx = x + size / 2 + i * (size + gap);
            const cy = y + size / 2;

            const empty = scene.add.image(cx, cy, 'heart_empty')
                .setScrollFactor(0).setDepth(depth);
            const full = scene.add.image(cx, cy, 'heart_full')
                .setScrollFactor(0).setDepth(depth + 1);
            empty.setDisplaySize(size, size);
            full.setDisplaySize(size, size);

            this.hearts.push({ full, empty });
        }

        this.shineEvent = scene.time.addEvent({
            delay: shineEveryMs,
            loop: true,
            callback: this.shineRandom,
            callbackScope: this
        });
    }

    setLives(n) {
        this.lives = Phaser.Math.Clamp(n, 0, this.maxLives);
        this.hearts.forEach((h, i) => h.full.setVisible(i < this.lives));
    }

    // Riflesso su un cuore pieno scelto a caso tra quelli attualmente mostrati.
    shineRandom() {
        const visibleFull = this.hearts.slice(0, this.lives).map((h) => h.full);
        if (visibleFull.length === 0) return;
        playShine(this.scene, Phaser.Utils.Array.GetRandom(visibleFull), { fixed: true });
    }

    destroy() {
        if (this.shineEvent) this.shineEvent.remove();
        this.hearts.forEach((h) => { h.full.destroy(); h.empty.destroy(); });
        this.hearts = [];
    }
}
