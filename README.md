# JKLM Bot

Bot non-officiel pour **[JKLM.fun](https://jklm.fun/)**, complètement reverse engineering.

Support des deux jeux disponibles, à savoir **BombParty** et **PopSauce** ([voir plus bas pour l'installation](#comment-jouer-à-popsauce-))

## Mise en garde

Cet outil ne respecte évidemment pas les règles d'utilisations de JKLM.fun, je ne serai pas responsable des bannissements.


## Installation

Vous devez tout d'abord installer les dépendances avant de lancer l'application JavaScript.

```sh
npm install
```

Pour le code de la Room, vous pouvez passer soit par argument, soit par variable d'environnement.

### Exécution par argument

```sh
node index.js [ROOM_CODE]
```

### Exécution par variable d'environnement

```sh
export ROOM_CODE="[ROOM_CODE]"
node index.js
```

> `[ROOM_CODE]` est bien évidemment le code du salon à rejoindre


## Mise en place

Il faut savoir que JKLM.fun possède un système de Captcha par Google. Pour ce faire, vous devez exécuter le script JavaScript ci-dessous depuis une Room.

Pour l'injection, ouvrir la console de votre navigateur (`F12` ou `Ctrl + Shift + I`) et copier-coller le code ci-dessous dans votre navigateur.

```javascript
await fetch("http://localhost:3000/captcha", { method: 'POST', body: await grecaptcha.execute('6LdzYGslAAAAACxOZaQA5J0CxlfdJQUdWvJYoAFM', { action: 'joinRoom' }) })
```

Le bot est désormais opérationnel !


## Comment jouer à PopSauce ?

Vous devez télécharger et lancer [le serveur](https://github.com/coco13579/popsauce-bot) pour pouvoir utiliser les services de **Google Lens**.