import type { OrbitDB } from "@orbitdb/core";
import type { Helia } from "helia";
import type { client } from "@constl/ipa";
import { startOrbitDB, stopOrbitDB } from "@orbitdb/quickstart";
import { connectPeers } from "@/orbitDbTestUtils.js";
import { dossierTempoTests } from "@/dossiers.js";
import { isBrowser } from "wherearewe";

export const générerOrbites = async (
  n = 1,
): Promise<{ orbites: OrbitDB[]; fOublier: () => Promise<void> }> => {
  const sfips: Helia[] = [];
  const orbites: OrbitDB[] = [];

  const {
    dossier: racineDossierOrbite,
    fEffacer: fEffacerRacineDossierOrbite,
  } = await dossierTempoTests();

  fEffacerRacineDossierOrbite();

  const _générer = async (i: number): Promise<void> => {
    const racineDossier = `${racineDossierOrbite}/${i}`;
    const orbite = await startOrbitDB({
      directory: `${racineDossier}/orbite`,
    });

    for (const ip of sfips) {
      await connectPeers(orbite.ipfs, ip);
    }

    orbites.push(orbite);
  };

  await Promise.all([...Array(n).keys()].map((i) => _générer(i)));

  const fOublier = async () => {
    await Promise.all(
      orbites.map(stopOrbitDB),
    );

    fEffacerRacineDossierOrbite();
  };
  return { orbites, fOublier };
};

export const générerClients = async <T>({
  n = 1,
  type = "proc",
  générerClient,
}: {
  n: number;
  type?: "proc" | "travailleur";
  générerClient: (args: {
    opts: client.optsConstellation;
    mandataire: "proc" | "travailleur";
  }) => T;
}): Promise<{
  clients: T[];
  fOublier: () => Promise<void>;
}> => {
  const clients: T[] = [];
  const fsOublier: (() => Promise<void>)[] = [];

  // Nécessaire pour Playwright
  if (isBrowser) window.localStorage.clear();

  if (type == "proc") {
    const { orbites, fOublier: fOublierOrbites } = await générerOrbites(n);
    fsOublier.push(fOublierOrbites);

    for (const i in [...Array(n).keys()]) {
      const client = générerClient({
        opts: { orbite: orbites[i] },
        mandataire: type,
      });
      clients.push(client);
    }
  } else if (type === "travailleur") {
    for (const i in [...Array(n).keys()]) {
      const client = générerClient({
        opts: { orbite: { dossier: String(i) } },
        mandataire: "travailleur",
      });
      clients.push(client);
    }
  } else {
    throw new Error(type);
  }

  const fOublier = async () => {
    if (isBrowser) return; // Mystère et boule de gomme !!

    // @ts-expect-error À régler: type pour `fermer`
    await Promise.all(clients.map((client) => client.fermer()));
    await Promise.all(fsOublier.map((f) => f()));
  };
  return { fOublier, clients };
};
