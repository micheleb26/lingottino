import { GAME_CONFIG, SCENE_KEYS } from './constants.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENE_KEYS.GAME });
    }

    init() {
        this.worldWidth = 2000;
        this.score = 0;
        this.lives = 3;
    }

    preload() {
        const assetsPath = GAME_CONFIG.ASSETS_PATH;
        const soundsPath = GAME_CONFIG.SOUNDS_PATH;

        this.load.image('sky', assetsPath + 'sky.png');
        this.load.image('ground', assetsPath + 'platform.png');
        this.load.image('lingottino', assetsPath + 'lingottino.png');
        this.load.image('bomb', assetsPath + 'bomb.png');
        this.load.spritesheet('povero', assetsPath + 'povero.png', {
            frameWidth: 32,
            frameHeight: 48
        });
    }

    create() {
        this.input.keyboard.on('keydown-P', () => {
            if (this.isPaused) {
                this.isPaused = false;
            } else {
                this.isPaused = true;
            }
        });

        this.input.keyboard.on('keydown-I', () => {
            this.scene.launch(SCENE_KEYS.SETTINGS);
            this.scene.bringToTop(SCENE_KEYS.SETTINGS);
            this.scene.pause();
        });

        this.music = this.sound.add('mus_bg', { loop: true, volume: 0.5 });
        this.music.play();

        this.physics.world.setBounds(0, 0, this.worldWidth, 600);
        this.cameras.main.setBounds(0, 0, this.worldWidth, 600);

        // Background
        for (let i = 0; i < this.worldWidth; i += 800) {
            this.add.image(i + 400, 300, 'sky');
        }

        // Platforms
        this.platforms = this.physics.add.staticGroup();

        for (let x = 0; x < this.worldWidth; x += 400) {
            this.platforms.create(x, 568, 'ground')
                .setOrigin(0, 0.5)
                .setScale(2)
                .refreshBody();
        }

        this.platforms.create(400, 400, 'ground');
        this.platforms.create(1200, 350, 'ground');
        this.platforms.create(1600, 250, 'ground');

        // Player
        this.player = this.physics.add.sprite(100, 500, 'povero')
            .setBounce(0.2)
            .setCollideWorldBounds(true);

        this.cameras.main.startFollow(this.player);
        this.cameras.main.setDeadzone(200, 100);

        // Animazioni
        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('povero', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'turn',
            frames: [{ key: 'povero', frame: 4 }],
            frameRate: 20
        });

        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('povero', { start: 5, end: 8 }),
            frameRate: 10,
            repeat: -1
        });

        this.physics.add.collider(this.player, this.platforms);

        // Enemies
        this.enemies = this.physics.add.group();
        this.createEnemy(400, 300, 350, 450);
        this.createEnemy(1200, 250, 1150, 1250);
        this.createEnemy(1600, 150, 1550, 1650);

        this.physics.add.collider(this.enemies, this.platforms);
        this.physics.add.collider(this.player, this.enemies, this.hitEnemy, null, this);

        // Stars
        this.stars = this.physics.add.group({
            key: 'lingottino',
            repeat: 11,
            setXY: { x: 12, y: 0, stepX: 70 }
        });

        this.stars.children.iterate(child => {
            child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
        });

        this.physics.add.collider(this.stars, this.platforms);
        this.physics.add.overlap(this.player, this.stars, this.collectStar, null, this);

        // Bombs
        this.bombs = this.physics.add.group();
        this.physics.add.collider(this.bombs, this.platforms);
        this.physics.add.collider(this.player, this.bombs, this.hitBomb, null, this);

        // UI
        this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#000' });
        this.livesText = this.add.text(16, 50, 'Lives: 3', { fontSize: '24px', fill: '#000' })
            .setScrollFactor(0);

        this.cursors = this.input.keyboard.createCursorKeys();
    }

    update() {
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-160);
            this.player.anims.play('left', true);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(160);
            this.player.anims.play('right', true);
        } else {
            this.player.setVelocityX(0);
            this.player.anims.play('turn');
        }

        if (this.cursors.up.isDown && this.player.body.blocked.down) {
            this.player.setVelocityY(-500);
        }

        if (this.cursors.up.isUp && this.player.body.velocity.y < -150) {
            this.player.setVelocityY(-150);
        }

        this.enemies.children.iterate(enemy => {
            if (!enemy) return;

            if (enemy.x <= enemy.minX) {
                enemy.setVelocityX(100);
            } else if (enemy.x >= enemy.maxX) {
                enemy.setVelocityX(-100);
            }
        });
    }

    collectStar(player, star) {
        star.disableBody(true, true);
        this.score += 10;
        this.scoreText.setText('Score: ' + this.score);
        // Se tutte le stelle sono raccolte
        if (this.stars.countActive(true) === 0) {
            // rigenera le stelle
            this.stars.children.iterate(child => {
                child.enableBody(true, child.x, 0, true, true);
            });

            // aggiungi un nemico extra
            let x = (this.player.x < 400) ? Phaser.Math.Between(400, 800) : Phaser.Math.Between(0, 400);
            let bomb = this.bombs.create(x, 16, 'bomb');
            bomb.setBounce(1).setCollideWorldBounds(true).setVelocity(Phaser.Math.Between(-200, 200), 20);
        }
    }

    hitBomb(player, bomb) {
        this.physics.pause();
        player.setTint(0xff0000);
        player.anims.play('turn');
    }

    createEnemy(x, y, minX, maxX) {
        let enemy = this.enemies.create(x, y, 'bomb');
        enemy.setVelocityX(100);
        enemy.minX = minX;
        enemy.maxX = maxX;
    }

    hitEnemy(player, enemy) {
        if (player.body.velocity.y > 0) {
            enemy.disableBody(true, true);
            player.setVelocityY(-250);
        } else {
            this.loseLife();
        }
    }

    loseLife() {
        this.lives--;
        this.livesText.setText('Lives: ' + this.lives);

        if (this.lives <= 0) {
            this.physics.pause();
            this.player.setTint(0xff0000);
        } else {
            this.player.setPosition(100, 450);
        }
    }
}