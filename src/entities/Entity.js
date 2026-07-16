// Classe base per tutte le entità con fisica (player, nemici, ...).
// Si occupa di registrare lo sprite nella scena e nel mondo fisico,
// così le sottoclassi possono concentrarsi solo sul comportamento.
export class Entity extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, frame) {
        super(scene, x, y, texture, frame);
        scene.add.existing(this);
        scene.physics.add.existing(this);
    }
}
