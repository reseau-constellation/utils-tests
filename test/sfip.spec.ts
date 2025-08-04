import { expect } from "aegir/chai";

import { isElectronMain, isNode } from "wherearewe";

import { créerHéliasTest, dossierTempo } from "@/index.js";
import { Helia } from "helia";

describe("Créer Hélia", function () {
  let dossier: string;
  let effacer: () => void;

  let hélias: Helia[];
  let fermer: () => Promise<void>;

  beforeEach(async () => {
    ({ dossier, effacer } = await dossierTempo());
  });

  afterEach(async () => {
    await fermer();
    effacer();
  });

  it("Hélia créée", async () => {
    ({ hélias, fermer } = await créerHéliasTest({ n: 1 }));

    const idSFIP = hélias[0].libp2p.peerId.toCID().toString();
    expect(idSFIP).to.be.a("string");
  });

  it("Hélia créée avec dossier", async () => {
    ({ hélias, fermer } = await créerHéliasTest({ n: 1, dossier }));

    if (isNode || isElectronMain) {
      const { existsSync } = await import("fs");
      expect(existsSync(dossier)).to.be.true();
    }
  });

  it("Connection pairs", async () => {
    ({ hélias, fermer } = await créerHéliasTest({ n: 2 }));

    const connectionsHélia1 = hélias[0].libp2p.getPeers();
    expect(connectionsHélia1.find((c) => c.equals(hélias[1].libp2p.peerId)));

    const connectionsHélia2 = hélias[1].libp2p.getPeers();
    expect(connectionsHélia2.find((c) => c.equals(hélias[0].libp2p.peerId)));
  });
});
