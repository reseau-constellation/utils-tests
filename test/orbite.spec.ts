import { expect } from "aegir/chai";

import {
  FeedStoreTypé,
  KeyValueStore,
  KeyValueStoreTypé,
  OrbitDB,
  SetStore,
  SetStoreTypé,
} from "@orbitdb/core";
import { attendreSync, créerOrbiteTest, peutÉcrire } from "@/orbite.js";
import { accès } from "@constl/ipa";

describe("Créer Orbites", function () {
  let orbites: OrbitDB[];
  let fOublier: () => Promise<void>;

  after(async () => {
    // Au cas où
    await fOublier?.();
  });

  it("Orbites créés", async () => {
    ({ orbites, fOublier } = await créerOrbiteTest({ n: 2 }));

    const idsOrbites = orbites.map((o) => o.id);
    expect(idsOrbites[0]).to.be.a("string");
    expect(idsOrbites[1]).to.be.a("string");
    expect(idsOrbites[0]).to.not.equal(idsOrbites[1]);
  });

  it("Orbites effacés", async () => {
    await fOublier();
    expect(orbites[0].open("adresse test")).to.be.rejected;
    expect(orbites[1].open("adresse test")).to.be.rejected;
  });
});

describe("Fonctions utilitaires", function () {
  let orbites: OrbitDB[];
  let fOublier: () => Promise<void>;

  before(async () => {
    accès.enregistrerContrôleurs();
    ({ orbites, fOublier } = await créerOrbiteTest({ n: 2 }));
  });

  after(async () => {
    await fOublier?.();
  });

  it("Attendre syncronisation", async () => {
    console.log("ici 1");
    const bd = (await orbites[0].open("test sync", {
      type: "keyvalue",
    })) as unknown as KeyValueStore;
    console.log("ici 2");
    const bdSurOrbite2 = (await orbites[1].open(
      bd.address,
    )) as unknown as KeyValueStore;
    console.log("ici 3");
    const attente = attendreSync(bdSurOrbite2);
    console.log("ici 4");
    bd.set("a", 1);
    await attente;
    console.log("ici 5");
    expect(bdSurOrbite2.get("a")).to.equal(1);
  });

  it("Accès écriture KeyValue", async () => {
    const bd = (await orbites[0].open("test sync", {
      type: "keyvalue",
    })) as unknown as KeyValueStoreTypé<{ [clef: string]: number }>;
    const bdSurOrbite2 = (await orbites[1].open(
      bd.address,
    )) as unknown as KeyValueStoreTypé<{ [clef: string]: number }>;

    const accèsCréateur = await peutÉcrire(bd);
    expect(accèsCréateur).to.be.false();

    const accèsAvant = await peutÉcrire(bdSurOrbite2);
    expect(accèsAvant).to.be.false();
  });

  it("Accès écriture Feed", async () => {
    const bd = (await orbites[0].open("test sync", {
      type: "feed",
    })) as unknown as FeedStoreTypé<string>;
    const bdSurOrbite2 = (await orbites[1].open(
      bd.address,
    )) as unknown as FeedStoreTypé<string>;

    const accèsCréateur = await peutÉcrire(bd);
    expect(accèsCréateur).to.be.false();

    const accèsAvant = await peutÉcrire(bdSurOrbite2);
    expect(accèsAvant).to.be.false();
  });

  it("Accès écriture attente invité", async () => {
    const bd = (await orbites[0].open("test sync", {
      type: "keyvalue",
      accès: accès.cntrlConstellation.default,
    })) as unknown as KeyValueStoreTypé<{ [clef: string]: number }>;
    const bdSurOrbite2 = (await orbites[1].open(
      bd.address,
    )) as unknown as KeyValueStoreTypé<{ [clef: string]: number }>;

    const accèsCréateur = await peutÉcrire(bd, orbites[0]);
    expect(accèsCréateur).to.be.false();

    const accèsAutreOrbite = peutÉcrire(bdSurOrbite2, orbites[1]);
    await (
      bd.access as unknown as Awaited<
        ReturnType<ReturnType<typeof accès.cntrlConstellation.default>>
      >
    ).grant("MEMBRE", orbites[1].id);
    expect(accèsAutreOrbite).to.be.true();
  });
});
