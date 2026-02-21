import { GAME_CONFIG, SCENE_KEYS } from './constants.js';

export class SettingsScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENE_KEYS.SETTINGS });
    }

    create() {
        const assetsPath = GAME_CONFIG.ASSETS_PATH;
        const soundsPath = GAME_CONFIG.SOUNDS_PATH;
        
        const { width, height } = this.scale;

        // sfondo semi-trasparente
        this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.9);

        // titolo
        this.add.text(width/2, 80, "Impostazioni", { fontSize: "32px", color: "#fff" })
            .setOrigin(0.5);

        // Audio toggle
        this.soundOn = !this.sound.mute;
        this.audioText = this.add.text(width/2, 160, "Audio: " + (this.soundOn ? "ON" : "OFF"), { fontSize: "24px", color: "#fff" })
            .setOrigin(0.5)
            .setInteractive();

        this.audioText.on("pointerdown", () => {
            this.sound.mute = !this.sound.mute;
            this.soundOn = !this.soundOn;
            this.audioText.setText("Audio: " + (this.soundOn ? "ON" : "OFF"));
        });

        // Visualizza controlli
        this.controlText = this.add.text(width/2, 230, "Mostra controlli", { fontSize: "24px", color: "#fff" })
            .setOrigin(0.5)
            .setInteractive();

        this.controlText.on("pointerdown", () => {
            // qui potresti mostrare i controlli (toggle, help, ecc.)
            alert("Controlli: frecce per muovere, I per impostazioni");
        });

        // istruzione chiusura
        this.add.text(width/2, height - 80, "Premi I per tornare", { fontSize: "18px", color: "#ccc" })
            .setOrigin(0.5);

        this.input.keyboard.once("keydown-I", () => {
            this.closeSettings();
        });
    }

    closeSettings() {
        this.scene.stop();          // chiude Settings
        this.scene.resume(SCENE_KEYS.GAME); // riprende il gioco
    }
}