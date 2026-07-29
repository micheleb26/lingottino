import { GAME, PLAYER, ENEMY, PROJECTILE, SCORE, SCENES, TAUNT, WIN_TEXT, TIMER, TIMEOUT_TEXT, DEATH_TEXT, PIGEON, LEVELS, SPRAY, STUN } from '../config/constants.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { ShooterEnemy } from '../entities/ShooterEnemy.js';
import { Projectile } from '../entities/Projectile.js';
import { Ingot } from '../entities/Ingot.js';
import { Document } from '../entities/Document.js';
import { Pigeon } from '../entities/Pigeon.js';
import { Hud } from '../ui/Hud.js';

// Scena principale di gioco: livello, player, nemici, lingotti, bombe e proiettili.
export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENES.GAME });
    }

    init(data) {
        this.level = (data && data.level) || 1;
        this.cfg = LEVELS[this.level] || LEVELS[1];

        this.score = 0;
        this.lives = GAME.START_LIVES;
        this.isPaused = false;
        this.isGameOver = false;
        this.isWin = false;
        this.isTimeUp = false;
        this.docIndex = 0;       // quanti oggetti già raccolti (= indice del prossimo)
        this.lastDocX = -999;    // ultima x di spawn, per non ripeterla
        this.timeLeftMs = TIMER.LEVEL_SECONDS * 1000; // conto alla rovescia del livello
        this.lastShownSecond = null;
        this.playerSplat = null; // macchia di cacca sulla spalla del player
        this.playerSplatUntil = 0;
        this.collectibleSet = this.cfg.collectibles;
        this.checks = [];        // assegni bonus attivi
        this.sprayNextAt = 0;
    }

    create() {
        const W = this.cfg.worldWidth, H = GAME.HEIGHT;

        this.physics.world.setBounds(0, 0, W, H);
        this.cameras.main.setBounds(0, 0, W, H);

        // Sfondo: un solo tileSprite invece di tante immagini ripetute.
        this.add.tileSprite(0, 0, W, H, 'sky').setOrigin(0, 0);

        this.createPlatforms();
        this.createPlayer();
        this.createEnemies();
        this.createProjectiles();
        this.createIngots();
        this.createBombs();
        this.createPigeon();
        this.createSpray();
        this.createUI();
        this.createCollectibles(); // dopo la UI: il primo spawn aggiorna l'HUD
        this.startMusic();
        this.bindKeys();
    }

    update(time, delta) {
        if (this.isPaused || this.isGameOver || this.isWin) return;

        this.updateTimer(delta);
        if (this.isGameOver) return; // il tempo può essere scaduto in questo frame

        this.player.update();
        this.enemies.children.iterate((enemy) => {
            if (enemy && enemy.active) enemy.update();
        });
        this.pigeon.update(time, delta);
        this.updatePlayerSplat();
        this.checkSecretHit();
        this.updateCheckPickup();
        this.checkSpray();
    }

    // --- Costruzione del livello ---

    createPlatforms() {
        const B = GAME.BLOCK; // 32
        this.platforms = this.physics.add.staticGroup();

        // Pavimento: una fila di blocchi lungo tutto il mondo.
        for (let x = 0; x < this.cfg.worldWidth; x += B) {
            this.addBlock(x, GAME.HEIGHT - B);
        }

        // Piattaforme sospese del livello: righe di blocchi.
        this.cfg.platforms.forEach((p) => {
            for (let i = 0; i < p.n; i++) this.addBlock(p.x + i * B, p.y);
        });

        // Blocchi SEGRETI: blocchi IDENTICI agli altri (tessere di piattaforme),
        // ognuno con il proprio bonus. Si scoprono colpendoli dal basso.
        this.secretBlocks = this.cfg.secretBlocks.map((s) => ({
            block: this.addBlock(s.x, s.y), bonus: s.bonus, used: false
        }));
    }

    // Crea un singolo blocco statico 32x32 (origine in alto a sinistra) e lo
    // restituisce.
    addBlock(x, y) {
        return this.platforms.create(x, y, 'block').setOrigin(0, 0).refreshBody();
    }

    createPlayer() {
        this.player = new Player(this, 100, 450);
        this.physics.add.collider(this.player, this.platforms);

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setDeadzone(200, 120);
    }

    createEnemies() {
        this.enemies = this.physics.add.group();

        // Nemici del livello: 'owlet' = tiratore, tutti gli altri = camminatore.
        this.cfg.enemies.forEach((d) => {
            const enemy = d.type === 'owlet'
                ? new ShooterEnemy(this, d.x, d.y, d)
                : new Enemy(this, d.x, d.y, { prefix: 'dude', ...d });
            this.enemies.add(enemy);
        });

        this.physics.add.collider(this.enemies, this.platforms);
        this.physics.add.overlap(this.player, this.enemies, this.onPlayerHitEnemy, null, this);
    }

    createProjectiles() {
        this.playerBullets = this.physics.add.group();
        this.enemyBullets = this.physics.add.group();

        this.physics.add.overlap(this.playerBullets, this.enemies, this.onBulletHitEnemy, null, this);
        this.physics.add.overlap(this.enemyBullets, this.player, this.onEnemyBulletHitPlayer, null, this);
        this.physics.add.collider(this.playerBullets, this.platforms, this.destroyBullet, null, this);
        this.physics.add.collider(this.enemyBullets, this.platforms, this.destroyBullet, null, this);
    }

    createIngots() {
        this.ingots = this.physics.add.group();

        for (let x = 100; x < this.cfg.worldWidth; x += 150) {
            const ingot = new Ingot(this, x, 0);
            this.ingots.add(ingot);
            // Configura il corpo DOPO l'add (il gruppo reinizializza il corpo).
            ingot.setCollideWorldBounds(true);
            ingot.setBounceY(Phaser.Math.FloatBetween(0.2, 0.5));
        }

        this.physics.add.collider(this.ingots, this.platforms);
        this.physics.add.overlap(this.player, this.ingots, this.onCollectIngot, null, this);
    }

    // Oggetti da raccogliere (documenti nel liv.1, contratti nel liv.2): uno
    // alla volta, in sequenza; il successivo appare quando si raccoglie il
    // precedente, in una posizione X casuale della mappa.
    createCollectibles() {
        this.documents = this.physics.add.group();
        this.physics.add.collider(this.documents, this.platforms);
        this.physics.add.overlap(this.player, this.documents, this.onCollectDocument, null, this);
        this.spawnNextCollectible();
    }

    spawnNextCollectible() {
        const def = this.collectibleSet[this.docIndex];
        if (!def) return; // pratica completa

        // X casuale, lontana dal player e dall'ultima usata; cade dall'alto.
        const W = this.cfg.worldWidth;
        let x = Phaser.Math.Between(120, W - 120);
        for (let tries = 0; tries < 20; tries++) {
            if (Math.abs(x - this.player.x) > 220 && Math.abs(x - this.lastDocX) > 200) break;
            x = Phaser.Math.Between(120, W - 120);
        }
        this.lastDocX = x;

        const doc = new Document(this, x, 0, def);
        this.documents.add(doc);
        doc.setCollideWorldBounds(true);
        doc.setBounceY(0.2);

        this.hud.setNextDoc(def);
    }

    createBombs() {
        this.bombs = this.physics.add.group();
        this.physics.add.collider(this.bombs, this.platforms);
        this.physics.add.collider(this.player, this.bombs, this.onPlayerHitBomb, null, this);
    }

    // Piccione + le sue cacche. Il piccione è in coordinate schermo (vedi Pigeon),
    // le cacche invece sono oggetti fisici del mondo che cadono col peso.
    createPigeon() {
        this.poops = this.physics.add.group();
        this.physics.add.overlap(this.player, this.poops, this.onPlayerHitPoop, null, this);
        this.physics.add.collider(this.poops, this.platforms, this.onPoopHitGround, null, this);
        this.pigeon = new Pigeon(this, this.scale.width - PIGEON.MARGIN); // parte da destra
    }

    // Colpo "alla Mario": ogni frame controllo se il player ha appena sbattuto
    // la testa (blocked/touching up) proprio sotto il blocco segreto. Il blocco
    // resta un normale membro solido di this.platforms (così i nemici ci
    // camminano sopra); la rilevazione qui evita conflitti tra collider.
    checkSecretHit() {
        const p = this.player.body;
        if (!(p.blocked.up || p.touching.up)) return;
        for (const s of this.secretBlocks) {
            if (s.used) continue;
            const b = s.block;
            if (p.center.x > b.x && p.center.x < b.x + GAME.BLOCK) {
                s.used = true;
                this.animateSecretHit(b);
                this.revealCheck(b, s.bonus);
                break;
            }
        }
    }

    // Animazione della botta: sobbalzo del blocco + lampo bianco.
    animateSecretHit(block) {
        const y0 = block.y;
        this.tweens.add({ targets: block, y: y0 - 8, duration: 90, yoyo: true, ease: 'Quad.easeOut' });

        // Lampo bianco che sfuma (stesso blocco, tinta piena bianca).
        const flash = this.add.image(block.x, block.y, 'block')
            .setOrigin(0, 0).setDepth(block.depth + 1).setTintFill(0xffffff).setAlpha(0.85);
        this.tweens.add({
            targets: flash, y: y0 - 8, alpha: 0, duration: 260, ease: 'Quad.easeOut',
            onComplete: () => flash.destroy()
        });
    }

    // Gli assegni sono immagini semplici (non fisiche): li muovo con i tween e
    // la raccolta la controllo a mano, così la fisica non combatte l'ondeggio.
    updateCheckPickup() {
        for (let i = this.checks.length - 1; i >= 0; i--) {
            const c = this.checks[i].sprite;
            if (!c.active) { this.checks.splice(i, 1); continue; }
            if (Math.abs(this.player.x - c.x) < 28 && Math.abs(this.player.y - c.y) < 24) {
                this.onCollectCheck(i);
            }
        }
    }

    // L'assegno compare SOPRA il blocco (posizione di riposo) ed è raccoglibile.
    revealCheck(block, bonus) {
        const cx = block.x + GAME.BLOCK / 2;
        const restY = block.y - 26;
        const sprite = this.add.image(cx, restY + 14, 'check').setDepth(6);
        this.checks.push({ sprite, bonus });

        this.tweens.add({
            targets: sprite, y: restY, duration: 300, ease: 'Back.easeOut',
            onComplete: () => {
                if (!sprite.active) return;
                this.tweens.add({
                    targets: sprite, y: restY - 4,
                    duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
                });
            }
        });
    }

    onCollectCheck(index) {
        const entry = this.checks[index];
        if (!entry || !entry.sprite.active) return;
        const c = entry.sprite, x = c.x, y = c.y, bonus = entry.bonus;
        c.destroy();
        this.checks.splice(index, 1);
        this.addScore(bonus);

        // Effetto raccolta: assegno "fantasma" che sale e svanisce + "+bonus".
        const ghost = this.add.image(x, y, 'check').setDepth(400);
        this.tweens.add({
            targets: ghost, y: y - 30, alpha: 0, scale: 1.3,
            duration: 450, ease: 'Quad.easeOut', onComplete: () => ghost.destroy()
        });
        this.floatText(x, y - 10, '+' + bonus);
    }

    floatText(x, y, str) {
        const t = this.add.text(x, y, str, {
            fontFamily: '"Trebuchet MS", "Segoe UI", Arial, sans-serif',
            fontSize: '22px', fontStyle: 'bold', color: '#ffe14d',
            stroke: '#3a2a00', strokeThickness: 5
        }).setOrigin(0.5).setDepth(401);
        this.tweens.add({
            targets: t, y: y - 40, alpha: { from: 1, to: 0 },
            duration: 800, ease: 'Quad.easeOut', onComplete: () => t.destroy()
        });
    }

    // Chiamato dal piccione: fa cadere una cacca dalla posizione (nel mondo)
    // sotto di lui, mirata orizzontalmente verso il player.
    spawnPoop(worldX, worldY) {
        const poop = this.poops.create(worldX, worldY + 8, 'pigeon_poop').setDepth(400);
        poop.body.setSize(8, 10);
        poop.setVelocityY(PIGEON.POOP_FALL_VY);
        const dx = this.player.x - worldX;
        poop.setVelocityX(Phaser.Math.Clamp(dx, -PIGEON.POOP_AIM_VX, PIGEON.POOP_AIM_VX));
    }

    onPlayerHitPoop(player, poop) {
        if (!poop.active) return;
        this.splatDecal(poop.x, poop.y);
        poop.destroy();
        this.addScore(-PIGEON.POOP_PENALTY); // il punteggio può andare in negativo
        this.markPlayerSplatted();
    }

    // Mostra (o rinnova) la macchia di cacca sulla spalla del player per qualche
    // secondo. Gestita qui nel GameScene: segue il player ma non dipende da
    // metodi della classe Player.
    markPlayerSplatted() {
        this.playerSplatUntil = this.time.now + PIGEON.SPLAT_MS;
        if (!this.playerSplat) {
            this.playerSplat = this.add.image(this.player.x, this.player.y, 'poop_splat').setDepth(450);
        }
        this.playerSplat.setVisible(true).setAlpha(1);
        this.positionPlayerSplat();
        // Piccolo "plop" di comparsa.
        this.tweens.killTweensOf(this.playerSplat);
        this.playerSplat.setScale(0.2);
        this.tweens.add({ targets: this.playerSplat, scale: 0.55, duration: 200, ease: 'Back.easeOut' });
    }

    positionPlayerSplat() {
        // Spalla frontale: leggermente di lato (verso dove guarda) e in alto.
        this.playerSplat.setPosition(this.player.x + this.player.facing * 5, this.player.y - 2);
        this.playerSplat.setFlipX(this.player.facing === -1);
    }

    updatePlayerSplat() {
        if (!this.playerSplat || !this.playerSplat.visible) return;
        if (this.time.now >= this.playerSplatUntil) this.playerSplat.setVisible(false);
        else this.positionPlayerSplat();
    }

    onPoopHitGround(poop, platform) {
        if (!poop.active) return;
        this.splatDecal(poop.x, poop.body.top);
        poop.destroy();
    }

    // Macchia che resta un istante dove la cacca si spiaccica, poi svanisce.
    splatDecal(x, y) {
        const s = this.add.image(x, y, 'poop_splat').setDepth(390).setScale(0.7);
        this.tweens.add({ targets: s, alpha: 0, duration: 1000, delay: 500, onComplete: () => s.destroy() });
    }

    // --- Spruzzino profumato (solo alcuni livelli) ---
    createSpray() {
        this.sprayer = null;
        if (!this.cfg.spray) return;
        const groundTop = GAME.HEIGHT - GAME.BLOCK; // superficie del pavimento
        this.sprayer = this.add.image(this.cfg.spray.x, groundTop, 'sprayer')
            .setOrigin(0.5, 1).setDepth(50);
    }

    // Se il player passa davanti allo spruzzino, questo spruzza e lo stordisce.
    checkSpray() {
        const s = this.sprayer;
        if (!s) return;
        const now = this.time.now;
        if (now < this.sprayNextAt || this.player.isDead) return;

        const p = this.player;
        if (Math.abs(p.x - s.x) < SPRAY.RANGE_X && Math.abs(p.y - (s.y - 20)) < SPRAY.RANGE_Y) {
            this.sprayNextAt = now + SPRAY.COOLDOWN_MS;
            // Nuvola che parte dall'ugello verso il player.
            const puff = this.add.image(s.x, s.y - 24, 'spray_puff')
                .setDepth(60).setScale(0.4).setAlpha(0.95);
            this.tweens.add({
                targets: puff, x: p.x, y: p.y - 6, scale: 1.5, alpha: 0,
                duration: 400, ease: 'Quad.easeOut', onComplete: () => puff.destroy()
            });
            p.makeStunned(STUN.DURATION_MS);
        }
    }

    createUI() {
        this.hud = new Hud(this, { lives: this.lives, total: this.collectibleSet.length });

        this.pauseText = this.add.text(GAME.WIDTH / 2, GAME.HEIGHT / 2, 'PAUSA', {
            fontSize: '48px', color: '#fff'
        }).setOrigin(0.5).setScrollFactor(0).setVisible(false);
    }

    startMusic() {
        // Riutilizza la traccia se già presente: evita musica sovrapposta al restart.
        this.music = this.sound.get('mus_bg') || this.sound.add('mus_bg', { loop: true, volume: 0.5 });
        if (!this.music.isPlaying) this.music.play();
    }

    bindKeys() {
        this.input.keyboard.on('keydown-P', () => {
            if (!this.isGameOver && !this.isWin) this.togglePause();
        });

        this.input.keyboard.on('keydown-I', () => {
            if (this.isGameOver || this.isWin || this.scene.isActive(SCENES.SETTINGS)) return;
            this.scene.pause();
            this.scene.launch(SCENES.SETTINGS, { returnScene: SCENES.GAME });
            this.scene.bringToTop(SCENES.SETTINGS);
        });

        this.input.keyboard.on('keydown-ENTER', () => {
            if (this.isGameOver || this.isWin) this.scene.restart({ level: this.level });
        });
    }

    // --- Proiettili ---

    // Il protagonista non tira sassi: lancia lingotti d'oro, che ruotano in volo.
    firePlayerBullet(x, y, direction) {
        const bullet = new Projectile(this, x, y, 'gold_shot');
        this.playerBullets.add(bullet);
        bullet.fire(direction, PROJECTILE.PLAYER_SPEED); // dopo add: il gruppo resetta il corpo

        this.tweens.add({
            targets: bullet,
            angle: direction * 360,
            duration: 600,
            repeat: -1
        });
    }

    // L'owlet non tira sassi: lancia penne biro che ruotano in volo.
    fireEnemyBullet(x, y, direction) {
        const bullet = new Projectile(this, x, y, 'pen');
        this.enemyBullets.add(bullet);
        bullet.fire(direction, PROJECTILE.ENEMY_SPEED); // dopo add: il gruppo resetta il corpo

        this.tweens.add({
            targets: bullet,
            angle: direction * 360,
            duration: 500,
            repeat: -1
        });
    }

    destroyBullet(bullet) {
        bullet.destroy();
    }

    onBulletHitEnemy(bullet, enemy) {
        if (enemy.isDying) return;
        bullet.destroy();
        if (enemy.takeDamage(1)) {
            this.addScore(ENEMY.SCORE);
            this.yellTaunt();
        }
    }

    // ATTENZIONE all'ordine degli argomenti: in una collisione sprite-vs-gruppo
    // Phaser passa SEMPRE prima lo sprite e poi il membro del gruppo, qualunque
    // sia l'ordine in overlap(). Qui lo sprite è il player, il membro è il rock.
    onEnemyBulletHitPlayer(player, bullet) {
        if (!bullet.active) return;
        bullet.destroy();
        if (!player.invulnerable) this.loseLife();
    }

    // --- Gameplay ---

    togglePause() {
        this.isPaused = !this.isPaused;
        this.pauseText.setVisible(this.isPaused);
        if (this.isPaused) this.physics.pause();
        else this.physics.resume();
    }

    onCollectIngot(player, ingot) {
        ingot.disableBody(true, true);
        this.addScore(SCORE.INGOT);

        // Raccolti tutti i lingotti: li rigenera e fa cadere una bomba.
        if (this.ingots.countActive(true) === 0) {
            this.ingots.children.iterate((i) => i.enableBody(true, i.x, 0, true, true));
            this.spawnBomb();
        }
    }

    onCollectDocument(player, doc) {
        // Solo l'oggetto "corrente" conta (evita doppie raccolte).
        if (!doc.active) return;
        doc.destroy();

        this.docIndex++;
        this.addScore(SCORE.DOC);
        const total = this.collectibleSet.length;
        this.hud.setDocProgress(this.docIndex, total);

        if (this.docIndex >= total) {
            this.hud.setNextDoc(null);
            this.win();
        } else {
            this.spawnNextCollectible();
        }
    }

    // Pratica completa: vittoria. Se c'è un livello successivo si può proseguire,
    // altrimenti è la vittoria finale. La schermata mostra il punteggio.
    win() {
        this.isWin = true;
        this.physics.pause();
        this.player.anims.play(`${PLAYER.PREFIX}-idle`, true);
        if (this.playerSplat) this.playerSplat.setVisible(false);

        const menuBtn = { label: 'Menu iniziale', onClick: () => this.scene.start(SCENES.MENU) };
        if (this.cfg.next) {
            this.showEndScreen({
                title: 'Livello completato!', color: '#ffe14d', stroke: '#7a4f06',
                overlay: 0x3a2a00, celebrate: true,
                buttons: [
                    { label: 'Prossimo livello', onClick: () => this.scene.restart({ level: this.cfg.next }) },
                    menuBtn
                ]
            });
        } else {
            this.showEndScreen({
                title: WIN_TEXT, color: '#ffe14d', stroke: '#7a4f06',
                overlay: 0x3a2a00, celebrate: true,
                buttons: [
                    { label: 'Rigioca', onClick: () => this.scene.restart({ level: 1 }) },
                    menuBtn
                ]
            });
        }
    }

    // Schermata di fine partita comune (vittoria o sconfitta), con punteggio e
    // bottoni. `buttonsDelay` ritarda la comparsa dei bottoni (sconfitta).
    showEndScreen({ title, color, stroke, body, buttons, overlay = 0x2a0000, celebrate = false, buttonsDelay = 0 }) {
        const { width, height } = this.scale;
        const FONT = '"Trebuchet MS", "Segoe UI", Arial, sans-serif';
        this.add.rectangle(width / 2, height / 2, width, height, overlay, 0.85)
            .setScrollFactor(0).setDepth(2000);

        const titleText = this.add.text(width / 2, height / 2 - 110, title, {
            fontFamily: FONT, fontSize: '52px', fontStyle: 'bold', color, stroke,
            strokeThickness: 12, align: 'center', lineSpacing: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
        titleText.setShadow(0, 6, 'rgba(0,0,0,0.5)', 8, true, true);
        titleText.setScale(0.3);
        this.tweens.add({
            targets: titleText, scale: 1, duration: 600, ease: 'Back.easeOut',
            onComplete: celebrate ? () => this.tweens.add({
                targets: titleText, scale: { from: 1, to: 1.05 }, duration: 900,
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            }) : undefined
        });

        if (body) {
            this.add.text(width / 2, height / 2 - 28, body, {
                fontFamily: FONT, fontSize: '20px', color: '#ffffff', align: 'center',
                lineSpacing: 8, wordWrap: { width: width - 140 }
            }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
        }

        // Punteggio raggiunto.
        this.add.text(width / 2, height / 2 + 44, 'Punteggio: ' + this.score, {
            fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: '#ffe14d',
            stroke: '#3a2a00', strokeThickness: 6
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

        const showButtons = () => {
            const by = height / 2 + 120, n = buttons.length;
            buttons.forEach((b, i) => {
                const bx = width / 2 + (i - (n - 1) / 2) * 260;
                this.makeButton(bx, by, b.label, b.onClick);
            });
        };
        if (buttonsDelay > 0) this.time.delayedCall(buttonsDelay, showButtons); else showButtons();
    }

    // --- Timer del livello ---

    // Scala il conto alla rovescia. Chiamato solo mentre si gioca davvero
    // (update esce prima se in pausa / game over / vittoria): il tempo si ferma
    // quando il gioco è fermo.
    updateTimer(delta) {
        this.timeLeftMs = Math.max(0, this.timeLeftMs - delta);
        const sec = Math.ceil(this.timeLeftMs / 1000);
        if (sec !== this.lastShownSecond) {
            this.lastShownSecond = sec;
            this.hud.setTimeLeft(sec);
        }
        if (this.timeLeftMs <= 0) this.loseByTimeout();
    }

    // Tempo scaduto senza aver completato la pratica: sconfitta.
    loseByTimeout() {
        if (this.isGameOver || this.isWin) return;
        this.isGameOver = true;
        this.isTimeUp = true;
        this.player.die();
        this.physics.pause();
        if (this.playerSplat) this.playerSplat.setVisible(false);
        this.showLoseScreen(TIMEOUT_TEXT);
    }

    // Schermata di sconfitta (tempo scaduto o morte): titolo rosso, motivazione,
    // punteggio e, dopo un secondo, i bottoni Menu / Ricomincia livello.
    showLoseScreen(text) {
        this.showEndScreen({
            title: text.TITLE, color: '#ff6a6a', stroke: '#3a0000', body: text.BODY,
            overlay: 0x2a0000, buttonsDelay: 1000,
            buttons: [
                { label: 'Menu iniziale', onClick: () => this.scene.start(SCENES.MENU) },
                { label: 'Ricomincia livello', onClick: () => this.scene.restart({ level: this.level }) }
            ]
        });
    }

    // Bottone cliccabile (rettangolo + testo) fissato alla camera.
    makeButton(x, y, label, onClick) {
        const w = 230, h = 54;
        const bg = this.add.rectangle(x, y, w, h, 0x2a2f3a, 0.96)
            .setStrokeStyle(3, 0xffe14d)
            .setScrollFactor(0).setDepth(2002)
            .setInteractive({ useHandCursor: true });

        const txt = this.add.text(x, y, label, {
            fontFamily: '"Trebuchet MS", "Segoe UI", Arial, sans-serif',
            fontSize: '20px', fontStyle: 'bold', color: '#ffe14d'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2003);

        bg.on('pointerover', () => bg.setFillStyle(0x3a4150, 1));
        bg.on('pointerout', () => bg.setFillStyle(0x2a2f3a, 0.96));
        bg.on('pointerdown', onClick);

        // Comparsa morbida.
        [bg, txt].forEach((o) => { o.setScale(0.6); this.tweens.add({ targets: o, scale: 1, duration: 250, ease: 'Back.easeOut' }); });
        return { bg, txt };
    }

    spawnBomb() {
        const W = this.cfg.worldWidth;
        let x = Phaser.Math.Between(0, W);
        // Non far comparire la bomba addosso al player.
        if (Math.abs(x - this.player.x) < 200) {
            x = Phaser.Math.Clamp(this.player.x + 400, 0, W);
        }
        const bomb = this.bombs.create(x, 16, 'bomb');
        bomb.setBounce(1).setCollideWorldBounds(true);
        bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
    }

    onPlayerHitEnemy(player, enemy) {
        if (enemy.isDying) return;

        // Schiacciamento: cadendo dall'alto sopra il nemico (un colpo lo elimina).
        const stomping = player.body.velocity.y > 0 && player.body.bottom <= enemy.body.top + 12;
        if (stomping) {
            enemy.die();
            player.setVelocityY(-ENEMY.STOMP_BOUNCE);
            this.addScore(ENEMY.SCORE);
            this.yellTaunt();
        } else if (!player.invulnerable) {
            // Il dude dà un'asciata al player (l'ascia si vede solo ora).
            if (enemy.prefix === 'dude' && enemy.swingAxe) enemy.swingAxe();
            this.loseLife();
        }
    }

    onPlayerHitBomb(player, bomb) {
        if (player.invulnerable) return;
        bomb.destroy();
        this.loseLife();
    }

    // Il grido del protagonista dopo un'eliminazione: fumetto che sale sopra la
    // testa + voce del browser (la sintesi vocale non è ovunque disponibile,
    // quindi è opzionale e non deve mai far saltare il gameplay).
    yellTaunt() {
        const now = this.time.now;
        if (this.isGameOver || now < (this.nextTauntAt || 0)) return;
        this.nextTauntAt = now + TAUNT.COOLDOWN_MS;

        const shout = this.add.text(this.player.x, this.player.y - 34, TAUNT.TEXT, {
            fontFamily: '"Trebuchet MS", "Segoe UI", Arial, sans-serif',
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#ffe14d',
            stroke: '#3a2a00',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(900);

        this.tweens.add({
            targets: shout,
            y: shout.y - 40,
            scale: { from: 0.4, to: 1.15 },
            alpha: { from: 1, to: 0 },
            duration: TAUNT.DURATION_MS,
            ease: 'Back.easeOut',
            onComplete: () => shout.destroy()
        });

        this.speakTaunt();
    }

    speakTaunt() {
        const synth = window.speechSynthesis;
        if (!synth || this.sound.mute) return;
        try {
            synth.cancel(); // niente code di gridi accavallati
            const utterance = new SpeechSynthesisUtterance(TAUNT.SPEECH);
            utterance.rate = 1.15;
            utterance.pitch = 0.7;  // voce da uomo d'affari
            utterance.volume = 1;
            synth.speak(utterance);
        } catch (e) {
            // Sintesi vocale non disponibile: resta il fumetto.
        }
    }

    addScore(points) {
        this.score += points;
        this.hud.setScore(this.score);
    }

    loseLife() {
        if (this.isGameOver) return;

        this.lives--;
        this.hud.setLives(this.lives);

        if (this.lives <= 0) {
            this.gameOver();
            return;
        }

        this.player.setPosition(100, 450);
        this.player.setVelocity(0, 0);
        this.player.makeInvulnerable(PLAYER.INVULNERABLE_MS);
    }

    gameOver() {
        this.isGameOver = true;
        this.player.die();
        this.physics.pause();
        if (this.playerSplat) this.playerSplat.setVisible(false);
        this.showLoseScreen(DEATH_TEXT);
    }
}
