import { OrbitDB, createOrbitDB } from "@orbitdb/core";
import { dossierTempo } from "./dossiers.js";
import { ServicesLibp2pTest } from "./libp2p/index.js";
import { créerHéliasTest } from "./hélia.js";
import { join } from "path";
import { sousDossier } from "./utils.js";
import { obtenirAdresseRelai } from "./relai/utils.js";

export const créerOrbitesTest = async ({
  n,
  dossier,
  adresseRelai,
}: {
  n: number;
  dossier?: string;
  adresseRelai?: string;
}): Promise<{
  orbites: OrbitDB<ServicesLibp2pTest>[];
  fermer: () => Promise<void>;
}> => {
  adresseRelai = adresseRelai ?? obtenirAdresseRelai();

  let effacerDossier: () => void = () => {};
  if (!dossier) {
    ({ dossier, effacer: effacerDossier } = await dossierTempo());
  }

  const orbites: OrbitDB<ServicesLibp2pTest>[] = [];
  const { hélias, fermer: fermerHélias } = await créerHéliasTest({
    n,
    dossier,
    adresseRelai,
  });

  let i = 0;
  for (const hélia of hélias) {
    orbites.push(
      await createOrbitDB({
        ipfs: hélia,
        directory: join(sousDossier({ dossier, i }), "orbite"),
      }),
    );
    i++;
  }

  const fermer = async () => {
    await Promise.all(orbites.map((o) => o.stop()));
    await fermerHélias();
    effacerDossier();
  };

  return {
    orbites,
    fermer,
  };
};
