import { isNode, isElectronMain } from "wherearewe";
import { v4 as uuidv4 } from "uuid";

export const dossierTempo = async (): Promise<{
  dossier: string;
  effacer: () => void;
}> => {
  if (isNode || isElectronMain) {
    const fs = await import("fs");
    const path = await import("path");
    const os = await import("os");
    const sync = (await import("rimraf")).sync;

    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "constl"));
    const effacer = () => {
      try {
        sync(dossier);
      } catch (e) {
        // Sur Windows, parfois les fichiers de Hélia sont encore en utilisation
        if (process.platform === "win32") {
          console.log("On ignore ça sur Windows\n", e);
          return;
        } else {
          throw e;
        }
      }
    };
    return { dossier, effacer };
  } else {
    const dossier = uuidv4();
    return {
      dossier,
      effacer: () => {
        // Rien à faire, je crois
      },
    };
  }
};
