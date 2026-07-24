import { Entity } from './Entity.js';
import { playShine } from '../ui/shine.js';

// Documento della pratica raccoglibile. Ne è presente uno solo alla volta:
// scintilla periodicamente per farsi notare, come i lingotti.
export class Document extends Entity {
    constructor(scene, x, y, def) {
        super(scene, x, y, def.key);
        this.def = def; // { key, name, type }

        this.sparkleEvent = scene.time.addEvent({
            delay: 1100,
            startAt: Phaser.Math.Between(0, 700),
            loop: true,
            callback: this.sparkle,
            callbackScope: this
        });
    }

    sparkle() {
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
