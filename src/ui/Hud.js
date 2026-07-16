import { HeartsDisplay } from './HeartsDisplay.js';
import { AmmoDisplay } from './AmmoDisplay.js';

// HUD di gioco: punteggio (stile moderno con icona e bordo), vite a cuori e
// munizioni. Tutto fissato alla camera (scrollFactor 0) e sopra la scena.
export class Hud {
    constructor(scene, { lives }) {
        this.scene = scene;
        const depth = 1000;

        // --- Punteggio ---
        this.coin = scene.add.image(32, 34, 'ingot')
            .setScrollFactor(0).setDepth(depth);
        this.coin.setDisplaySize(34, 23);

        this.scoreText = scene.add.text(54, 34, '0', {
            fontFamily: '"Trebuchet MS", "Segoe UI", Arial, sans-serif',
            fontSize: '36px',
            fontStyle: 'bold',
            color: '#ffe14d',
            stroke: '#3a2a00',
            strokeThickness: 7
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(depth);
        this.scoreText.setShadow(2, 4, 'rgba(0,0,0,0.45)', 4, true, true);

        // --- Vite (cuori) ---
        this.hearts = new HeartsDisplay(scene, 16, 60, lives, { depth });

        // --- Munizioni (illimitate per ora) ---
        this.ammo = new AmmoDisplay(scene, 16, 110, { depth });
        this.ammo.setAmmo(Infinity);
    }

    setScore(value) {
        this.scoreText.setText(String(value));
        // Piccolo "pop" del punteggio (juice da platformer).
        this.scene.tweens.killTweensOf(this.scoreText);
        this.scoreText.setScale(1);
        this.scene.tweens.add({
            targets: this.scoreText,
            scale: { from: 1.35, to: 1 },
            duration: 220,
            ease: 'Back.easeOut'
        });
    }

    setLives(n) {
        this.hearts.setLives(n);
    }

    setAmmo(value) {
        this.ammo.setAmmo(value);
    }

    destroy() {
        this.coin.destroy();
        this.scoreText.destroy();
        this.hearts.destroy();
        this.ammo.destroy();
    }
}
