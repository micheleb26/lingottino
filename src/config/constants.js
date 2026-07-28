// Valori di configurazione centralizzati del gioco.

export const GAME = {
    WIDTH: 800,
    HEIGHT: 600,
    WORLD_WIDTH: 2000,
    GRAVITY_Y: 600,
    START_LIVES: 3,
    BLOCK: 32        // lato del blocco base che compone tutte le piattaforme
};

export const PLAYER = {
    PREFIX: 'biz',
    SPEED: 200,
    JUMP_VELOCITY: 500,
    JUMP_CUT_VELOCITY: 150, // taglio del salto quando si rilascia il tasto (altezza variabile)
    BOUNCE: 0,
    COYOTE_MS: 100,         // tolleranza salto dopo aver lasciato il suolo
    JUMP_BUFFER_MS: 120,    // memorizza la pressione del salto poco prima di atterrare
    INVULNERABLE_MS: 1000,  // invulnerabilità dopo aver perso una vita
    FIRE_COOLDOWN_MS: 350,  // cadenza dell'arma base (munizioni illimitate)
    FIRE_MAX_HOLD_MS: 3000, // fuoco continuo max: oltre, il player si stanca
    FIRE_TIRED_MS: 3000     // durata dello "stanco": non può sparare
};

export const ENEMY = {
    SPEED: 80,
    HP: 1,                  // nemici di primo livello: un colpo basta
    STOMP_BOUNCE: 300,      // rimbalzo del player dopo aver schiacciato un nemico
    SCORE: 50,
    SHOOT_RANGE: 320,       // distanza entro cui un nemico tiratore spara
    SHOOT_COOLDOWN_MS: 1600
};

export const PROJECTILE = {
    PLAYER_SPEED: 450,
    ENEMY_SPEED: 250,
    LIFESPAN_MS: 1500
};

export const SCORE = {
    INGOT: 10,
    DOC: 100,         // punti per ogni documento della pratica raccolto
    CHECK: 200        // bonus dell'assegno nascosto nel blocco segreto
};

// Piccione: vola avanti e indietro a un'altezza fissa dello schermo e, quando
// si trova più o meno sopra il giocatore, gli lascia cadere addosso una cacca.
// Se colpisce il player toglie punti (il punteggio può andare in negativo).
export const PIGEON = {
    SCREEN_Y: 180,          // altezza fissa sullo schermo: sotto le scritte dell'HUD
    MARGIN: 40,             // margine di rimbalzo dai bordi dello schermo
    SPEED: 130,             // velocità orizzontale (px/s)
    AIM_THRESHOLD: 46,      // "più o meno sopra": scarto max in X per cagare
    POOP_COOLDOWN_MS: 1600, // tempo minimo tra una cacca e l'altra
    POOP_FALL_VY: 140,      // velocità iniziale verso il basso della cacca
    POOP_AIM_VX: 90,        // spinta orizzontale max verso il player (mira)
    POOP_PENALTY: 10,       // punti sottratti se la cacca colpisce il player
    SPLAT_MS: 5000          // durata della macchia sulla spalla del player
};

// Documenti della "pratica" da raccogliere IN SEQUENZA: ne compare uno alla
// volta, in un punto casuale della mappa, e solo quando viene raccolto appare
// il successivo. `type` seleziona lo stile grafico (pixel-art in assets/documents/).
// L'ordine di questo array È l'ordine di raccolta richiesto.
export const DOCUMENTS = [
    { key: 'doc_id_card',                   name: "Carta d'identità",        type: 'tessera' },
    { key: 'doc_codice_fiscale',            name: 'Codice fiscale',          type: 'tessera' },
    { key: 'doc_casellario',                name: 'Casellario giudiziario',  type: 'contratto' },
    { key: 'doc_carichi_pendenti',          name: 'Carichi pendenti',        type: 'contratto' },
    { key: 'doc_accordo_riservatezza',      name: 'Accordo riservatezza',    type: 'contratto' },
    { key: 'doc_accordo_collaborazione',    name: 'Accordo di collaborazione', type: 'contratto' },
    { key: 'doc_attestato_antiriciclaggio', name: 'Attestato antiriciclaggio', type: 'attestato' },
    { key: 'doc_attestato_privacy',         name: 'Attestato privacy',       type: 'attestato' }
];

// Scritta di vittoria mostrata a tutto schermo quando la pratica è completa.
export const WIN_TEXT = 'OOOOOOooooo\nCare is Gold!';

// Tempo per completare la pratica. Scaduto il tempo senza aver raccolto tutti
// i documenti, il livello è perso.
export const TIMER = {
    LEVEL_SECONDS: 90 // un minuto e mezzo
};

// Scritte della schermata di sconfitta per tempo scaduto.
export const TIMEOUT_TEXT = {
    TITLE: 'NOOOOOOOO, Care is Gold!',
    BODY: 'Non sei riuscito a soddisfare in tempo gli obblighi necessari per diventare un collaboratore.\nRitenta'
};

// Il grido dell'uomo d'affari quando elimina un nemico.
export const TAUNT = {
    TEXT: 'OOOOO CAREISGOLD',
    SPEECH: 'ooooo care is gold', // testo letto dalla sintesi vocale del browser
    DURATION_MS: 900,
    COOLDOWN_MS: 450             // evita sovrapposizioni con kill ravvicinate
};

// Personaggi: cartella + prefisso del nome file. Condividono tutti lo stesso
// set di animazioni (vedi CHAR_ACTIONS), quindi basta cambiare questi dati.
// `generated: true` = niente file su disco, i frame sono disegnati a runtime
// (vedi utils/businessman.js).
export const CHARACTERS = {
    biz: { generated: true },
    pink: { folder: 'assets/player/pink/', base: 'Pink_Monster' },
    dude: { folder: 'assets/enemies/dude_monster/', base: 'Dude_Monster' },
    owlet: { folder: 'assets/enemies/owlet_monster/', base: 'Owlet_Monster' }
};

// Azioni comuni a tutti i personaggi: suffisso file, numero di frame, velocità.
// I file sono strisce orizzontali di frame 32x32 (es. Pink_Monster_Walk_6.png).
export const CHAR_FRAME = 32;
export const CHAR_ACTIONS = {
    idle: { suffix: 'Idle_4', frames: 4, rate: 8, repeat: -1 },
    walk: { suffix: 'Walk_6', frames: 6, rate: 12, repeat: -1 },
    jump: { suffix: 'Jump_8', frames: 8, rate: 12, repeat: 0 },
    throw: { suffix: 'Throw_4', frames: 4, rate: 16, repeat: 0 },
    hurt: { suffix: 'Hurt_4', frames: 4, rate: 12, repeat: 0 },
    death: { suffix: 'Death_8', frames: 8, rate: 12, repeat: 0 }
};

export const PATHS = {
    ASSETS: 'assets/phaser/',
    SOUNDS: 'sounds/phaser/'
};

export const SCENES = {
    BOOT: 'BootScene',
    MENU: 'MainMenu',
    GAME: 'GameScene',
    SETTINGS: 'SettingsScene'
};
