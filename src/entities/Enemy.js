import { Entity } from './Entity.js';
import { ENEMY } from '../config/constants.js';

// Nemico base che cammina sulle piattaforme come nei platform classici:
// si gira al muro e al bordo della piattaforma (così non cade nel vuoto).
// In alternativa può avere limiti di pattuglia espliciti (patrolMin/patrolMax),
// utili sul pavimento continuo dove non ci sono bordi.
export class Enemy extends Entity {
    constructor(scene, x, y, { prefix = 'dude', speed = ENEMY.SPEED, hp = ENEMY.HP, patrolMin = null, patrolMax = null } = {}) {
        super(scene, x, y, `${prefix}_walk`);
        this.prefix = prefix;
        this.speed = speed;
        this.hp = hp;
        this.patrolMin = patrolMin;
        this.patrolMax = patrolMax;
        this.direction = 1; // 1 = destra, -1 = sinistra
        this.isDying = false;

        this.setCollideWorldBounds(true);
        this.body.setSize(16, 24).setOffset(8, 8);
    }

    update() {
        if (this.isDying) return;

        if (this.body.blocked.down) this.patrol();
        this.setFlipX(this.direction < 0);
        this.anims.play(`${this.prefix}-walk`, true);
    }

    // Inverte la direzione al muro, al bordo della piattaforma o ai limiti.
    patrol() {
        const dir = this.direction;
        const aheadX = dir > 0 ? this.body.right + 4 : this.body.left - 4;
        const groundAhead = this.scene.physics.overlapRect(aheadX - 3, this.body.bottom + 2, 6, 8, false, true);
        const hitWall = this.body.blocked.left || this.body.blocked.right;
        const pastMin = this.patrolMin != null && dir < 0 && this.x <= this.patrolMin;
        const pastMax = this.patrolMax != null && dir > 0 && this.x >= this.patrolMax;

        if (hitWall || groundAhead.length === 0 || pastMin || pastMax) {
            this.direction = -dir;
        }
        this.setVelocityX(this.speed * this.direction);
    }

    // Restituisce true se il nemico è morto per questo colpo.
    takeDamage(amount = 1) {
        if (this.isDying) return false;
        this.hp -= amount;
        if (this.hp <= 0) {
            this.die();
            return true;
        }
        this.anims.play(`${this.prefix}-hurt`, true);
        return false;
    }

    // Colpo d'ascia dato al player alla collisione. L'ascia NON esiste mentre
    // cammina: viene creata solo qui, fa un fendente e sparisce.
    swingAxe() {
        if (this.axe) return; // fendente già in corso
        const dir = this.direction;
        const axe = this.scene.add.image(this.x + dir * 11, this.y - 4, 'axe')
            .setDepth((this.depth || 0) + 1)
            .setOrigin(0.5, 0.9)
            .setFlipX(dir < 0)
            .setAngle(dir < 0 ? 62 : -62); // alzata all'indietro
        this.axe = axe;

        this.scene.tweens.add({
            targets: axe,
            angle: dir < 0 ? -28 : 28,     // fendente in avanti/basso
            duration: 200,
            ease: 'Quad.easeIn',
            onComplete: () => {
                this.scene.time.delayedCall(80, () => {
                    if (axe.active) axe.destroy();
                    if (this.axe === axe) this.axe = null;
                });
            }
        });
    }

    die() {
        if (this.isDying) return;
        this.isDying = true;
        this.setVelocity(0, 0);
        if (this.body) this.body.enable = false;
        if (this.axe) { this.axe.destroy(); this.axe = null; }
        this.anims.play(`${this.prefix}-death`, true);
        this.once('animationcomplete', () => this.destroy());
    }
}
