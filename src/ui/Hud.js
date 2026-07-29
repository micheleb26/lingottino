import { HeartsDisplay } from './HeartsDisplay.js';
import { AmmoDisplay } from './AmmoDisplay.js';
import { TIMER } from '../config/constants.js';

// HUD di gioco: punteggio (stile moderno con icona e bordo), vite a cuori e
// munizioni. Tutto fissato alla camera (scrollFactor 0) e sopra la scena.
export class Hud {
    constructor(scene, { lives, total = 8 }) {
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

        // --- Pratica: contatore documenti + prossimo da raccogliere (in alto a destra) ---
        const rx = scene.scale.width - 16;
        const nameFont = {
            fontFamily: '"Trebuchet MS", "Segoe UI", Arial, sans-serif',
            fontSize: '36px', fontStyle: 'bold', color: '#ffe14d',
            stroke: '#3a2a00', strokeThickness: 7
        };

        // Contatore "oggetti raccolti / totali".
        this.docCounter = scene.add.text(rx, 16, `0 / ${total}`, nameFont)
            .setOrigin(1, 0).setScrollFactor(0).setDepth(depth);
        this.docCounter.setShadow(2, 4, 'rgba(0,0,0,0.45)', 4, true, true);

        // Etichetta "Prossimo:".
        this.nextLabel = scene.add.text(rx, 58, 'Prossimo:', {
            fontFamily: '"Trebuchet MS", "Segoe UI", Arial, sans-serif',
            fontSize: '16px', color: '#ffffff'
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(depth);

        // Nome del prossimo documento + icona (icona posizionata alla sua sinistra).
        this.nextName = scene.add.text(rx, 78, '', {
            fontFamily: '"Trebuchet MS", "Segoe UI", Arial, sans-serif',
            fontSize: '20px', fontStyle: 'bold', color: '#ffe14d',
            stroke: '#3a2a00', strokeThickness: 5
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(depth);

        this.nextIcon = scene.add.image(rx, 88, '__DEFAULT')
            .setOrigin(1, 0.5).setScrollFactor(0).setDepth(depth).setVisible(false);
        this.nextIcon.setDisplaySize(30, 30);

        // --- Conto alla rovescia (sotto l'indicatore documenti) ---
        this.warning = false; // true quando il tempo sta per scadere
        this.timeText = scene.add.text(rx, 116, '', {
            fontFamily: '"Trebuchet MS", "Segoe UI", Arial, sans-serif',
            fontSize: '30px', fontStyle: 'bold', color: '#ffffff',
            stroke: '#3a2a00', strokeThickness: 6
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(depth);
        this.timeText.setShadow(2, 3, 'rgba(0,0,0,0.45)', 3, true, true);
        this.setTimeLeft(TIMER.LEVEL_SECONDS);
    }

    // Aggiorna il conto alla rovescia (secondi interi). Sotto i 15 secondi la
    // scritta diventa rossa e pulsa per dare urgenza.
    setTimeLeft(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        this.timeText.setText(`TEMPO  ${m}:${String(s).padStart(2, '0')}`);

        const warn = seconds <= 15;
        if (warn !== this.warning) {
            this.warning = warn;
            this.timeText.setColor(warn ? '#ff5a5a' : '#ffffff');
            this.scene.tweens.killTweensOf(this.timeText);
            this.timeText.setScale(1);
            if (warn) {
                this.scene.tweens.add({
                    targets: this.timeText,
                    scale: { from: 1, to: 1.12 },
                    duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
                });
            }
        }
    }

    // Aggiorna il contatore dei documenti raccolti, con un piccolo "pop".
    setDocProgress(collected, total) {
        this.docCounter.setText(`${collected} / ${total}`);
        this.scene.tweens.killTweensOf(this.docCounter);
        this.docCounter.setScale(1);
        this.scene.tweens.add({
            targets: this.docCounter,
            scale: { from: 1.35, to: 1 }, duration: 220, ease: 'Back.easeOut'
        });
    }

    // Indica il prossimo documento da raccogliere (icona + nome). null = nessuno
    // (pratica completa): nasconde l'indicatore.
    setNextDoc(def) {
        if (!def) {
            this.nextLabel.setVisible(false);
            this.nextName.setVisible(false);
            this.nextIcon.setVisible(false);
            return;
        }
        this.nextLabel.setVisible(true);
        this.nextName.setVisible(true).setText(def.name);
        this.nextIcon.setVisible(true).setTexture(def.key).setDisplaySize(30, 30);
        // L'icona sta alla sinistra del nome (che è allineato a destra).
        const nameLeft = this.nextName.x - this.nextName.width;
        this.nextIcon.setPosition(nameLeft - 8, this.nextName.y + this.nextName.height / 2);
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
        this.docCounter.destroy();
        this.nextLabel.destroy();
        this.nextName.destroy();
        this.nextIcon.destroy();
        this.timeText.destroy();
    }
}
