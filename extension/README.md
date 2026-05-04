# Extension Ultimate Creator

Cette extension ajoute un bouton orange **Télécharger** sur YouTube. Au clic, elle envoie l'URL à l'app desktop via le serveur local `127.0.0.1:47821`.

## Installation

1. Ouvre l'app **Ultimate Creator App** sur ton ordinateur (elle doit être lancée).
2. Va dans `chrome://extensions` (ou `edge://extensions`, `opera://extensions`, `brave://extensions`).
3. Active **Mode développeur** en haut à droite.
4. Clique **Charger l'extension non empaquetée** et sélectionne ce dossier.
5. Va sur n'importe quelle vidéo YouTube — un bouton orange "Télécharger" apparaît.

## Note sur les icônes

Les icônes PNG (`icon16.png`, `icon48.png`, `icon128.png`) doivent être générées depuis `icons/icon.svg`.

Sur Windows, utilise par exemple [Inkscape](https://inkscape.org/) ou un convertisseur en ligne pour exporter le SVG en PNG aux trois tailles.

Sans icônes PNG, l'extension fonctionne quand même mais Chrome affichera une icône grise par défaut.
