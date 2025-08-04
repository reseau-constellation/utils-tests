import {
  attendreFichierExiste,
  attendreFichierModifié,
  dossierTempo,
} from "@/index.js";

import { isBrowser, isElectronRenderer } from "wherearewe";
import { join } from "path";

import { expect } from "aegir/chai";
import { rimraf } from "rimraf";

describe("Attendre fichier existe", function () {
  let dossier: string;
  let effacer: () => void;

  beforeEach(async () => {
    ({ dossier, effacer } = await dossierTempo());
  });

  afterEach(async () => {
    effacer();
  });

  it("Fichier créé", async function () {
    if (isBrowser || isElectronRenderer) {
      this.skip();
    } else {
      const fichier = join(dossier, "téléchargement.txt");

      const attente = attendreFichierExiste({ fichier });
      const { writeFileSync } = await import("fs");
      writeFileSync(fichier, "Salut !");
      const val = await attente;

      expect(val).to.be.true();
    }
  });

  it("Avorter", async function () {
    if (isBrowser || isElectronRenderer) {
      this.skip();
    } else {
      const contrôlleur = new AbortController();
      const { signal } = contrôlleur;
      const fichier = join(dossier, "téléchargement.txt");

      const résultat = attendreFichierExiste({ fichier, signal });
      contrôlleur.abort();
      const val = await résultat;

      expect(val).to.be.false();
    }
  });
});

describe("Attendre fichier modifié", function () {
  let dossier: string;
  let effacer: () => void;

  beforeEach(async () => {
    ({ dossier, effacer } = await dossierTempo());
  });

  afterEach(async () => {
    effacer();
  });

  it("Fichier créé après début écoute", async function () {
    if (isBrowser || isElectronRenderer) this.skip();

    const fichier = join(dossier, "création.txt");
    const { writeFileSync } = await import("fs");

    writeFileSync(fichier, "Salut !");

    const attente = attendreFichierModifié({ fichier });
    await new Promise<void>((résoudre) => setTimeout(résoudre, 10)); // Parfois nécessaire

    writeFileSync(fichier, "Re-bonjour !");

    const val = await attente;

    expect(val).to.be.true();
  });

  it("Fichier créé avant début écoute", async function () {
    if (isBrowser || isElectronRenderer) this.skip();
    const fichier = join(dossier, "modification.txt");
    const { writeFileSync } = await import("fs");
    writeFileSync(fichier, "Salut !");

    const attente = attendreFichierModifié({ fichier });

    await new Promise<void>((résoudre) => setTimeout(résoudre, 10)); // Parfois nécessaire
    writeFileSync(fichier, "Rebonjour !");

    const val = await attente;
    expect(val).to.be.true();
  });

  it("Avorter", async function () {
    if (isBrowser || isElectronRenderer) {
      this.skip();
    } else {
      const contrôlleur = new AbortController();
      const { signal } = contrôlleur;
      const fichier = join(dossier, "téléchargement.txt");

      const { writeFileSync } = await import("fs");
      writeFileSync(fichier, "Salut !");

      const résultat = attendreFichierModifié({ fichier, signal });
      await new Promise<void>((résoudre) => setTimeout(résoudre, 10)); // Parfois nécessaire

      contrôlleur.abort();
      const val = await résultat;

      expect(val).to.be.false();
    }
  });

  it("Fichier effaçé", async function () {
    if (isBrowser || isElectronRenderer) this.skip();
    const fichier = join(dossier, "modification.txt");

    const attente = attendreFichierModifié({ fichier });

    const { writeFileSync } = await import("fs");
    writeFileSync(fichier, "Salut !");
    rimraf(fichier);

    const val = await attente;
    expect(val).to.be.false();
  });
});
