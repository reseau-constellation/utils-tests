import { expect } from "aegir/chai";

import { isElectronMain, isNode } from "wherearewe";

import { créerHéliaTest, toutesConnectées } from "@/sfip.js";
import { dossierTempo } from "@/dossiers.js";

describe.only("Créer Hélia", function () {
  let dossier: string;
  let fEffacer: () => void;

  before(async () => {
    ({ dossier, fEffacer } = await dossierTempo());
  });
  after(async () => {
    fEffacer?.();
  });
  it("Hélia créée", async () => {
    const sfip = await créerHéliaTest();

    const idSFIP = sfip.libp2p.peerId.toCID().toString();
    expect(idSFIP).to.be.a("string");
  });

  it("Hélia créée avec dossier", async () => {
    await créerHéliaTest({ dossier });
    if (isNode || isElectronMain) {
      const { existsSync } = await import("fs");
      expect(existsSync(dossier)).to.be.true();
    }
  });

  it("Connection pairs", async () => {
    const sfip1 = await créerHéliaTest();
    const sfip2 = await créerHéliaTest();

    await toutesConnectées([sfip1, sfip2]);
    const connectionsSFIP1 = sfip1.libp2p.getPeers();
    expect(connectionsSFIP1.find((c) => c.equals(sfip2.libp2p.peerId)));

    const connectionsSFIP2 = sfip2.libp2p.getPeers();
    expect(connectionsSFIP2.find((c) => c.equals(sfip1.libp2p.peerId)));
  });
});
