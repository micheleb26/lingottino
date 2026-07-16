import { Entity } from './Entity.js';
import { PROJECTILE } from '../config/constants.js';

// Proiettile (rock) che viaggia in orizzontale senza gravità e si
// autodistrugge dopo un po' di tempo o quando colpisce qualcosa.
//
// Nota: l'aggiunta a un gruppo fisico Arcade reinizializza il corpo
// (riattiva la gravità e azzera la velocità), quindi il moto va impostato
// con fire() DOPO aver aggiunto il proiettile al gruppo, non nel costruttore.
export class Projectile extends Entity {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
    }

    fire(direction, speed) {
        this.body.setAllowGravity(false);
        this.setVelocity(direction * speed, 0);
        this.setFlipX(direction < 0);

        this.lifeTimer = this.scene.time.delayedCall(PROJECTILE.LIFESPAN_MS, () => {
            if (this.active) this.destroy();
        });
        return this;
    }

    destroy(fromScene) {
        if (this.lifeTimer) {
            this.lifeTimer.remove();
            this.lifeTimer = null;
        }
        super.destroy(fromScene);
    }
}
