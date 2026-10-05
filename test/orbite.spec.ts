import { expect } from "aegir/chai";

import { attendreSync, créerOrbitesTest } from "../src/index.ts";
import type { OrbitDB, KeyValueDatabase } from "@orbitdb/core";
import type { ServicesLibp2pTest } from "../src/index.ts";

describe("Orbite", function () {
  let orbites: OrbitDB<ServicesLibp2pTest>[];
  let fermer: () => Promise<void>;

  after(async () => {
    // Au cas où
    await fermer?.();
  });

  it("orbites créés", async () => {
    ({ orbites, fermer } = await créerOrbitesTest({ n: 2 }));

    const idsOrbites = orbites.map((o) => o.id);
    expect(idsOrbites[0]).to.be.a("string");
    expect(idsOrbites[1]).to.be.a("string");
    expect(idsOrbites[0]).to.not.equal(idsOrbites[1]);
  });

  it("syncronisation", async () => {
    const bd = (await orbites[0].open("test sync", {
      type: "keyvalue",
    })) as KeyValueDatabase;

    const bdSurOrbite2 = (await orbites[1].open(
      bd.address,
    )) as KeyValueDatabase;

    const attente = attendreSync(bdSurOrbite2);
    await bd.set("a", 1);
    await attente;
    expect(await bdSurOrbite2.get("a")).to.equal(1);
  });
});
