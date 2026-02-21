import { GAME_CONFIG, SCENE_KEYS } from './constants.js';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENE_KEYS.BOOT });
    }

    preload() {
        const assetsPath = GAME_CONFIG.ASSETS_PATH;
        const soundsPath = GAME_CONFIG.SOUNDS_PATH;

        // Carica immagini
        this.load.image('logo', assetsPath + 'logo.png');
        this.load.image('playBtn', assetsPath + 'play.png');
        this.load.image('settingsBtn', assetsPath + 'settings.png');

        // Carica audio
        this.load.audio('mus_bg', soundsPath + 'music.mp3');

        // Carica sprite sheet, font, ecc.
        // this.load.spritesheet('player', 'assets/player.png', { frameWidth: 32, frameHeight: 48 });

        // Mostra una barra di caricamento
        let width = this.scale.width;
        let height = this.scale.height;
        let progress = this.add.graphics();
        this.load.on('progress', (value) => {
            progress.clear();
            progress.fillStyle(0xffffff, 1);
            progress.fillRect(0, height/2, width * value, 20);
        });
    }

    create() {
        // Tutto caricato → vai al MainMenu
        this.scene.start(SCENE_KEYS.MENU);
    }
}