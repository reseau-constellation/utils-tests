import { expect } from "aegir/chai";

import { OrbitDB, type KeyValueDatabase } from "@orbitdb/core";
import { registerFeed, type FeedDatabaseType } from "@orbitdb/feed-db";
import { type TypedKeyValue, typedKeyValue, typedFeed } from "@constl/bohr-db";
import {
  ContrôleurConstellation,
  attendreSync,
  créerOrbiteTest,
  peutÉcrire,
} from "@/orbite.js";
import { accès } from "@constl/ipa";
import type { JSONSchemaType } from "ajv";
import { Libp2p } from "@libp2p/interface";
import { ServicesLibp2pConstlTest } from "@/libp2p";

const schémaDictNumérique: JSONSchemaType<Partial<{ [clef: string]: number }>> =
  {
    type: "object",
    additionalProperties: {
      type: "number",
    },
    required: [],
  };

const schémaListeTexte: JSONSchemaType<string> = { type: "string" };

describe("Créer Orbites", function () {
  let orbites: OrbitDB<Libp2p<ServicesLibp2pConstlTest>>[];
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
  let orbites: OrbitDB<Libp2p<ServicesLibp2pConstlTest>>[];
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
    })) as KeyValueDatabase;
    const bdTypée = typedKeyValue({
      db: bd,
      schema: schémaDictNumérique,
    });

    const bdSurOrbite2 = (await orbites[1].open(
      bd.address,
    )) as KeyValueDatabase;
    const bdSurOrbite2Typée = typedKeyValue<{ [clef: string]: number }>({
      db: bdSurOrbite2,
      schema: schémaDictNumérique,
    });

    const attente = attendreSync(bdSurOrbite2Typée);
    await bdTypée.set("a", 1);
    await attente;
    expect(await bdSurOrbite2.get("a")).to.equal(1);
  });

  it("Accès écriture KeyValue", async () => {
    const bd = (await orbites[0].open("test sync", {
      type: "keyvalue",
    })) as KeyValueDatabase;
    const bdTypée = typedKeyValue({
      db: bd,
      schema: schémaDictNumérique,
    });

    const bdSurOrbite2 = (await orbites[1].open(
      bd.address,
    )) as KeyValueDatabase;
    const bdSurOrbite2Typée = typedKeyValue<{ [clef: string]: number }>({
      db: bdSurOrbite2,
      schema: schémaDictNumérique,
    });

    const accèsCréateur = await peutÉcrire(bdTypée);
    expect(accèsCréateur).to.be.true();

    const accèsAvant = await peutÉcrire(bdSurOrbite2Typée);
    expect(accèsAvant).to.be.false();
  });

  it("Accès écriture Feed", async () => {
    const bd = (await orbites[0].open("test sync", {
      type: "feed",
    })) as FeedDatabaseType;
    const bdSurOrbite2 = (await orbites[1].open(
      bd.address,
    )) as FeedDatabaseType;

    const bdTypée = typedFeed({ db: bd, schema: schémaListeTexte });
    const bdTypéeSurOrbite2 = typedFeed<string>({
      db: bdSurOrbite2,
      schema: schémaListeTexte,
    });

    const accèsCréateur = await peutÉcrire(bdTypée);
    expect(accèsCréateur).to.be.true();

    const accèsAvant = await peutÉcrire(bdTypéeSurOrbite2);
    expect(accèsAvant).to.be.false();
  });

  it("Accès écriture attente invité", async () => {
    const bd = (await orbites[0].open("test sync", {
      type: "keyvalue",
      AccessController: accès.cntrlConstellation.ContrôleurConstellation({
        write: orbites[0].identity.id,
      }),
    })) as KeyValueDatabase;
    const bdTypée = typedKeyValue<{ [clef: string]: number }>({
      db: bd,
      schema: schémaDictNumérique,
    });
    const bdSurOrbite2 = (await orbites[1].open(
      bd.address,
    )) as KeyValueDatabase;
    const bdSurOrbite2Typée = typedKeyValue<{ [clef: string]: number }>({
      db: bdSurOrbite2,
      schema: schémaDictNumérique,
    });

    const accèsCréateur = await peutÉcrire(bdTypée, orbites[0]);
    expect(accèsCréateur).to.be.true();

    const accèsAutreOrbite = peutÉcrire(bdSurOrbite2Typée, orbites[1]);
    await (bd.access as unknown as ContrôleurConstellation).grant(
      "MEMBRE",
      orbites[1].identity.id,
    );
    expect(await accèsAutreOrbite).to.be.true();
  });
});
