import { PATHS, SCENES, CHARACTERS, CHAR_ACTIONS, CHAR_FRAME } from '../config/constants.js';

// Carica una sola volta tutti gli asset e registra le animazioni globali,
// poi passa al menu principale. Centralizzare qui i caricamenti evita
// scatti quando si avvia la partita.
export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENES.BOOT });
    }

    preload() {
        this.createLoadingBar();

        const a = PATHS.ASSETS;
        const s = PATHS.SOUNDS;

        // UI / scenario
        this.load.image('logo', a + 'logo.png');
        this.load.image('playBtn', a + 'play.png');
        this.load.image('settingsBtn', a + 'settings.png');
        this.load.image('sky', a + 'sky.png');
        this.load.image('ground', a + 'platform.png');
        this.load.image('bomb', a + 'bomb.png');

        // UI: icone vettoriali (cuori, munizioni, riflesso) rasterizzate ad alta
        // risoluzione e poi ridotte a video -> restano nitide.
        this.load.svg('heart_full', 'assets/ui/heart_full.svg', { width: 128, height: 128 });
        this.load.svg('heart_empty', 'assets/ui/heart_empty.svg', { width: 128, height: 128 });
        this.load.svg('ammo', 'assets/ui/ammo.svg', { width: 128, height: 128 });
        this.load.svg('shine', 'assets/ui/shine.svg', { width: 128, height: 128 });

        // Lingotto d'oro raccoglibile (sostituisce le vecchie "stelle").
        // Caricato alla dimensione di visualizzazione: niente scala -> corpo fisico corretto.
        this.load.svg('ingot', 'assets/items/ingot.svg', { width: 36, height: 24 });

        // Personaggi (player + nemici): una spritesheet per azione.
        Object.keys(CHARACTERS).forEach((prefix) => this.loadCharacter(prefix));

        // Proiettili (rock dei pack monster).
        this.load.image('rock', 'assets/player/pink/Rock1.png');
        this.load.image('rock_enemy', 'assets/enemies/dude_monster/Rock2.png');

        // Audio
        this.load.audio('mus_bg', s + 'music.mp3');
    }

    create() {
        Object.keys(CHARACTERS).forEach((prefix) => this.createCharacterAnims(prefix));

        // Le icone UI non sono pixel art: filtro lineare per bordi morbidi
        // (il resto del gioco usa NEAREST per gli sprite 32x32).
        ['heart_full', 'heart_empty', 'ammo', 'shine', 'ingot'].forEach((key) => {
            if (this.textures.exists(key)) {
                this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
            }
        });

        this.scene.start(SCENES.MENU);
    }

    loadCharacter(prefix) {
        const { folder, base } = CHARACTERS[prefix];
        for (const [name, def] of Object.entries(CHAR_ACTIONS)) {
            this.load.spritesheet(
                `${prefix}_${name}`,
                `${folder}${base}_${def.suffix}.png`,
                { frameWidth: CHAR_FRAME, frameHeight: CHAR_FRAME }
            );
        }
    }

    createCharacterAnims(prefix) {
        for (const [name, def] of Object.entries(CHAR_ACTIONS)) {
            const key = `${prefix}-${name}`;
            if (this.anims.exists(key)) continue;
            this.anims.create({
                key,
                frames: this.anims.generateFrameNumbers(`${prefix}_${name}`, { start: 0, end: def.frames - 1 }),
                frameRate: def.rate,
                repeat: def.repeat
            });
        }
    }

    createLoadingBar() {
        const { width, height } = this.scale;
        const bar = this.add.graphics();
        this.load.on('progress', (value) => {
            bar.clear();
            bar.fillStyle(0xffffff, 1);
            bar.fillRect(width / 4, height / 2 - 10, (width / 2) * value, 20);
        });
        this.load.on('complete', () => bar.destroy());
    }
}
