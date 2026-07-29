// Generatore parametrico dei personaggi disegnati a runtime (niente file).
// Un'unica logica di pose (idle/walk/jump/throw/hurt/death) e una figura
// parametrica per aspetto: pelle, capelli (+stile), occhiali, colore maglia e
// pantaloni. Registra spritesheet 32x32 con lo stesso schema di quelle da file
// (`${prefix}_${azione}`), così Player/Enemy/animazioni non cambiano.

import { CHAR_ACTIONS, CHAR_FRAME } from '../config/constants.js';

// Aspetto di ciascun personaggio generato.
export const LOOKS = {
    // Uomo d'affari (identico a prima): completo, camicia, cravatta, lancia lingotti.
    biz: {
        skin: '#f0c092', skinDark: '#d29a6b', hair: '#33261b', hairStyle: 'short',
        glasses: false, suit: true,
        shirt: '#2c3a57', shirtDark: '#1d2740',      // giacca
        pants: '#2c3a57', pantsDark: '#1d2740',      // pantaloni del completo
        inner: '#f5f7fa', tie: '#c0392b', shoe: '#141414',
        collar: '#f5f7fa', throwItem: 'coin'
    },
    // Nemico "dude": mora, capelli lunghetti e ricci, occhiali tondi neri,
    // maglia verde, jeans blu.
    dude: {
        skin: '#e7b48a', skinDark: '#c8926a', hair: '#241c15', hairStyle: 'curly',
        glasses: true, suit: false,
        shirt: '#3aa84e', shirtDark: '#2c7f3b',      // maglia verde
        pants: '#3f62b0', pantsDark: '#2f4a86',      // jeans blu
        shoe: '#2a2a2a', collar: '#3aa84e', throwItem: null
    },
    // Nemico "owlet": bionda coi capelli lunghi fino alle spalle, maglia gialla,
    // pantaloni bianchi. Lancia penne biro.
    owlet: {
        skin: '#f1c79c', skinDark: '#d4a878', hair: '#e6c34d', hairStyle: 'long',
        glasses: false, suit: false,
        shirt: '#f2d13b', shirtDark: '#d4b21f',      // maglia gialla
        pants: '#eef0f2', pantsDark: '#cdd2d8',      // pantaloni bianchi
        shoe: '#bfc4cc', collar: '#f2d13b', throwItem: null
    }
};

export function createCharacterTextures(scene, prefix) {
    const look = LOOKS[prefix];
    if (!look) return;
    for (const [name, def] of Object.entries(CHAR_ACTIONS)) {
        const key = `${prefix}_${name}`;
        if (scene.textures.exists(key)) continue;

        const canvas = document.createElement('canvas');
        canvas.width = CHAR_FRAME * def.frames;
        canvas.height = CHAR_FRAME;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        for (let i = 0; i < def.frames; i++) drawFrame(ctx, i * CHAR_FRAME, name, i, def.frames, look);

        scene.textures.addSpriteSheet(key, canvas, { frameWidth: CHAR_FRAME, frameHeight: CHAR_FRAME });
    }
}

// --- Pose (condivise da tutti i personaggi) -----------------------------
function poseFor(action, i, total) {
    const t = total > 1 ? i / (total - 1) : 0;
    switch (action) {
        case 'idle':
            return { bodyDy: [0, 1, 1, 0][i % 4], armPhase: 0 };
        case 'walk': {
            const phase = Math.sin((i / total) * Math.PI * 2);
            return { bodyDy: i % 3 === 1 ? -1 : 0, legPhase: phase, armPhase: -phase };
        }
        case 'jump': {
            if (i === 0) return { bodyDy: 2, crouch: true, armPhase: 0.6 };
            if (i === 1) return { bodyDy: 1, crouch: true, armPhase: 0.9 };
            const air = (i - 2) / (total - 3);
            return { bodyDy: -1, legPhase: 0.5, tuck: true, armPhase: 0.8 - air * 0.6 };
        }
        case 'throw':
            return { bodyDy: i === 0 ? 0 : -1, armPhase: -0.4, throwArm: [0.1, 0.55, 1, 0.8][i], coin: i < 3, lean: i * 0.06 };
        case 'hurt':
            return { bodyDy: [-2, -1, 0, 0][i], tilt: -0.18 - i * 0.04, armPhase: 0.9, flash: i < 2 };
        case 'death':
            return { bodyDy: i < 2 ? -1 : 0, tilt: -t * (Math.PI / 2), armPhase: 0.8, alpha: t > 0.75 ? 1 - (t - 0.75) * 3.2 : 1 };
        default:
            return {};
    }
}

function drawFrame(ctx, ox, action, i, total, look) {
    const pose = poseFor(action, i, total);
    ctx.save();
    ctx.globalAlpha = pose.alpha != null ? Math.max(0, pose.alpha) : 1;
    const tilt = (pose.tilt || 0) + (pose.lean || 0);
    if (tilt) {
        ctx.translate(ox + 16, 31);
        ctx.rotate(tilt);
        ctx.translate(-16, -31);
        drawFigure(ctx, 0, pose, look);
    } else {
        drawFigure(ctx, ox, pose, look);
    }
    ctx.restore();
}

// --- Figura parametrica -------------------------------------------------
function drawFigure(ctx, ox, pose, look) {
    const dy = pose.bodyDy || 0;
    const legPhase = pose.legPhase || 0;
    const armPhase = pose.armPhase || 0;
    const px = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(ox + x, y, w, h); };

    // --- Gambe e scarpe ---
    const legTop = 24 + dy;
    const legLen = pose.crouch ? 4 : pose.tuck ? 4 : 6;
    const backLeg = Math.round(legPhase * 2);
    const frontLeg = -backLeg;
    px(12 + backLeg, legTop, 3, legLen, look.pantsDark);
    px(17 + frontLeg, legTop, 3, legLen, look.pants);
    px(11 + backLeg, legTop + legLen, 5, 2, look.shoe);
    px(16 + frontLeg, legTop + legLen, 5, 2, look.shoe);

    // --- Busto (maglia / giacca) ---
    const torsoTop = 15 + dy;
    px(11, torsoTop, 10, 10, look.shirt);
    px(11, torsoTop, 2, 10, look.shirtDark);          // ombra sul lato
    if (look.suit) {
        px(15, torsoTop, 3, 5, look.inner);           // camicia
        px(15, torsoTop, 1, 5, look.shirtDark);       // revers sinistro
        px(17, torsoTop, 1, 5, look.shirtDark);       // revers destro
        px(16, torsoTop + 2, 1, 7, look.tie);         // cravatta
        px(15, torsoTop + 8, 3, 1, look.tie);
    } else {
        px(15, torsoTop, 2, 1, look.skinDark);        // scollo maglietta
    }

    // --- Braccia ---
    const backArmY = torsoTop + 1 + Math.round(armPhase * 2);
    px(8, backArmY, 3, 7, look.shirtDark);
    px(8, backArmY + 7, 3, 2, look.skinDark);
    if (pose.throwArm != null) {
        drawThrowArm(px, torsoTop, pose, look);
    } else {
        const frontArmY = torsoTop + 1 - Math.round(armPhase * 2);
        px(21, frontArmY, 3, 7, look.shirt);
        px(21, frontArmY + 7, 3, 2, look.skin);
    }

    // --- Testa ---
    drawHead(px, 6 + dy, torsoTop, pose, look);
}

function drawHead(px, headTop, torsoTop, pose, look) {
    // Capelli lunghi: prima i lati che scendono (dietro alla testa).
    if (look.hairStyle === 'long') {
        px(10, headTop + 1, 2, 14, look.hair);   // ciocca sinistra fino alle spalle
        px(20, headTop + 1, 2, 14, look.hair);   // ciocca destra
    }

    // Viso
    px(12, headTop + 1, 8, 8, look.skin);
    px(12, headTop + 1, 2, 8, look.skinDark);

    // Capelli (calotta base)
    px(11, headTop, 10, 3, look.hair);
    px(11, headTop + 3, 1, 2, look.hair);
    px(20, headTop + 3, 1, 2, look.hair);

    if (look.hairStyle === 'curly') {
        // Volume e ricci: più alto e largo, con bozzi.
        px(10, headTop, 1, 3, look.hair);
        px(21, headTop, 1, 3, look.hair);
        px(11, headTop - 1, 10, 1, look.hair);
        px(12, headTop - 2, 2, 1, look.hair);
        px(15, headTop - 2, 2, 1, look.hair);
        px(18, headTop - 2, 2, 1, look.hair);
        px(10, headTop + 3, 1, 2, look.hair);
        px(21, headTop + 3, 1, 2, look.hair);
    } else if (look.hairStyle === 'long') {
        px(11, headTop - 1, 10, 1, look.hair);
        px(10, headTop, 1, 4, look.hair);
        px(21, headTop, 1, 4, look.hair);
    }

    // Occhi
    px(14, headTop + 4, 1, 1, '#1b1b1b');
    px(18, headTop + 4, 1, 1, '#1b1b1b');

    // Occhiali tondi, montatura nera
    if (look.glasses) drawGlasses(px, headTop);

    // Bocca + colletto
    px(15, headTop + 7, 3, 1, look.skinDark);
    px(14, headTop + 9, 6, 1, look.collar);

    if (pose.flash) {
        px(8, headTop, 16, 26, 'rgba(255,64,64,0.35)');
    }
}

function drawGlasses(px, headTop) {
    const B = '#111114';
    const gy = headTop + 3;
    // lente sinistra (attorno all'occhio a x=14)
    px(13, gy, 3, 1, B); px(13, gy + 2, 3, 1, B); px(13, gy + 1, 1, 1, B); px(15, gy + 1, 1, 1, B);
    // lente destra (attorno all'occhio a x=18)
    px(17, gy, 3, 1, B); px(17, gy + 2, 3, 1, B); px(17, gy + 1, 1, 1, B); px(19, gy + 1, 1, 1, B);
    // ponte
    px(16, gy + 1, 1, 1, B);
}

// Braccio che lancia (solo biz mostra il lingotto in mano).
function drawThrowArm(px, torsoTop, pose, look) {
    const p = pose.throwArm;
    if (p < 0.4) {
        px(19, torsoTop - 3, 3, 5, look.shirt);
        px(19, torsoTop - 5, 3, 2, look.skin);
        if (look.throwItem === 'coin' && pose.coin) drawCoin(px, 18, torsoTop - 8, look);
    } else if (p < 0.8) {
        px(21, torsoTop - 2, 3, 6, look.shirt);
        px(23, torsoTop - 4, 2, 2, look.skin);
        if (look.throwItem === 'coin' && pose.coin) drawCoin(px, 24, torsoTop - 7, look);
    } else {
        px(21, torsoTop + 2, 6, 3, look.shirt);
        px(27, torsoTop + 2, 2, 3, look.skin);
        if (look.throwItem === 'coin' && pose.coin) drawCoin(px, 28, torsoTop + 1, look);
    }
}

function drawCoin(px, x, y) {
    px(x, y, 4, 1, '#ffd34d');
    px(x - 1, y + 1, 6, 2, '#ffd34d');
    px(x - 1, y + 3, 6, 1, '#c8890f');
}
