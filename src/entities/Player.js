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
        this.throwAnimUntil = 0;
        this.invulnerable = false;
        this.isDead = false;
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
        if (this.isFireDown() && now >= this.nextFireAt) {
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
    }
}
