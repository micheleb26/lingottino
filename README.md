# lingottino

Platformer arcade scritto in Phaser 3.

Gioco online: [https://micheleb26.github.io/lingottino/](https://micheleb26.github.io/lingottino/)

## Comandi

| Tasto | Azione |
| --- | --- |
| Frecce / `A` `D` | Muoviti a sinistra e destra |
| Freccia su / `W` / `Spazio` | Salta (altezza variabile) |
| `F` | Spara (arma base, munizioni illimitate) |
| `P` | Pausa |
| `I` | Impostazioni |
| `Invio` | Ricomincia (a game over) |

Elimina i nemici sparando o saltandoci sopra: ai nemici di primo livello
basta un colpo. Alcuni nemici (gli Owlet) sparano a loro volta. Raccogli tutti
i lingotti d'oro (che scintillano) per farne ricomparire di nuovi (attenzione:
compare anche una bomba).

La HUD mostra il punteggio (con icona lingotto), le vite a forma di cuore
(rossi = vite, contorno grigio = perse) e le munizioni (∞ per l'arma base).
I cuori e l'icona munizioni hanno un riflesso animato periodico.

## Avvio locale

Serve un piccolo web server (i moduli ES non si caricano da `file://`):

```sh
python -m http.server 8001
```

Poi apri [http://127.0.0.1:8001](http://127.0.0.1:8001). In alternativa usa gli
script `http-server.bat` / `http-server.ps1` / `http-server.sh`.

## Struttura del progetto

```
src/
  main.js              # configurazione Phaser e avvio del gioco
  config/constants.js  # parametri centralizzati (velocità, vite, percorsi, ...)
  scenes/              # BootScene, MainMenu, SettingsScene, GameScene
  entities/            # Entity (base) -> Player, Enemy -> ShooterEnemy; Projectile, Ingot
  ui/                  # Hud, HeartsDisplay, AmmoDisplay, shine (riflesso)
  utils/audio.js       # sblocco del contesto audio
assets/
  phaser/              # scenario, bomba, logo, pulsanti
  ui/                  # cuori, munizioni, riflesso (SVG)
  items/               # lingotto d'oro raccoglibile (SVG)
  player/pink/         # Pink Monster (giocatore)
  enemies/dude_monster, owlet_monster   # nemici
sounds/                # musica
```
