import type { réseau, client, Constellation } from "@constl/ipa";
import type { OrbitDB } from "@orbitdb/core";
import { isBrowser } from "wherearewe";

import { créerOrbiteTest } from "@/orbite.js";
import { AttendreRésultat } from "@/attente.js";
import { Libp2p } from "@libp2p/interface";
import type { ServicesLibp2pConstlTest } from "./libp2p";

export const créerConstellationsTest = async <
  T = Constellation,
  U = client.optsConstellation,
>({
  n = 1,
  créerConstellation,
}: {
  n: number;
  créerConstellation: (opts: U) => T;
}): Promise<{
  clients: ReturnType<typeof créerConstellation>[];
  orbites: OrbitDB<Libp2p<ServicesLibp2pConstlTest>>[];
  fOublier: () => Promise<void>;
}> => {
  const clients: ReturnType<typeof créerConstellation>[] = [];
  const fsOublier: (() => Promise<void>)[] = [];

  // Nécessaire pour Playwright
  if (isBrowser) window.localStorage.clear();

  const { orbites, fOublier: fOublierOrbites } = await créerOrbiteTest({ n });
  fsOublier.push(fOublierOrbites);

  for (const i in [...Array(n).keys()]) {
    const client = créerConstellation({
      orbite: orbites[i],
      dossier: orbites[i].directory.split("/").slice(0, -1).join("/"),
    } as U);
    clients.push(client);
  }

  const fOublier = async () => {
    for (const client of clients) await (client as Constellation).fermer();
    await Promise.all(fsOublier.map((f) => f()));
  };
  return { fOublier, clients, orbites };
};

export const constellationConnectéeÀ = async (
  constellation: client.Constellation,
  connectéeÀ: client.Constellation,
): Promise<void> => {
  const dispositifsConnectés = new AttendreRésultat<
    réseau.statutDispositif[]
  >();
  const idCompte2 = await connectéeÀ.obtIdCompte();

  const fOublier = await constellation.réseau.suivreConnexionsDispositifs({
    f: (dispositifs) => dispositifsConnectés.mettreÀJour(dispositifs),
  });
  await dispositifsConnectés.attendreQue((dispositifs) => {
    return !!dispositifs.find((d) => d.infoDispositif.idCompte === idCompte2);
  });
  await fOublier();
  return;
};

export const constellationsConnectées = async (
  ...clients: client.Constellation[]
): Promise<void> => {
  if (clients.length < 2) return;
  const promesses: Promise<void>[] = [];
  for (let i = 1; i < clients.length; i++) {
    for (let j = 0; j < i; j++) {
      promesses.push(constellationConnectéeÀ(clients[i], clients[j]));
      promesses.push(constellationConnectéeÀ(clients[j], clients[i]));
    }
  }
  await Promise.all(promesses);
};
