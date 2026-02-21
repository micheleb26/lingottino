import { GAME_CONFIG, SCENE_KEYS } from './constants.js';
import { unlockAudio } from './utils.js';

export class MainMenu extends Phaser.Scene {
    constructor() {
        super({ key: SCENE_KEYS.MENU });
    }

    create() {
        const { width, height } = this.scale;

        // --- Dimensioni proporzionali ---
        const logoScale = Math.min(width / 800, height / 600) * 0.25;
        const btnScale = Math.min(width / 800, height / 600) * 0.04;
        const baseScale = Math.min(width / 800, height / 600);

        // --- LOGO ---
        const logo = this.add.image(width / 2, height / 2 - height * 0.25, 'logo')
            .setOrigin(0.5)
            .setScale(logoScale);

        // --- PULSANTE PLAY ---
        const playBtn = this.add.image(width / 2, height / 2 + height * 0.15, 'playBtn')
            .setOrigin(0.5)
            .setScale(btnScale)
            .setInteractive({ useHandCursor: true });

        // --- Scritta PLAY accanto al pulsante ---
        const playText = this.add.text(
            playBtn.x + playBtn.displayWidth / 2 + 10,
            playBtn.y,
            "Play",
            { fontSize: `${16 * baseScale}px`, color: "#ffffff" }
        ).setOrigin(0, 0.5)
         .setInteractive({ useHandCursor: true });

        // --- Azioni Play (clic su pulsante o testo) ---
        const playAction = () => {
            unlockAudio(this);
            this.scene.start("GameScene");
        };
        playBtn.on('pointerdown', playAction);
        playText.on('pointerdown', playAction);

        // Hover effetto leggero
        playBtn.on('pointerover', () => playBtn.setScale(btnScale * 1.1));
        playBtn.on('pointerout', () => playBtn.setScale(btnScale));
        playText.on('pointerover', () => playBtn.setScale(btnScale * 1.1));
        playText.on('pointerout', () => playBtn.setScale(btnScale));

        // --- PULSANTE IMPOSTAZIONI ---
        const settingsBtn = this.add.image(width / 2, height / 2 + 2 * height * 0.15, 'settingsBtn')
            .setOrigin(0.5)
            .setScale(btnScale)
            .setInteractive({ useHandCursor: true });

        // --- Scritta IMPOSTAZIONI accanto al pulsante ---
        const settingsText = this.add.text(
            settingsBtn.x + settingsBtn.displayWidth / 2 + 10,
            settingsBtn.y,
            "Impostazioni",
            { fontSize: `${16 * baseScale}px`, color: "#ffffff" }
        ).setOrigin(0, 0.5)
         .setInteractive({ useHandCursor: true });

        // --- Azioni Impostazioni (clic su pulsante o testo) ---
        const settingsAction = () => {
            this.scene.launch(SCENE_KEYS.SETTINGS);
        };
        settingsBtn.on('pointerdown', settingsAction);
        settingsText.on('pointerdown', settingsAction);

        // Hover effetto leggero
        settingsBtn.on('pointerover', () => settingsBtn.setScale(btnScale * 1.1));
        settingsBtn.on('pointerout', () => settingsBtn.setScale(btnScale));
        settingsText.on('pointerover', () => settingsBtn.setScale(btnScale * 1.1));
        settingsText.on('pointerout', () => settingsBtn.setScale(btnScale));
    }
}