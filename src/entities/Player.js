import { Entity } from './Entity.js';
import { PLAYER } from '../config/constants.js';

// Il personaggio giocabile (Pink Monster).
// Gestisce input (frecce + WASD + spazio + fuoco), movimento, salto con
// altezza variabile, coyote time, jump buffer e l'arma base a colpi illimitati.
export class Player extends Entity {
    constructor(scene, x, y) {
        super(scene, x, y, `${PLAYER.PREFIX}_idle`);
        this.prefix = PLAYER.PREFIX;

        this.setCollideWorldBounds(true);
        this.setBounce(PLAYER.BOUNCE);
        // Hitbox più stretta dello sprite 32x32: collisioni indulgenti, piedi in basso.
        this.body.setSize(16, 24).setOffset(8, 8);

        // Input: frecce + WASD + F per sparare.
        const kb = scene.input.keyboard;
        this.cursors = kb.createCursorKeys();
        this.keys = kb.addKeys({
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            up: Phaser.Input.Keyboard.KeyCodes.W,
            fire: Phaser.Input.Keyboard.KeyCodes.F
        });

        // Stato.
        this.facing = 1;             // 1 = destra, -1 = sinistra
        this.lastGroundedAt = 0;
        this.lastJumpPressedAt = -Infinity;
        this.nextFireAt = 0;
        this.fireHeldSince = 0;   // istante di inizio pressione continua (0 = non preme)
        this.tiredUntil = 0;      // finché now < tiredUntil il player è "stanco" e non spara
        this.throwAnimUntil = 0;
        this.invulnerable = false;
        this.isDead = false;
        this.stunUntil = 0;       // finché now < stunUntil è stordito (spruzzino)
        this.stunSprite = null;   // stelline che gli girano sopra la testa
    }

    // Stordito dallo spruzzino: per `ms` non può muoversi/saltare/sparare.
    makeStunned(ms) {
        this.stunUntil = this.scene.time.now + ms;
    }

    isStunned(now) {
        return now < this.stunUntil;
    }

    updateStun(show) {
        if (show) {
            if (!this.stunSprite) {
                this.stunSprite = this.scene.add.image(this.x, this.y - 22, 'stun')
                    .setDepth((this.depth || 0) + 2);
                this.scene.tweens.add({ targets: this.stunSprite, angle: 360, duration: 900, repeat: -1 });
            }
            this.stunSprite.setVisible(true).setPosition(this.x, this.y - 22);
        } else if (this.stunSprite) {
            this.stunSprite.setVisible(false);
        }
    }

    isLeftDown() {
        return this.cursors.left.isDown || this.keys.left.isDown;
    }

    isRightDown() {
        return this.cursors.right.isDown || this.keys.right.isDown;
    }

    isJumpDown() {
        return this.cursors.up.isDown || this.cursors.space.isDown || this.keys.up.isDown;
    }

    isJumpJustPressed() {
        const justDown = Phaser.Input.Keyboard.JustDown;
        return justDown(this.cursors.up) || justDown(this.cursors.space) || justDown(this.keys.up);
    }

    isFireDown() {
        return this.keys.fire.isDown;
    }

    update() {
        if (this.isDead) return;

        const now = this.scene.time.now;
        const onGround = this.body.blocked.down || this.body.touching.down;

        // --- Stordimento: nessun input, resta fermo con le stelline sopra ---
        if (this.isStunned(now)) {
            this.setVelocityX(0);
            this.updateStun(true);
            this.anims.play(`${this.prefix}-hurt`, true);
            return;
        }
        this.updateStun(false);

        // --- Movimento orizzontale ---
        if (this.isLeftDown()) {
            this.setVelocityX(-PLAYER.SPEED);
            this.facing = -1;
            this.setFlipX(true);
        } else if (this.isRightDown()) {
            this.setVelocityX(PLAYER.SPEED);
            this.facing = 1;
            this.setFlipX(false);
        } else {
            this.setVelocityX(0);
        }

        // --- Salto con coyote time + jump buffer ---
        if (onGround) this.lastGroundedAt = now;
        if (this.isJumpJustPressed()) this.lastJumpPressedAt = now;

        const canCoyote = now - this.lastGroundedAt <= PLAYER.COYOTE_MS;
        const bufferedJump = now - this.lastJumpPressedAt <= PLAYER.JUMP_BUFFER_MS;
        if (canCoyote && bufferedJump) {
            this.setVelocityY(-PLAYER.JUMP_VELOCITY);
            this.lastJumpPressedAt = -Infinity;
            this.lastGroundedAt = -Infinity;
        }

        // Altezza variabile: rilasciando il salto mentre salgo, taglio la velocità.
        if (!this.isJumpDown() && this.body.velocity.y < -PLAYER.JUMP_CUT_VELOCITY) {
            this.setVelocityY(-PLAYER.JUMP_CUT_VELOCITY);
        }

        // --- Fuoco (arma base, munizioni illimitate) ---
        // Tenendo premuto per FIRE_MAX_HOLD_MS consecutivi il player si stanca e
        // per FIRE_TIRED_MS non può sparare. Rilasciando prima, nessuna penalità.
        const fireDown = this.isFireDown();
        if (!fireDown) {
            this.fireHeldSince = 0; // rilasciato: azzera il conteggio -> niente penalità
        } else if (now >= this.tiredUntil) {
            // Preme e non è (più) stanco: conta la pressione continua.
            if (this.fireHeldSince === 0) this.fireHeldSince = now;
            else if (now - this.fireHeldSince >= PLAYER.FIRE_MAX_HOLD_MS) {
                this.tiredUntil = now + PLAYER.FIRE_TIRED_MS; // stanchezza!
                this.fireHeldSince = 0;
            }
        }

        if (fireDown && now >= this.tiredUntil && now >= this.nextFireAt) {
            this.scene.firePlayerBullet(this.x + this.facing * 14, this.y, this.facing);
            this.nextFireAt = now + PLAYER.FIRE_COOLDOWN_MS;
            this.throwAnimUntil = now + 220;
        }

        this.updateAnimation(now, onGround);
    }

    updateAnimation(now, onGround) {
        const moving = this.body.velocity.x !== 0;
        let action = 'idle';
        if (now < this.throwAnimUntil) action = 'throw';
        else if (!onGround) action = 'jump';
        else if (moving) action = 'walk';
        this.anims.play(`${this.prefix}-${action}`, true);
    }

    // Breve invulnerabilità con lampeggio dopo aver subito un danno.
    makeInvulnerable(duration) {
        this.invulnerable = true;
        this.scene.tweens.add({
            targets: this,
            alpha: { from: 1, to: 0.3 },
            duration: 120,
            yoyo: true,
            repeat: Math.floor(duration / 240)
        });
        this.scene.time.delayedCall(duration, () => {
            this.invulnerable = false;
            this.setAlpha(1);
        });
    }

    die() {
        this.isDead = true;
        this.setVelocity(0, 0);
        this.setTint(0xff5555);
        this.anims.play(`${this.prefix}-death`, true);
        if (this.stunSprite) { this.stunSprite.destroy(); this.stunSprite = null; }
    }
}
