// Generatore delle spritesheet del protagonista (l'uomo d'affari).
//
// Nel progetto non esistono asset disegnati per questo personaggio, quindi i
// frame vengono disegnati a runtime su canvas e registrati come spritesheet
// 32x32, esattamente come quelle caricate da file: stesso nome delle texture
// (`${prefix}_${azione}`) e stesso numero di frame di CHAR_ACTIONS, così il
// resto del gioco (animazioni, Player, Enemy) non deve sapere nulla.

import { CHAR_ACTIONS, CHAR_FRAME } from '../config/constants.js';

const COLORS = {
    skin: '#f0c092',
    skinDark: '#d29a6b',
    hair: '#33261b',
    suit: '#2c3a57',
    suitDark: '#1d2740',
    shirt: '#f5f7fa',
    tie: '#c0392b',
    shoe: '#141414',
    gold: '#ffd34d',
    goldDark: '#c8890f'
};

// Genera (una sola volta) tutte le spritesheet del personaggio.
export function createBusinessmanTextures(scene, prefix) {
    for (const [name, def] of Object.entries(CHAR_ACTIONS)) {
        const key = `${prefix}_${name}`;
        if (scene.textures.exists(key)) continue;

        const canvas = document.createElement('canvas');
        canvas.width = CHAR_FRAME * def.frames;
        canvas.height = CHAR_FRAME;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        for (let i = 0; i < def.frames; i++) {
            drawFrame(ctx, i * CHAR_FRAME, name, i, def.frames);
        }

        scene.textures.addSpriteSheet(key, canvas, {
            frameWidth: CHAR_FRAME,
            frameHeight: CHAR_FRAME
        });
    }
}

// --- Pose ---------------------------------------------------------------
// Ogni azione produce dei parametri; drawFigure() si occupa del disegno.
// bodyDy: oscillazione verticale | legPhase: -1..1 passo | armPhase: -1..1
// tilt: rotazione in radianti (usata per la morte) | alpha: dissolvenza
// throwArm: 0..1 braccio che lancia | coin: mostra il lingotto in mano

function poseFor(action, i, total) {
    const t = total > 1 ? i / (total - 1) : 0;

    switch (action) {
        case 'idle':
            // Respiro: su e giù di un pixel.
            return { bodyDy: [0, 1, 1, 0][i % 4], armPhase: 0 };

        case 'walk': {
            const phase = Math.sin((i / total) * Math.PI * 2);
            return {
                bodyDy: i % 3 === 1 ? -1 : 0,
                legPhase: phase,
                armPhase: -phase
            };
        }

        case 'jump': {
            // Caricamento -> stacco -> volo -> discesa.
            if (i === 0) return { bodyDy: 2, crouch: true, armPhase: 0.6 };
            if (i === 1) return { bodyDy: 1, crouch: true, armPhase: 0.9 };
            const air = (i - 2) / (total - 3);
            return {
                bodyDy: -1,
                legPhase: 0.5,
                tuck: true,
                armPhase: 0.8 - air * 0.6
            };
        }

        case 'throw':
            // Carica dietro la spalla e scaglia il lingotto in avanti.
            return {
                bodyDy: i === 0 ? 0 : -1,
                armPhase: -0.4,
                throwArm: [0.1, 0.55, 1, 0.8][i],
                coin: i < 3,
                lean: i * 0.06
            };

        case 'hurt':
            return {
                bodyDy: [-2, -1, 0, 0][i],
                tilt: -0.18 - i * 0.04,
                armPhase: 0.9,
                flash: i < 2
            };

        case 'death':
            // Cade all'indietro e svanisce.
            return {
                bodyDy: i < 2 ? -1 : 0,
                tilt: -t * (Math.PI / 2),
                armPhase: 0.8,
                alpha: t > 0.75 ? 1 - (t - 0.75) * 3.2 : 1
            };

        default:
            return {};
    }
}

function drawFrame(ctx, ox, action, i, total) {
    const pose = poseFor(action, i, total);
    ctx.save();
    ctx.globalAlpha = pose.alpha != null ? Math.max(0, pose.alpha) : 1;

    const tilt = (pose.tilt || 0) + (pose.lean || 0);
    if (tilt) {
        // Ruota attorno ai piedi, così il personaggio "cade" invece di scivolare.
        ctx.translate(ox + 16, 31);
        ctx.rotate(tilt);
        ctx.translate(-16, -31);
        drawFigure(ctx, 0, pose);
    } else {
        drawFigure(ctx, ox, pose);
    }

    ctx.restore();
}

// --- Disegno ------------------------------------------------------------

function drawFigure(ctx, ox, pose) {
    const dy = pose.bodyDy || 0;
    const legPhase = pose.legPhase || 0;
    const armPhase = pose.armPhase || 0;

    const px = (x, y, w, h, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(ox + x, y, w, h);
    };

    // --- Gambe e scarpe ---
    const legTop = 24 + dy;
    const legLen = pose.crouch ? 4 : pose.tuck ? 4 : 6;
    const backLeg = Math.round(legPhase * 2);
    const frontLeg = -backLeg;

    px(12 + backLeg, legTop, 3, legLen, COLORS.suitDark);
    px(17 + frontLeg, legTop, 3, legLen, COLORS.suit);
    px(11 + backLeg, legTop + legLen, 5, 2, COLORS.shoe);
    px(16 + frontLeg, legTop + legLen, 5, 2, COLORS.shoe);

    // --- Busto (giacca) ---
    const torsoTop = 15 + dy;
    px(11, torsoTop, 10, 10, COLORS.suit);
    px(11, torsoTop, 2, 10, COLORS.suitDark);      // ombra sul lato
    px(15, torsoTop, 3, 5, COLORS.shirt);          // camicia
    px(15, torsoTop, 1, 5, COLORS.suitDark);       // revers sinistro
    px(17, torsoTop, 1, 5, COLORS.suitDark);       // revers destro
    px(16, torsoTop + 2, 1, 7, COLORS.tie);        // cravatta
    px(15, torsoTop + 8, 3, 1, COLORS.tie);

    // --- Braccia ---
    const backArmY = torsoTop + 1 + Math.round(armPhase * 2);
    px(8, backArmY, 3, 7, COLORS.suitDark);
    px(8, backArmY + 7, 3, 2, COLORS.skinDark);

    if (pose.throwArm != null) {
        drawThrowArm(px, torsoTop, pose);
    } else {
        const frontArmY = torsoTop + 1 - Math.round(armPhase * 2);
        px(21, frontArmY, 3, 7, COLORS.suit);
        px(21, frontArmY + 7, 3, 2, COLORS.skin);
    }

    // --- Testa ---
    const headTop = 6 + dy;
    px(12, headTop + 1, 8, 8, COLORS.skin);        // viso
    px(12, headTop + 1, 2, 8, COLORS.skinDark);    // ombra
    px(11, headTop, 10, 3, COLORS.hair);           // capelli
    px(11, headTop + 3, 1, 2, COLORS.hair);        // basetta
    px(20, headTop + 3, 1, 2, COLORS.hair);
    px(14, headTop + 4, 1, 1, '#1b1b1b');          // occhi
    px(18, headTop + 4, 1, 1, '#1b1b1b');
    px(15, headTop + 7, 3, 1, COLORS.skinDark);    // bocca
    px(14, headTop + 9, 6, 1, COLORS.shirt);       // colletto

    if (pose.flash) {
        ctx.fillStyle = 'rgba(255,64,64,0.35)';
        ctx.fillRect(ox + 8, headTop, 16, 26);
    }
}

// Braccio che lancia: si carica dietro la spalla e si distende in avanti,
// con il lingotto d'oro in mano finché non parte.
function drawThrowArm(px, torsoTop, pose) {
    const p = pose.throwArm;

    if (p < 0.4) {
        // Carica: braccio piegato all'indietro, sopra la spalla.
        px(19, torsoTop - 3, 3, 5, COLORS.suit);
        px(19, torsoTop - 5, 3, 2, COLORS.skin);
        if (pose.coin) drawCoin(px, 18, torsoTop - 8);
    } else if (p < 0.8) {
        // Rilascio: braccio in alto, quasi disteso.
        px(21, torsoTop - 2, 3, 6, COLORS.suit);
        px(23, torsoTop - 4, 2, 2, COLORS.skin);
        if (pose.coin) drawCoin(px, 24, torsoTop - 7);
    } else {
        // Follow-through: braccio teso in avanti.
        px(21, torsoTop + 2, 6, 3, COLORS.suit);
        px(27, torsoTop + 2, 2, 3, COLORS.skin);
        if (pose.coin) drawCoin(px, 28, torsoTop + 1);
    }
}

function drawCoin(px, x, y) {
    px(x, y, 4, 1, COLORS.gold);
    px(x - 1, y + 1, 6, 2, COLORS.gold);
    px(x - 1, y + 3, 6, 1, COLORS.goldDark);
}
