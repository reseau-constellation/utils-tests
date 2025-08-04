import { expect } from "aegir/chai";
import { isNode, isElectronMain } from "wherearewe";
import { dossierTempo } from "@/index.js";

describe("Dossier temporaire", function () {
  let dossier: string;
  let effacer: () => void;

  it("Dossier créé", async () => {
    if (isNode || isElectronMain) {
      ({ dossier, effacer } = await dossierTempo());
      const { existsSync } = await import("fs");
      expect(existsSync(dossier)).to.be.true();
    }
  });

  it("Dossier effacé", async () => {
    if (isNode || isElectronMain) {
      effacer();
      const { existsSync } = await import("fs");
      expect(existsSync(dossier)).to.be.false();
    }
  });
});
