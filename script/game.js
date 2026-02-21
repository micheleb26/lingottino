import { BootScene } from './BootScene.js';
import { MainMenu } from './MainMenu.js';
import { SettingsScene } from './SettingsScene.js';
import { GameScene } from './GameScene.js';

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
    scene: [BootScene, MainMenu, SettingsScene, GameScene]
};

const game = new Phaser.Game(config);