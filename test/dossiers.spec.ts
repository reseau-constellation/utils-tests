import { expect } from "aegir/chai";
import { isNode, isElectronMain } from "wherearewe";
import { dossierTempo } from "@/dossiers.js";

describe.skip("Dossier temporaire", function () {
  let dossier: string;
  let fEffacer: () => void;

  it("Dossier créé", async () => {
    if (isNode || isElectronMain) {
      ({ dossier, fEffacer } = await dossierTempo());
      const { existsSync } = await import("fs");
      expect(existsSync(dossier)).to.be.true();
    }
  });

  it("Dossier effacé", async () => {
    if (isNode || isElectronMain) {
      fEffacer();
      const { existsSync } = await import("fs");
      expect(existsSync(dossier)).to.be.false();
    }
  });
});
