import { expect } from "aegir/chai";

import { créerConstellationsTest } from "@/constellation.js";
import type { ClientConstellation } from "@constl/ipa";

describe("Créer Constellations", function () {
  let clients: ClientConstellation[];
  let fOublier: () => Promise<void>;

  after(async () => {
    await fOublier?.();
  });

  it("Constellations créées", async () => {
    ({ clients, fOublier } = await créerConstellationsTest({ n: 2 }));
    const idsCompte = await Promise.all(clients.map((c) => c.obtIdCompte()));
    expect(idsCompte[0]).to.be.a("string");
    expect(idsCompte[1]).to.be.a("string");
    expect(idsCompte[0]).to.not.equal(idsCompte[1]);
  });

  it("Constellations effacées", async () => {
    await fOublier();
    await clients[0].obtIdCompte();
    expect(clients[0].obtIdCompte).to.be.rejected;
    expect(clients[1].obtIdCompte).to.be.rejected;
  });
});
