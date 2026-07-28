import { GAME, PLAYER, ENEMY, PROJECTILE, SCORE, SCENES, TAUNT, DOCUMENTS, WIN_TEXT, TIMER, TIMEOUT_TEXT, PIGEON } from '../config/constants.js';
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

    init() {
        this.score = 0;
        this.lives = GAME.START_LIVES;
        this.isPaused = false;
        this.isGameOver = false;
        this.isWin = false;
        this.isTimeUp = false;
        this.docIndex = 0;      // quanti documenti già raccolti (= indice del prossimo)
        this.lastDocSpot = -1;  // ultimo punto di spawn usato, per non ripeterlo
        this.timeLeftMs = TIMER.LEVEL_SECONDS * 1000; // conto alla rovescia del livello
        this.lastShownSecond = null;
        this.playerSplat = null;      // macchia di cacca sulla spalla del player
        this.playerSplatUntil = 0;
    }

    create() {
        const { WORLD_WIDTH, HEIGHT } = GAME;

        this.physics.world.setBounds(0, 0, WORLD_WIDTH, HEIGHT);
        this.cameras.main.setBounds(0, 0, WORLD_WIDTH, HEIGHT);

        // Sfondo: un solo tileSprite invece di tante immagini ripetute.
        this.add.tileSprite(0, 0, WORLD_WIDTH, HEIGHT, 'sky').setOrigin(0, 0);

        this.createPlatforms();
        this.createPlayer();
        this.createEnemies();
        this.createProjectiles();
        this.createIngots();
        this.createBombs();
        this.createPigeon();
        this.createUI();
        this.createDocuments(); // dopo la UI: il primo spawn aggiorna l'HUD
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
    }

    // --- Costruzione del livello ---

    createPlatforms() {
        const B = GAME.BLOCK; // 32
        this.platforms = this.physics.add.staticGroup();

        // Pavimento: una fila di blocchi lungo tutto il mondo (in futuro si
        // possono saltare dei blocchi per creare buchi in cui cadere).
        for (let x = 0; x < GAME.WORLD_WIDTH; x += B) {
            this.addBlock(x, GAME.HEIGHT - B);
        }

        // Piattaforme sospese: righe di blocchi. Mantengono ~posizioni e
        // lunghezze delle vecchie piattaforme (400px ≈ 12 blocchi da 32).
        // { x: bordo sinistro, y: bordo superiore, n: numero di blocchi }.
        this.suspended = [
            { x: 308,  y: 454, n: 12 }, // ~ (500,470)
            { x: 858,  y: 374, n: 12 }, // ~ (1050,390) — piattaforma CENTRALE, ha il blocco segreto
            { x: 1358, y: 294, n: 12 }, // ~ (1550,310)
            { x: 1658, y: 454, n: 12 }  // ~ (1850,470)
        ];
        this.suspended.forEach((p) => {
            for (let i = 0; i < p.n; i++) this.addBlock(p.x + i * B, p.y);
        });

        // Il blocco SEGRETO è un blocco IDENTICO agli altri, scelto in mezzo
        // alla piattaforma centrale: si raggiunge saltando dal terreno sottostante.
        this.secretUsed = false;
        this.check = null;
        const mid = this.suspended[1];
        const secretX = mid.x + 6 * B; // ~ x=1050, centro della fila
        this.secretBlock = this.addBlock(secretX, mid.y);
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

        // Camminatori (dude): sulle piattaforme si girano ai bordi;
        // sul pavimento usano limiti di pattuglia espliciti.
        [
            { x: 500, y: 420 },
            { x: 1050, y: 340 },
            { x: 1700, y: 500, patrolMin: 1600, patrolMax: 1950 }
        ].forEach((d) => this.enemies.add(new Enemy(this, d.x, d.y, { prefix: 'dude', ...d })));

        // Tiratori (owlet).
        [
            { x: 800, y: 500, patrolMin: 650, patrolMax: 1050 },
            { x: 1550, y: 270 }
        ].forEach((d) => this.enemies.add(new ShooterEnemy(this, d.x, d.y, d)));

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

        for (let x = 100; x < GAME.WORLD_WIDTH; x += 150) {
            const ingot = new Ingot(this, x, 0);
            this.ingots.add(ingot);
            // Configura il corpo DOPO l'add (il gruppo reinizializza il corpo).
            ingot.setCollideWorldBounds(true);
            ingot.setBounceY(Phaser.Math.FloatBetween(0.2, 0.5));
        }

        this.physics.add.collider(this.ingots, this.platforms);
        this.physics.add.overlap(this.player, this.ingots, this.onCollectIngot, null, this);
    }

    // Documenti della pratica: uno alla volta, in sequenza. Il gruppo esiste
    // per gestire in un colpo solo collisioni e overlap; conterrà al più un
    // documento attivo per volta.
    createDocuments() {
        this.documents = this.physics.add.group();
        this.physics.add.collider(this.documents, this.platforms);
        this.physics.add.overlap(this.player, this.documents, this.onCollectDocument, null, this);
        this.spawnNextDocument();
    }

    // Punti di comparsa possibili: alcuni a terra (cadono fino al pavimento),
    // altri appena sopra le piattaforme sospese -> altezze e posizioni varie.
    docSpots() {
        return [
            { x: 260, y: 0 }, { x: 720, y: 0 }, { x: 1250, y: 0 }, { x: 1980, y: 0 },
            { x: 500, y: 430 }, { x: 1050, y: 350 }, { x: 1550, y: 270 }, { x: 1850, y: 430 }
        ];
    }

    spawnNextDocument() {
        const def = DOCUMENTS[this.docIndex];
        if (!def) return; // pratica completa

        // Scegli un punto casuale diverso dall'ultimo usato.
        const spots = this.docSpots();
        let i = Phaser.Math.Between(0, spots.length - 1);
        if (spots.length > 1) while (i === this.lastDocSpot) i = Phaser.Math.Between(0, spots.length - 1);
        this.lastDocSpot = i;
        const spot = spots[i];

        const doc = new Document(this, spot.x, spot.y, def);
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
        if (this.secretUsed) return;
        const p = this.player.body;
        if (!(p.blocked.up || p.touching.up)) return;
        const b = this.secretBlock;
        if (p.center.x > b.x && p.center.x < b.x + GAME.BLOCK) {
            this.secretUsed = true;
            this.animateSecretHit(b);
            this.revealCheck(b);
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

    // L'assegno è un'immagine semplice (non fisica): la muovo con i tween e la
    // raccolta la controllo a mano nell'update, così la fisica non "combatte"
    // il movimento di salita/ondeggio.
    updateCheckPickup() {
        const c = this.check;
        if (!c || !c.active) return;
        if (Math.abs(this.player.x - c.x) < 28 && Math.abs(this.player.y - c.y) < 24) {
            this.onCollectCheck();
        }
    }

    // L'assegno compare SOPRA il blocco (posizione di riposo) ed è raccoglibile.
    // La breve salita e l'ondeggio sono solo decorativi: anche senza tween
    // l'assegno resta comunque piazzato sopra il blocco.
    revealCheck(block) {
        // Il blocco ha origine in alto a sinistra: centro X = block.x + 16,
        // e l'assegno galleggia sopra la superficie della piattaforma.
        const cx = block.x + GAME.BLOCK / 2;
        const restY = block.y - 26;
        this.check = this.add.image(cx, restY, 'check').setDepth(6);

        // Emerge dal blocco (parte poco sotto la posizione di riposo).
        this.check.y = restY + 14;
        this.tweens.add({
            targets: this.check, y: restY, duration: 300, ease: 'Back.easeOut',
            onComplete: () => {
                if (!this.check || !this.check.active) return;
                this.tweens.add({
                    targets: this.check, y: restY - 4,
                    duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
                });
            }
        });
    }

    onCollectCheck() {
        const check = this.check;
        if (!check || !check.active) return;
        const x = check.x, y = check.y;
        check.destroy();            // niente doppie raccolte
        this.check = null;
        this.addScore(SCORE.CHECK);

        // Effetto raccolta: assegno "fantasma" che sale e svanisce + "+200".
        const ghost = this.add.image(x, y, 'check').setDepth(400);
        this.tweens.add({
            targets: ghost, y: y - 30, alpha: 0, scale: 1.3,
            duration: 450, ease: 'Quad.easeOut', onComplete: () => ghost.destroy()
        });
        this.floatText(x, y - 10, '+' + SCORE.CHECK);
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

    createUI() {
        this.hud = new Hud(this, { lives: this.lives });

        this.pauseText = this.add.text(GAME.WIDTH / 2, GAME.HEIGHT / 2, 'PAUSA', {
            fontSize: '48px', color: '#fff'
        }).setOrigin(0.5).setScrollFactor(0).setVisible(false);

        this.gameOverText = this.add.text(GAME.WIDTH / 2, GAME.HEIGHT / 2,
            'GAME OVER\nPremi INVIO per ricominciare', {
                fontSize: '40px', color: '#fff', align: 'center', lineSpacing: 8
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
            if (this.isGameOver || this.isWin) this.scene.restart();
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

    fireEnemyBullet(x, y, direction) {
        const bullet = new Projectile(this, x, y, 'rock_enemy');
        this.enemyBullets.add(bullet);
        bullet.fire(direction, PROJECTILE.ENEMY_SPEED);
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
        // Solo il documento "corrente" conta (evita doppie raccolte se qualcosa
        // resta attivo un frame in più).
        if (!doc.active) return;
        doc.destroy();

        this.docIndex++;
        this.addScore(SCORE.DOC);
        this.hud.setDocProgress(this.docIndex, DOCUMENTS.length);

        if (this.docIndex >= DOCUMENTS.length) {
            this.hud.setNextDoc(null);
            this.win();
        } else {
            this.spawnNextDocument();
        }
    }

    // Pratica completa: schermata di vittoria a tutto schermo.
    win() {
        this.isWin = true;
        this.physics.pause();
        this.player.anims.play(`${PLAYER.PREFIX}-idle`, true);

        const { width, height } = this.scale;
        this.add.rectangle(width / 2, height / 2, width, height, 0x3a2a00, 0.85)
            .setScrollFactor(0).setDepth(2000);

        const banner = this.add.text(width / 2, height / 2, WIN_TEXT, {
            fontFamily: '"Trebuchet MS", "Segoe UI", Arial, sans-serif',
            fontSize: '64px',
            fontStyle: 'bold',
            color: '#ffe14d',
            stroke: '#7a4f06',
            strokeThickness: 12,
            align: 'center',
            lineSpacing: 6
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
        banner.setShadow(0, 6, 'rgba(0,0,0,0.5)', 8, true, true);

        // Entrata a molla + pulsazione dorata continua.
        banner.setScale(0.3);
        this.tweens.add({
            targets: banner, scale: 1, duration: 700, ease: 'Back.easeOut',
            onComplete: () => this.tweens.add({
                targets: banner, scale: { from: 1, to: 1.06 },
                duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            })
        });

        this.add.text(width / 2, height / 2 + 120, 'Premi INVIO per rigiocare', {
            fontFamily: '"Trebuchet MS", "Segoe UI", Arial, sans-serif',
            fontSize: '22px', color: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
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
        this.showTimeoutScreen();
    }

    showTimeoutScreen() {
        const { width, height } = this.scale;
        this.add.rectangle(width / 2, height / 2, width, height, 0x2a0000, 0.85)
            .setScrollFactor(0).setDepth(2000);

        const title = this.add.text(width / 2, height / 2 - 90, TIMEOUT_TEXT.TITLE, {
            fontFamily: '"Trebuchet MS", "Segoe UI", Arial, sans-serif',
            fontSize: '56px', fontStyle: 'bold', color: '#ff6a6a',
            stroke: '#3a0000', strokeThickness: 12, align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
        title.setShadow(0, 6, 'rgba(0,0,0,0.5)', 8, true, true);

        title.setScale(0.3);
        this.tweens.add({ targets: title, scale: 1, duration: 600, ease: 'Back.easeOut' });

        this.add.text(width / 2, height / 2 + 10, TIMEOUT_TEXT.BODY, {
            fontFamily: '"Trebuchet MS", "Segoe UI", Arial, sans-serif',
            fontSize: '20px', color: '#ffffff', align: 'center', lineSpacing: 10,
            wordWrap: { width: width - 140 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

        // Dopo un secondo: i due bottoni per scegliere come proseguire.
        this.time.delayedCall(1000, () => this.showTimeoutButtons(), null, this);
    }

    showTimeoutButtons() {
        const { width, height } = this.scale;
        const y = height / 2 + 130;
        this.makeButton(width / 2 - 130, y, 'Menu iniziale', () => {
            this.scene.start(SCENES.MENU);
        });
        this.makeButton(width / 2 + 130, y, 'Ricomincia livello', () => {
            this.scene.restart();
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
        let x = Phaser.Math.Between(0, GAME.WORLD_WIDTH);
        // Non far comparire la bomba addosso al player.
        if (Math.abs(x - this.player.x) < 200) {
            x = Phaser.Math.Clamp(this.player.x + 400, 0, GAME.WORLD_WIDTH);
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
        this.gameOverText.setVisible(true);
    }
}
