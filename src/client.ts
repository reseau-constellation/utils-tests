import OrbitDB from "orbit-db";
import { initierSFIP, arrêterSFIP } from "@/sfip.js";
import type { IPFS } from "ipfs-core";
import { isBrowser } from "wherearewe";

import { connectPeers } from "@/orbitDbTestUtils.js";
import { dossierTempoTests } from "@/dossiers.js";


export const générerOrbites = async (
  n = 1
): Promise<{ orbites: OrbitDB[]; fOublier: () => Promise<void> }> => {
  const sfips: IPFS[] = [];
  const orbites: OrbitDB[] = [];

  const {
    dossier: racineDossierOrbite,
    fEffacer: fEffacerRacineDossierOrbite,
  } = await dossierTempoTests();

  fEffacerRacineDossierOrbite();

  const _générer = async (i: number): Promise<void> => {
    const racineDossier = `${racineDossierOrbite}/${i}`;
    const sfip = await initierSFIP(`${racineDossier}/sfip`);
    const orbite = await OrbitDB.createInstance(sfip, {
      directory: `${racineDossier}/orbite`,
    });

    for (const ip of sfips) {
      await connectPeers(sfip, ip);
    }

    sfips.push(sfip);
    orbites.push(orbite);
  };

  await Promise.all([...Array(n).keys()].map((i) => _générer(i)));

  const fOublier = async () => {
    await Promise.all(
      orbites.map(async (orbite) => {
        await orbite.stop();
      })
    );

    await Promise.all(
      sfips.map(async (d) => {
        await arrêterSFIP(d);
      })
    );

    fEffacerRacineDossierOrbite();
  };
  return { orbites, fOublier };
};


export const générerClients = async<T> ({
  n = 1,
  type = "proc",
  générerClient
}: {
  n: number,
  type?: "proc" | "travailleur",
  générerClient: (args: unknown) => T,
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
        mandataire: type
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
