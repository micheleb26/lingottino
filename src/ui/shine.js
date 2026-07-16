// Effetto "riflesso/glint": una scintilla compare sull'oggetto, cresce, ruota e
// svanisce, accompagnata da un piccolo impulso di scala (battito) sull'oggetto.
// Usato a intervalli sui cuori e sull'icona munizioni della HUD (fixed: true) e
// sui lingotti nel mondo di gioco (fixed: false, default -> segue la camera).
export function playShine(scene, target, { fixed = false } = {}) {
    if (!target || !target.active) return;

    const size = target.displayWidth * 0.75;
    const spark = scene.add.image(
        target.x - target.displayWidth * 0.16,
        target.y - target.displayHeight * 0.16,
        'shine'
    )
        .setScrollFactor(fixed ? 0 : 1)
        .setDepth((target.depth || 0) + 1)
        .setBlendMode(Phaser.BlendModes.ADD);

    spark.setDisplaySize(size, size);
    const fullScale = spark.scaleX; // scala che produce la dimensione voluta
    spark.setScale(0).setAlpha(0).setAngle(-20);

    scene.tweens.add({
        targets: spark,
        scale: { from: 0, to: fullScale },
        alpha: { from: 0, to: 1 },
        angle: { from: -20, to: 40 },
        duration: 280,
        yoyo: true,
        ease: 'Sine.easeOut',
        onComplete: () => spark.destroy()
    });

    // Battito leggero dell'oggetto (intorno alla sua scala attuale).
    scene.tweens.add({
        targets: target,
        scaleX: target.scaleX * 1.18,
        scaleY: target.scaleY * 1.18,
        duration: 160,
        yoyo: true,
        ease: 'Quad.easeOut'
    });
}
