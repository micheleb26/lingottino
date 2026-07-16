import { GAME } from './config/constants.js';
import { BootScene } from './scenes/BootScene.js';
import { MainMenu } from './scenes/MainMenu.js';
import { SettingsScene } from './scenes/SettingsScene.js';
import { GameScene } from './scenes/GameScene.js';

const config = {
    type: Phaser.AUTO,
    width: GAME.WIDTH,
    height: GAME.HEIGHT,
    pixelArt: true, // sprite 32x32: filtro NEAREST, niente sfocature
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: GAME.GRAVITY_Y },
            debug: false
        }
    },
    scene: [BootScene, MainMenu, SettingsScene, GameScene]
};

new Phaser.Game(config);
