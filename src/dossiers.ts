import { isNode, isElectronMain } from "wherearewe";
import { v4 as uuidv4 } from "uuid";

export const dossierTempo = async (): Promise<{
  dossier: string;
  fEffacer: () => void;
}> => {
  if (isNode || isElectronMain) {
    const fs = await import("fs");
    const path = await import("path");
    const os = await import("os");
    const sync = (await import("rimraf")).sync;

    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "constl-ipa"));
    const fEffacer = () => sync(dossier);
    return { dossier, fEffacer };
  } else {
    const dossier = uuidv4() + "/constl-ipa";
    return {
      dossier,
      fEffacer: () => {
        // Rien à faire, je crois
      },
    };
  }
};
