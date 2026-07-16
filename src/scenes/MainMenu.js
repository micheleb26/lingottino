import { SCENES } from '../config/constants.js';
import { unlockAudio } from '../utils/audio.js';

// Menu principale: logo + pulsanti Gioca e Impostazioni.
export class MainMenu extends Phaser.Scene {
    constructor() {
        super({ key: SCENES.MENU });
    }

    create() {
        const { width, height } = this.scale;
        const baseScale = Math.min(width / 800, height / 600);

        this.add.image(width / 2, height * 0.3, 'logo').setScale(baseScale * 0.25);

        this.createButton(width / 2, height * 0.6, 'playBtn', 'Gioca', baseScale, () => {
            unlockAudio(this);
            this.scene.start(SCENES.GAME);
        });

        this.createButton(width / 2, height * 0.75, 'settingsBtn', 'Impostazioni', baseScale, () => {
            if (this.scene.isActive(SCENES.SETTINGS)) return;
            this.scene.pause();
            this.scene.launch(SCENES.SETTINGS, { returnScene: SCENES.MENU });
            this.scene.bringToTop(SCENES.SETTINGS);
        });
    }

    // Crea un'icona con testo affiancato, entrambi cliccabili, con effetto hover.
    createButton(x, y, iconKey, label, baseScale, onClick) {
        const btnScale = baseScale * 0.04;

        const icon = this.add.image(x, y, iconKey)
            .setScale(btnScale)
            .setInteractive({ useHandCursor: true });

        const text = this.add.text(x + icon.displayWidth / 2 + 12, y, label, {
            fontSize: `${18 * baseScale}px`,
            color: '#ffffff'
        }).setOrigin(0, 0.5)
          .setInteractive({ useHandCursor: true });

        const over = () => icon.setScale(btnScale * 1.1);
        const out = () => icon.setScale(btnScale);

        [icon, text].forEach((obj) => {
            obj.on('pointerover', over);
            obj.on('pointerout', out);
            obj.on('pointerdown', onClick);
        });
    }
}
