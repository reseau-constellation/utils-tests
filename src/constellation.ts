import { isBrowser } from "wherearewe";
import { créerOrbitesTest } from "./orbite.js";
import { dossierTempo } from "./dossiers.js";
import { OrbitDB } from "@orbitdb/core";

interface InterfaceConstellation {
  fermer: () => Promise<void>;
}

interface OptionsConstellation {
  dossier?: string;
  orbite?: OrbitDB;
}

export const créerConstellationsTest = async <
  T extends InterfaceConstellation,
>({
  n = 1,
  créerConstellation,
  dossier,
}: {
  n: number;
  créerConstellation: (opts: OptionsConstellation) => T;
  dossier?: string;
}): Promise<{
  constls: T[];
  fermer: () => Promise<void>;
}> => {
  let effacerDossier: () => void = () => {};
  if (!dossier) {
    ({ dossier, effacer: effacerDossier } = await dossierTempo());
  }

  const { orbites, fermer: fermerOrbites } = await créerOrbitesTest({
    n,
    dossier,
  });

  const constls: T[] = [];
  for (const i in [...Array(n).keys()]) {
    const constl = créerConstellation({
      orbite: orbites[i],
      dossier,
    });
    constls.push(constl);
  }

  const fermer = async () => {
    for (const constl of constls) await constl.fermer();

    await fermerOrbites();
    effacerDossier();

    // Nécessaire pour Playwright
    if (isBrowser) window.localStorage.clear();
  };
  return { constls, fermer };
};
