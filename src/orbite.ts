import { join } from "path";
import { type BaseDatabase, type OrbitDB, createOrbitDB } from "@orbitdb/core";
import { dossierTempo } from "./dossiers.js";
import { type ServicesLibp2pTest } from "./libp2p/index.js";
import { créerHéliasTest } from "./hélia.js";
import { sousDossier } from "./utils.js";

export const créerOrbitesTest = async ({
  n,
  dossier,
}: {
  n: number;
  dossier?: string;
}): Promise<{
  orbites: OrbitDB<ServicesLibp2pTest>[];
  fermer: () => Promise<void>;
}> => {
  let effacerDossier: () => void = () => {};
  if (!dossier) {
    ({ dossier, effacer: effacerDossier } = await dossierTempo());
  }

  const orbites: OrbitDB<ServicesLibp2pTest>[] = [];
  const { hélias, fermer: fermerHélias } = await créerHéliasTest({
    n,
    dossier,
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

export const attendreSync = async (bd: BaseDatabase): Promise<void> => {
  return new Promise<void>((résoudre) => {
    bd.events.once("update", () => résoudre());
  });
};
