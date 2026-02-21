// main game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 600 },
            debug: false
        }
    },
    scene: {
        preload,
        create,
        update
    }
};

// Configurations
const assetsPath = 'assets/phaser/';

// start Phaser game
const game = new Phaser.Game(config);

let player, cursors, stars, score = 0, scoreText, bombs, platforms;
let enemies;
let lives = 3;
let livesText;
let worldWidth = 2000; // larghezza mondo

function preload() {
    // load images and sprites
    this.load.image('sky', assetsPath + 'sky.png');
    this.load.image('ground', assetsPath + 'platform.png');
    this.load.image('lingottino', assetsPath + 'lingottino.png');
    this.load.image('bomb', assetsPath + 'bomb.png');
    this.load.spritesheet('povero', assetsPath + 'povero.png', {
        frameWidth: 32,
        frameHeight: 48
    });
}

function create() {
    this.physics.world.setBounds(0, 0, worldWidth, 600);
    this.cameras.main.setBounds(0, 0, worldWidth, 600);

    // background
    for (let i = 0; i < worldWidth; i += 800) {
        this.add.image(i + 400, 300, 'sky');
    }

    // platforms group (static)
    platforms = this.physics.add.staticGroup();

    // Terreno lungo tutto il mondo
    for (let x = 0; x < worldWidth; x += 400) {
        platforms.create(x, 568, 'ground')
            .setOrigin(0, 0.5)
            .setScale(2)
            .refreshBody();
    }

    //platforms.create(1000, 568, 'ground').setScale(4).refreshBody();
    platforms.create(400, 400, 'ground');
    platforms.create(1200, 350, 'ground');
    platforms.create(1600, 250, 'ground');

    // player with physics
    player = this.physics.add.sprite(100, 500, 'povero')
        .setBounce(0.2)
        .setCollideWorldBounds(true);

    this.cameras.main.startFollow(player);
    this.cameras.main.setDeadzone(200, 100);

    // player animations
    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('povero', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
    });
    this.anims.create({
        key: 'turn',
        frames: [ { key: 'povero', frame: 4 } ],
        frameRate: 20
    });
    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('povero', { start: 5, end: 8 }),
        frameRate: 10,
        repeat: -1
    });

    // collision between player and platforms
    this.physics.add.collider(player, platforms);

    // enemies
    enemies = this.physics.add.group();

    createEnemy(400, 300, 350, 450);
    createEnemy(1200, 250, 1150, 1250);
    createEnemy(1600, 150, 1550, 1650);

    this.physics.add.collider(enemies, platforms);
    this.physics.add.collider(player, enemies, hitEnemy, null, this);

    // stars group
    stars = this.physics.add.group({
        key: 'lingottino',
        repeat: 11,
        setXY: { x: 12, y: 0, stepX: 70 }
    });
    stars.children.iterate(child => {
        child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
    });

    this.physics.add.collider(stars, platforms);
    this.physics.add.overlap(player, stars, collectStar, null, this);

    // bombs group
    bombs = this.physics.add.group();
    this.physics.add.collider(bombs, platforms);
    this.physics.add.collider(player, bombs, hitBomb, null, this);

    // score text
    scoreText = this.add.text(16, 16, 'Score: 0', {
        fontSize: '32px', fill: '#000'
    });

    // lives text
    livesText = this.add.text(16, 50, 'Lives: 3', {
        fontSize: '24px',
        fill: '#000'
    }).setScrollFactor(0);


    // keyboard input
    cursors = this.input.keyboard.createCursorKeys();
}

function update() {
    // left/right movement
    if (cursors.left.isDown) {
        player.setVelocityX(-160);
        player.anims.play('left', true);
    } else if (cursors.right.isDown) {
        player.setVelocityX(160);
        player.anims.play('right', true);
    } else {
        player.setVelocityX(0);
        player.anims.play('turn');
    }

    // jump
    if (cursors.up.isDown && player.body.blocked.down) {
        player.setVelocityY(-500);
    }

    if (cursors.up.isUp && player.body.velocity.y < -150) {
        player.setVelocityY(-150);
    }

    // enemies patrolling
    enemies.children.iterate(enemy => {
        if (!enemy) return;

        if (enemy.x <= enemy.minX) {
            enemy.setVelocityX(100);
        } else if (enemy.x >= enemy.maxX) {
            enemy.setVelocityX(-100);
        }
    });
}

function collectStar(player, star) {
    star.disableBody(true, true);
    score += 10;
    scoreText.setText('Score: ' + score);

    if (stars.countActive(true) === 0) {
        stars.children.iterate(child => {
            child.enableBody(true, child.x, 0, true, true);
        });

        let x = (player.x < 400) ? Phaser.Math.Between(400, 800) : Phaser.Math.Between(0, 400);
        let bomb = bombs.create(x, 16, 'bomb');
        bomb.setBounce(1).setCollideWorldBounds(true).setVelocity(Phaser.Math.Between(-200, 200), 20);
    }
}

function hitBomb(player, bomb) {
    this.physics.pause();
    player.setTint(0xff0000);
    player.anims.play('turn');
}

function createEnemy(x, y, minX, maxX) {
    let enemy = enemies.create(x, y, 'bomb');

    enemy.setBounce(0);               // niente rimbalzo
    enemy.setCollideWorldBounds(false);
    enemy.setImmovable(false);
    enemy.setVelocityX(100);

    enemy.minX = minX;
    enemy.maxX = maxX;

    enemy.body.setAllowGravity(true); // deve stare sulla piattaforma
}

// kill enemy jumping on it
function hitEnemy(player, enemy) {
    if (player.body.velocity.y > 0) {
        enemy.disableBody(true, true);
        player.setVelocityY(-250);
    } else {
        loseLife.call(this);
    }
}

function loseLife() {
    lives--;
    livesText.setText('Lives: ' + lives);

    if (lives <= 0) {
        this.physics.pause();
        player.setTint(0xff0000);
    } else {
        player.setPosition(100, 450);
    }
}
