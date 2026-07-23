// Valori di configurazione centralizzati del gioco.

export const GAME = {
    WIDTH: 800,
    HEIGHT: 600,
    WORLD_WIDTH: 2000,
    GRAVITY_Y: 600,
    START_LIVES: 3
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
    FIRE_COOLDOWN_MS: 350   // cadenza dell'arma base (munizioni illimitate)
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
    INGOT: 10
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
