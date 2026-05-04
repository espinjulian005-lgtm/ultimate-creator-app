# Extension Ultimate Creator

Bouton orange **Télécharger** injecté sur YouTube + adblock configurable. Au clic, l'URL est envoyée à l'app desktop via le serveur local `127.0.0.1:47821`.

L'app **Ultimate Creator App** doit être lancée pour que les téléchargements fonctionnent. L'adblock fonctionne indépendamment.

---

## Chrome / Edge / Brave / Opera / Vivaldi

C'est le chemin le plus simple. **30 secondes**.

1. Lance Ultimate Creator App
2. Va sur `chrome://extensions` (ou `edge://extensions`, `brave://extensions`, `opera://extensions`)
3. Active **Mode développeur** (en haut à droite)
4. Clique **Charger l'extension non empaquetée**
5. Sélectionne le dossier `extension/`
6. Va sur n'importe quelle vidéo YouTube — un bouton orange "Télécharger" apparaît à côté du bouton "Partager"

## Firefox

Firefox utilise un format légèrement différent mais Manifest V3 est supporté depuis Firefox 109+.

1. Va sur `about:debugging#/runtime/this-firefox`
2. Clique **Charger un module complémentaire temporaire…**
3. Sélectionne `extension/manifest.json`

⚠️ Firefox supprime l'extension à chaque redémarrage en mode temporaire — pour la garder, il faut la signer via [addons.mozilla.org](https://addons.mozilla.org).

## Safari

Safari ne charge pas directement le format Chrome — il faut le convertir en projet Xcode et le compiler. Trois options selon ton niveau :

### A. Tu n'as pas Xcode et tu veux juste l'extension

Télécharge **`UltimateCreatorExtension-unsigned.app.zip`** depuis la dernière [release](https://github.com/espinjulian005-lgtm/ultimate-creator-app/releases/latest), puis :

1. Décompresse le ZIP
2. Lance l'app `Ultimate Creator Extension.app` une fois (clic-droit → Ouvrir pour contourner Gatekeeper)
3. Quitte l'app
4. **Safari → Réglages → Avancé** → coche **"Afficher le menu Développement"**
5. Menu **Développement → Autoriser les extensions non signées** ⚠️ à recocher après chaque redémarrage de Safari sans compte Apple Developer
6. **Safari → Réglages → Extensions** → active **"Ultimate Creator Extension"**

### B. Tu as Xcode et tu veux compiler depuis les sources

Sur ton Mac :

```bash
git clone https://github.com/espinjulian005-lgtm/ultimate-creator-app
cd ultimate-creator-app
chmod +x scripts/convert-safari.sh
./scripts/convert-safari.sh
```

Le script génère un projet Xcode dans `safari-build/`. Ouvre-le dans Xcode → ▶ Run → puis suis les étapes 4–6 ci-dessus.

### C. Tu as un compte Apple Developer (99 $/an)

Tu peux signer l'extension proprement et la distribuer sur le **Mac App Store**, ce qui élimine le besoin de "Autoriser les extensions non signées". C'est la voie pro.

### Limitations Safari

- **`declarativeNetRequest.getMatchedRules`** n'est pas implémenté → le compteur "X requêtes bloquées" du popup reste vide. Le blocage marche, juste pas les stats.
- Sans compte Apple Developer, "Autoriser les extensions non signées" doit être recoché à chaque redémarrage de Safari.
- iOS Safari supporte aussi les Web Extensions depuis iOS 15, mais il faudrait un build supplémentaire (scheme "iOS").

---

## Permissions demandées

| Permission | Pourquoi |
|---|---|
| `activeTab` | lire l'URL YouTube actuelle pour la transmettre à l'app |
| `scripting` | injecter le bouton de téléchargement dans la page |
| `storage` | sauvegarder tes préférences d'adblock entre sessions |
| `declarativeNetRequest` | bloquer les requêtes pub via les règles statiques |
| `host_permissions: <all_urls>` | détecter les popups/popunders (le bloqueur tourne sur tous les sites) |
| `host_permissions: 127.0.0.1:47821` | dialoguer avec l'app desktop locale |

Aucune donnée n'est envoyée sur Internet par l'extension. Tout reste local.

## Icônes

Les icônes PNG sont dans `icons/`. Si elles manquent (cas extrême), le navigateur affiche une icône grise par défaut, l'extension fonctionne quand même.
