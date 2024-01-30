import { expect } from "aegir/chai";

import { créerConstellationsTest } from "@/constellation.js";
import { ClientConstellation } from "@constl/ipa";

describe.skip("Créer Constellations", function () {
  let clients: ClientConstellation[];
  let fOublier: () => Promise<void>;

  it("Constellations créées", async () => {
    console.log("ici 1");
    ({ clients, fOublier } = await créerConstellationsTest({ n: 2 }));
    console.log("ici 2");
    const idsCompte = await Promise.all(clients.map((c) => c.obtIdCompte()));
    console.log("ici 3");
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
