import { playShine } from './shine.js';

// Indicatore munizioni: icona + quantità. Per ora l'arma base è a munizioni
// illimitate (mostra ∞), ma è già pronto per le armi dei livelli futuri.
// Ogni tanto fa brillare l'icona, come i cuori.
export class AmmoDisplay {
    constructor(scene, x, y, { size = 34, shineEveryMs = 3000, depth = 1000 } = {}) {
        this.scene = scene;

        this.icon = scene.add.image(x + size / 2, y + size / 2, 'ammo')
            .setScrollFactor(0).setDepth(depth);
        this.icon.setDisplaySize(size, size);

        this.text = scene.add.text(x + size + 10, y + size / 2, '∞', {
            fontFamily: '"Trebuchet MS", "Segoe UI", Arial, sans-serif',
            fontSize: '26px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#222222',
            strokeThickness: 5
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(depth);

        this.shineEvent = scene.time.addEvent({
            delay: shineEveryMs,
            loop: true,
            callback: () => playShine(scene, this.icon, { fixed: true })
        });
    }

    setAmmo(value) {
        this.text.setText(value === Infinity ? '∞' : String(value));
    }

    destroy() {
        if (this.shineEvent) this.shineEvent.remove();
        this.icon.destroy();
        this.text.destroy();
    }
}
