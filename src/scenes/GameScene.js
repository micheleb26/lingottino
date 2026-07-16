import { GAME, PLAYER, ENEMY, PROJECTILE, SCORE, SCENES } from '../config/constants.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { ShooterEnemy } from '../entities/ShooterEnemy.js';
import { Projectile } from '../entities/Projectile.js';
import { Ingot } from '../entities/Ingot.js';
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
        this.createUI();
        this.startMusic();
        this.bindKeys();
    }

    update() {
        if (this.isPaused || this.isGameOver) return;

        this.player.update();
        this.enemies.children.iterate((enemy) => {
            if (enemy && enemy.active) enemy.update();
        });
    }

    // --- Costruzione del livello ---

    createPlatforms() {
        this.platforms = this.physics.add.staticGroup();

        // Pavimento continuo (platform.png = 400x32).
        for (let x = 0; x < GAME.WORLD_WIDTH; x += 400) {
            this.platforms.create(x, GAME.HEIGHT - 32, 'ground')
                .setOrigin(0, 0)
                .refreshBody();
        }

        // Piattaforme sospese.
        [[500, 470], [1050, 390], [1550, 310], [1850, 470]].forEach(([x, y]) => {
            this.platforms.create(x, y, 'ground');
        });
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

    createBombs() {
        this.bombs = this.physics.add.group();
        this.physics.add.collider(this.bombs, this.platforms);
        this.physics.add.collider(this.player, this.bombs, this.onPlayerHitBomb, null, this);
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
            if (!this.isGameOver) this.togglePause();
        });

        this.input.keyboard.on('keydown-I', () => {
            if (this.isGameOver || this.scene.isActive(SCENES.SETTINGS)) return;
            this.scene.pause();
            this.scene.launch(SCENES.SETTINGS, { returnScene: SCENES.GAME });
            this.scene.bringToTop(SCENES.SETTINGS);
        });

        this.input.keyboard.on('keydown-ENTER', () => {
            if (this.isGameOver) this.scene.restart();
        });
    }

    // --- Proiettili ---

    firePlayerBullet(x, y, direction) {
        const bullet = new Projectile(this, x, y, 'rock');
        this.playerBullets.add(bullet);
        bullet.fire(direction, PROJECTILE.PLAYER_SPEED); // dopo add: il gruppo resetta il corpo
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
        if (enemy.takeDamage(1)) this.addScore(ENEMY.SCORE);
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
        } else if (!player.invulnerable) {
            this.loseLife();
        }
    }

    onPlayerHitBomb(player, bomb) {
        if (player.invulnerable) return;
        bomb.destroy();
        this.loseLife();
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
        this.gameOverText.setVisible(true);
    }
}
