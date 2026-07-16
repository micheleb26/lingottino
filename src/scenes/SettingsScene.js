import { SCENES } from '../config/constants.js';

// Overlay impostazioni: si apre sopra il menu o sopra il gioco (in pausa)
// e al ritorno riprende la scena da cui è stato richiamato.
export class SettingsScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENES.SETTINGS });
    }

    init(data) {
        this.returnScene = data.returnScene || SCENES.MENU;
    }

    create() {
        const { width, height } = this.scale;

        // Sfondo semi-trasparente.
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);

        this.add.text(width / 2, 80, 'Impostazioni', { fontSize: '32px', color: '#fff' })
            .setOrigin(0.5);

        // Toggle audio.
        this.audioText = this.add.text(width / 2, 180, '', { fontSize: '24px', color: '#fff' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        this.updateAudioText();
        this.audioText.on('pointerdown', () => {
            this.sound.mute = !this.sound.mute;
            this.updateAudioText();
        });

        // Riepilogo controlli.
        this.add.text(width / 2, 300,
            'Controlli\n\nFrecce o WASD: muoviti\nSu / W / Spazio: salta\nF: spara (munizioni illimitate)\nP: pausa     I: impostazioni',
            { fontSize: '20px', color: '#fff', align: 'center', lineSpacing: 6 }
        ).setOrigin(0.5);

        this.add.text(width / 2, height - 80, 'Premi I per tornare', { fontSize: '18px', color: '#ccc' })
            .setOrigin(0.5);

        this.input.keyboard.once('keydown-I', () => this.close());
    }

    updateAudioText() {
        this.audioText.setText('Audio: ' + (this.sound.mute ? 'OFF' : 'ON'));
    }

    close() {
        this.scene.stop();
        this.scene.resume(this.returnScene);
    }
}
