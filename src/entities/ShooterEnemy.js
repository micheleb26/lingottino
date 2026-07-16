import { Enemy } from './Enemy.js';
import { ENEMY } from '../config/constants.js';

// Nemico tiratore (Owlet Monster): pattuglia come il nemico base ma, quando
// il giocatore è in raggio e alla stessa altezza, si ferma e lancia un rock.
export class ShooterEnemy extends Enemy {
    constructor(scene, x, y, opts = {}) {
        super(scene, x, y, { ...opts, prefix: 'owlet' });
        // Sfasa il primo colpo così i tiratori non sparano tutti insieme.
        this.nextShotAt = scene.time.now + Phaser.Math.Between(400, ENEMY.SHOOT_COOLDOWN_MS);
        this.throwAnimUntil = 0;
    }

    update() {
        if (this.isDying) return;

        const now = this.scene.time.now;
        const shooting = now < this.throwAnimUntil;

        if (shooting) {
            this.setVelocityX(0);
        } else if (this.body.blocked.down) {
            this.patrol();
        }

        this.tryShoot(now);

        this.setFlipX(this.direction < 0);
        this.anims.play(`${this.prefix}-${shooting ? 'throw' : 'walk'}`, true);
    }

    tryShoot(now) {
        const player = this.scene.player;
        if (!player || player.isDead || now < this.nextShotAt) return;

        const dx = player.x - this.x;
        const sameLevel = Math.abs(player.y - this.y) < 60;
        if (Math.abs(dx) > ENEMY.SHOOT_RANGE || !sameLevel) return;

        this.direction = dx >= 0 ? 1 : -1; // guarda verso il giocatore
        this.setVelocityX(0);
        this.scene.fireEnemyBullet(this.x + this.direction * 14, this.y, this.direction);
        this.nextShotAt = now + ENEMY.SHOOT_COOLDOWN_MS;
        this.throwAnimUntil = now + 300;
    }
}
