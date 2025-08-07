<p align="center">
  <a href="https://docu.réseau-constellation.ca" title="Constellation">
    <img src="https://docu.xn--rseau-constellation-bzb.ca/logo.svg" alt="Logo Constellation" width="244" />
  </a>
</p>
<h1 align="center">Utils-tests Constellation</h1>
<h3 align="center">Fonctions de test utilitaires pour Constellation</h3>

[![tests](https://github.com/reseau-constellation/utils-tests/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/reseau-constellation/utils-tests/actions/workflows/tests.yml)
[![couverture](https://codecov.io/github/reseau-constellation/utils-tests/graph/badge.svg)](https://codecov.io/github/reseau-constellation/utils-tests)

# Installation
```sh
$ pnpm add --save-dev @constl/utils-tests
```

Cette librairie fournie des fonctions utilitaires pour tester Constellation et les autres librairies basées
sur celle-ci.

# Utilisation

## Constellation
Création d'instances éphémères Constellation pour les tests.

```ts
import { créerConstellation } from "@constl/ipa";
import { créerConstellationsTest } from "@constl/utils-tests"

const { constls, fermer } = créerConstellationsTest({
  n: 2,
  créerConstellation
});

// Ici les Constellations sont déjà connectées l'une à l'autre.

const idBd = await constls[0].bds.créerBd({ licence: "ODbl-1_0" });
await constls[1].bds.suivreNoms({ idBd });

// Fermera les Constellations et effacera toutes leurs données du système
await fermer();

```

## Orbite et Hélia
Création d'instances éphémères d'OrbitDB et de Hélia pour les tests.

Pour Hélia:

```ts
import { créerHéliasTest } from "@constl/utils-tests"

const { hélias, fermer } = créerHéliasTest({
  n: 2,
});

await fermer();
```

Pour OrbitDB:
```ts
import { créerOrbitesTest } from "@constl/utils-tests"

const { orbites, fermer } = créerOrbitesTest({
  n: 2,
});


// Ici les instances d'OrbitDB sont déjà connectées l'une à l'autre.

const bd = await orbites[0].open("données tests", { type: "keyvalue" });
await bd.set("a", 1)

const bdSurLAutreOrbite = await orbites[1].open(bd.address);
await bd.get("a") // => 1

await fermer()  // Effacera toutes les données
```



## Compilation
Plusieurs fonctions utilitaires de compilation sont incluses.

```ts
import { obtConfigEsbuild, générerConfigÆgir } from "@constl/utils-tests"

// Génère une configuration esbuild pour compiler Constellation sur navigateur
const config = await obtConfigEsbuild();


// Génère une configuration à mettre dans `.aegir.js` pour tester des projets avec Ægir (https://github.com/ipfs/aegir). Gère automatiquement la création d'un relai si nécessaire pour vos tests.
const configÆgir = await générerConfigÆgir();

```

## Relai
Lance un relai local qui permet de connecter des instances de Constellation dans les tests sur navigateur.

```ts
// Dans un fichier qui sera exécuté dans un processus séparé des tests (p. ex., `.aegir.js`, voir https://github.com/ipfs/aegir);
import { lancerRelai } from "@constl/utils-tests"

await lancerRelai();

```

## Dossiers
Fonction utilitaire pour créer des dossiers temporaires pour les tests.

```ts
import { dossierTempo } from "@constl/utils-tests"

const { dossier, effacer } = await dossierTempo();

// `dossier` existe

effacer();
// Le dossier n'existe plus
```

## Attente
Fonctions utilitaires pour attendre des résultats.

```ts
import { attendreFichierExiste, attendreFichierModifié } from "@constl/utils-tests"

await attendreFichierExiste({ fichier: "./un/fichier.txt" });
// Maintenant le fichier existe

await attendreFichierModifié({ fichier: "./un/fichier.txt" });
// Le fichier a été modifié depuis l'appel à `attendreFichierModifié`

// Attendra que la condition retourne `true`
await que(()=>true)
```

