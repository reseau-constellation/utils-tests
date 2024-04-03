import { expect } from "aegir/chai";

import {
  FeedStoreTypé,
  KeyValueStore,
  KeyValueStoreTypé,
  OrbitDB,
} from "@orbitdb/core";
import { registerFeed } from "@orbitdb/feed-db";
import {
  ContrôleurConstellation,
  attendreSync,
  créerOrbiteTest,
  peutÉcrire,
} from "@/orbite.js";
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
    await expect(orbites[0].open("adresse test")).to.be.rejected();
    await expect(orbites[1].open("adresse test")).to.be.rejected();
  });
});

describe("Fonctions utilitaires", function () {
  let orbites: OrbitDB[];
  let fOublier: () => Promise<void>;

  before(async () => {
    registerFeed();
    accès.enregistrerContrôleurs();
    ({ orbites, fOublier } = await créerOrbiteTest({ n: 2 }));
  });

  after(async () => {
    await fOublier?.();
  });

  it("Attendre syncronisation", async () => {
    const bd = (await orbites[0].open("test sync", {
      type: "keyvalue",
    })) as unknown as KeyValueStore;
    const bdSurOrbite2 = (await orbites[1].open(
      bd.address,
    )) as unknown as KeyValueStore;
    const attente = attendreSync(bdSurOrbite2);
    await bd.set("a", 1);
    await attente;
    expect(await bdSurOrbite2.get("a")).to.equal(1);
  });

  it("Accès écriture KeyValue", async () => {
    const bd = (await orbites[0].open("test sync", {
      type: "keyvalue",
    })) as unknown as KeyValueStoreTypé<{ [clef: string]: number }>;
    const bdSurOrbite2 = (await orbites[1].open(
      bd.address,
    )) as unknown as KeyValueStoreTypé<{ [clef: string]: number }>;

    const accèsCréateur = await peutÉcrire(bd);
    expect(accèsCréateur).to.be.true();

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
    expect(accèsCréateur).to.be.true();

    const accèsAvant = await peutÉcrire(bdSurOrbite2);
    expect(accèsAvant).to.be.false();
  });

  it("Accès écriture attente invité", async () => {
    const bd = (await orbites[0].open("test sync", {
      type: "keyvalue",
      AccessController: accès.cntrlConstellation.ContrôleurConstellation({
        write: orbites[0].identity.id,
      }),
    })) as unknown as KeyValueStoreTypé<{ [clef: string]: number }>;

    const bdSurOrbite2 = (await orbites[1].open(
      bd.address,
    )) as unknown as KeyValueStoreTypé<{ [clef: string]: number }>;

    const accèsCréateur = await peutÉcrire(bd, orbites[0]);
    expect(accèsCréateur).to.be.true();

    const accèsAutreOrbite = peutÉcrire(bdSurOrbite2, orbites[1]);
    await (bd.access as unknown as ContrôleurConstellation).grant(
      "MEMBRE",
      orbites[1].identity.id,
    );
    expect(await accèsAutreOrbite).to.be.true();
  });
});
