import type { ClientConstellation } from "@constl/ipa";
import { expect } from "aegir/chai";

import { créerConstellation } from "@constl/ipa";

import { créerConstellationsTest } from "@/constellation.js";

describe.only("Créer Constellations", function () {
  let clients: ClientConstellation[];
  let fOublier: (() => Promise<void>) | undefined;

  after(async () => {
    await fOublier?.();
  });

  it("Constellations créées", async () => {
    ({ clients, fOublier } = await créerConstellationsTest({
      n: 2,
      créerConstellation,
    }));

    const idsCompte = await Promise.all(clients.map((c) => c.obtIdCompte()));
    expect(idsCompte[0]).to.be.a("string");
    expect(idsCompte[1]).to.be.a("string");
    expect(idsCompte[0]).to.not.equal(idsCompte[1]);
  });

  it("Constellations effacées", async () => {
    await fOublier?.();
    fOublier = undefined;

    expect(clients[0].obtIdCompte()).to.be.rejected();
    expect(clients[1].obtIdCompte()).to.be.rejected();
  });
});
