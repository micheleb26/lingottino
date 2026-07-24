import { PIGEON } from '../config/constants.js';

// Piccione dispettoso. Vola in orizzontale avanti e indietro a un'altezza FISSA
// dello schermo (scrollFactor 0: non segue lo scorrimento del mondo, resta
// sempre visibile). Sbatte le ali (animazione 'pigeon-fly') per dare il senso
// del volo. Parte da destra e va verso sinistra. Quando passa più o meno sopra
// il giocatore, gli scarica addosso una cacca mirata. Non è un oggetto fisico:
// si muove a mano.
export class Pigeon extends Phaser.GameObjects.Sprite {
    constructor(scene, screenX) {
        super(scene, screenX, PIGEON.SCREEN_Y, 'pigeon', 0);
        scene.add.existing(this);
        this.setScrollFactor(0).setDepth(500);
        this.play('pigeon-fly');

        this.dir = -1;             // parte verso sinistra
        this.setFlipX(true);       // sprite disegnato verso destra -> specchiato
        this.nextPoopAt = 0;
    }

    // Chiamato dal GameScene ogni frame (delta in ms).
    update(now, delta) {
        // Movimento orizzontale con rimbalzo ai bordi dello schermo.
        this.x += this.dir * PIGEON.SPEED * (delta / 1000);
        const w = this.scene.scale.width;
        if (this.x <= PIGEON.MARGIN) { this.x = PIGEON.MARGIN; this.dir = 1; }
        else if (this.x >= w - PIGEON.MARGIN) { this.x = w - PIGEON.MARGIN; this.dir = -1; }
        this.setFlipX(this.dir === -1);

        // Se è più o meno sopra il player e la cacca è "ricaricata", molla il colpo.
        const player = this.scene.player;
        if (!player || player.isDead || now < this.nextPoopAt) return;

        // Posizione nel mondo sotto al piccione (è in coordinate schermo).
        const worldX = this.scene.cameras.main.scrollX + this.x;
        if (Math.abs(worldX - player.x) <= PIGEON.AIM_THRESHOLD) {
            this.scene.spawnPoop(worldX, this.y);
            this.nextPoopAt = now + PIGEON.POOP_COOLDOWN_MS;
        }
    }
}
