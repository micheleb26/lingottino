import { PATHS, SCENES, CHARACTERS, CHAR_ACTIONS, CHAR_FRAME, DOCUMENTS } from '../config/constants.js';
import { createCharacterTextures } from '../utils/character.js';

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

        // Piattaforme in mattoni d'oro (400x32 come la vecchia platform.png):
        // 'ground' = pavimento continuo, 'gold_platform' = piattaforma sospesa
        // (angoli arrotondati + bordo inferiore in ombra).
        this.load.svg('ground', 'assets/platforms/gold_bricks_ground.svg', { width: 400, height: 32 });
        this.load.svg('gold_platform', 'assets/platforms/gold_bricks_platform.svg', { width: 400, height: 32 });
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

        // Stesso lingotto, più piccolo: è il "proiettile" lanciato dal player.
        this.load.svg('gold_shot', 'assets/items/ingot.svg', { width: 22, height: 15 });

        // Personaggi (player + nemici): una spritesheet per azione.
        Object.keys(CHARACTERS).forEach((prefix) => this.loadCharacter(prefix));

        // Proiettili: il player lancia lingotti (gold_shot), l'owlet penne biro.
        this.load.image('pen', 'assets/enemies/pen.png');

        // Ascia del dude: si vede solo quando colpisce il player (collisione).
        this.load.image('axe', 'assets/enemies/axe.png');

        // Documenti della pratica (pixel-art 32x32): restano su filtro NEAREST.
        DOCUMENTS.forEach((d) => this.load.image(d.key, `assets/documents/${d.key}.png`));

        // Contratto (livello 2), spruzzino profumato + spruzzo + stelline stordimento.
        this.load.image('contract', 'assets/documents/contract.png');
        this.load.image('sprayer', 'assets/enemies/sprayer.png');
        this.load.image('spray_puff', 'assets/enemies/spray_puff.png');
        this.load.image('stun', 'assets/enemies/stun.png');

        // Piccione dispettoso e la sua "cacca" (pixel-art).
        // Il piccione è una spritesheet 32x24: 4 frame per lo sbattito d'ali.
        this.load.spritesheet('pigeon', 'assets/pigeon/pigeon.png', { frameWidth: 32, frameHeight: 24 });
        this.load.image('pigeon_poop', 'assets/pigeon/pigeon_poop.png');
        this.load.image('poop_splat', 'assets/pigeon/poop_splat.png');

        // Mattone d'oro liscio: unico blocco 32x32 che compone TUTTE le
        // piattaforme (pavimento + sospese). Uno di questi è il blocco segreto.
        this.load.image('block', 'assets/secret/block.png');
        this.load.image('check', 'assets/secret/check.png'); // assegno bonus

        // Audio
        this.load.audio('mus_bg', s + 'music.mp3');
    }

    create() {
        // I personaggi "generated" non hanno file: vanno disegnati prima di
        // creare le animazioni, che leggono i frame dalla texture.
        ['biz', 'dude', 'owlet'].forEach((prefix) => createCharacterTextures(this, prefix));

        Object.keys(CHARACTERS).forEach((prefix) => this.createCharacterAnims(prefix));

        // Volo del piccione: ali che sbattono (loop continuo).
        if (!this.anims.exists('pigeon-fly')) {
            this.anims.create({
                key: 'pigeon-fly',
                frames: this.anims.generateFrameNumbers('pigeon', { start: 0, end: 3 }),
                frameRate: 10,
                repeat: -1
            });
        }

        // Le icone UI non sono pixel art: filtro lineare per bordi morbidi
        // (il resto del gioco usa NEAREST per gli sprite 32x32).
        ['heart_full', 'heart_empty', 'ammo', 'shine', 'ingot', 'gold_shot', 'ground', 'gold_platform'].forEach((key) => {
            if (this.textures.exists(key)) {
                this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
            }
        });

        this.scene.start(SCENES.MENU);
    }

    loadCharacter(prefix) {
        const { folder, base, generated } = CHARACTERS[prefix];
        if (generated) return; // texture create a runtime, niente da caricare
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
