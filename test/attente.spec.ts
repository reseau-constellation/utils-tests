import {
  AttendreFichierExiste,
  AttendreFichierModifié,
  AttendreRésultat,
} from "@/attente.js";
import { dossierTempo } from "@/dossiers.js";

import { isBrowser, isWebWorker } from "wherearewe";
import { join } from "path";

import { expect } from "aegir/chai";

describe("AttendreRésultat", function () {
  it("attendre existe", async () => {
    const attente = new AttendreRésultat<number>();
    const résultat = attente.attendreExiste();
    attente.mettreÀJour(1);
    expect(await résultat).to.equal(1);
  });
  it("attendre que", async () => {
    const attente = new AttendreRésultat<number>();
    const résultat = attente.attendreQue((x) => x > 1);
    attente.mettreÀJour(1);
    expect(attente.val).to.equal(1);
    attente.mettreÀJour(2);
    expect(await résultat).to.equal(2);
  });
});

describe("AttendreFichier", function () {
  it("Fichier créé", async function () {
    if (isBrowser || isWebWorker) {
      this.skip();
    } else {
      const { dossier, fEffacer } = await dossierTempo();
      const fichier = join(dossier, "téléchargement.txt");
      const attente = new AttendreFichierExiste(fichier);
      const résultat = attente.attendre();
      const { writeFileSync } = await import("fs");
      writeFileSync(fichier, "Salut !");
      await résultat;
      fEffacer();
    }
  });
});

describe("AttendreFichierModifié", function () {
  let dossier: string;
  let fEffacer: () => void;

  before(async () => {
    ({ dossier, fEffacer } = await dossierTempo());
  });
  after(async () => {
    fEffacer?.();
  });

  it("Fichier créé", async function () {
    if (isBrowser || isWebWorker) this.skip();

    const fichier = join(dossier, "création.txt");
    const { writeFileSync } = await import("fs");
    const attente = new AttendreFichierModifié(fichier);
    const résultat = attente.attendre(Date.now());
    await new Promise<void>((résoudre) => setTimeout(résoudre, 100)); // Parfois nécessaire
    writeFileSync(fichier, "Salut !");
    await résultat;
  });

  it("Fichier modifié après création", async function () {
    if (isBrowser || isWebWorker) this.skip();
    const fichier = join(dossier, "modification.txt");
    const { writeFileSync } = await import("fs");
    writeFileSync(fichier, "Salut !");
    const attente = new AttendreFichierModifié(fichier);
    const résultat = attente.attendre(Date.now());
    await new Promise<void>((résoudre) => setTimeout(résoudre, 100)); // Parfois nécessaire
    writeFileSync(fichier, "Rebonjour !");
    await résultat;
  });
});
