import { expect } from "aegir/chai";

import { isElectronMain, isNode } from "wherearewe";

import { créerHéliaTest, toutesConnectées } from "@/sfip.js";
import { dossierTempo } from "@/dossiers.js";

describe("Créer Hélia", function () {
  let dossier: string;
  let fEffacer: () => void;

  const fsOublier: (() => Promise<void>)[] = [];

  before(async () => {
    ({ dossier, fEffacer } = await dossierTempo());
  });
  after(async () => {
    await Promise.all(fsOublier.map((f) => f()));
    fEffacer?.();
  });
  it("Hélia créée", async () => {
    const sfip = await créerHéliaTest();
    fsOublier.push(() => sfip.stop());

    const idSFIP = sfip.libp2p.peerId.toCID().toString();
    expect(idSFIP).to.be.a("string");
  });

  it("Hélia créée avec dossier", async () => {
    const sfip = await créerHéliaTest({ dossier });
    fsOublier.push(() => sfip.stop());

    if (isNode || isElectronMain) {
      const { existsSync } = await import("fs");
      expect(existsSync(dossier)).to.be.true();
    }
  });

  it("Connection pairs", async () => {
    const sfip1 = await créerHéliaTest();
    const sfip2 = await créerHéliaTest();
    fsOublier.push(
      () => sfip1.stop(),
      () => sfip2.stop(),
    );

    await toutesConnectées([sfip1, sfip2]);
    const connectionsSFIP1 = sfip1.libp2p.getPeers();
    expect(connectionsSFIP1.find((c) => c.equals(sfip2.libp2p.peerId)));

    const connectionsSFIP2 = sfip2.libp2p.getPeers();
    expect(connectionsSFIP2.find((c) => c.equals(sfip1.libp2p.peerId)));
  });
});
