import { Entity } from './Entity.js';
import { playShine } from '../ui/shine.js';

// Lingotto d'oro raccoglibile. Ogni lingotto scintilla periodicamente, con un
// ritmo sfasato in modo che non brillino tutti insieme.
export class Ingot extends Entity {
    constructor(scene, x, y) {
        super(scene, x, y, 'ingot');

        this.sparkleEvent = scene.time.addEvent({
            delay: Phaser.Math.Between(900, 1500),
            startAt: Phaser.Math.Between(0, 900), // sfasamento iniziale
            loop: true,
            callback: this.sparkle,
            callbackScope: this
        });
    }

    sparkle() {
        // Salta se è stato raccolto (disabilitato/invisibile).
        if (!this.active || !this.visible) return;
        playShine(this.scene, this);
    }

    destroy(fromScene) {
        if (this.sparkleEvent) {
            this.sparkleEvent.remove();
            this.sparkleEvent = null;
        }
        super.destroy(fromScene);
    }
}
