import {
  type réseau,
  type client,
  type ClientConstellation,
} from "@constl/ipa";
import { isBrowser } from "wherearewe";

import { créerOrbiteTest } from "@/orbite.js";
import { AttendreRésultat } from "@/attente.js";

export const créerConstellationsTest = async <T = ClientConstellation>({
  n = 1,
  fGénérerClient,
}: {
  n: number;
  fGénérerClient: ({ opts }: { opts: client.optsConstellation }) => T;
}): Promise<{
  clients: ReturnType<typeof fGénérerClient>[];
  fOublier: () => Promise<void>;
}> => {
  const clients: ReturnType<typeof fGénérerClient>[] = [];
  const fsOublier: (() => Promise<void>)[] = [];

  // Nécessaire pour Playwright
  if (isBrowser) window.localStorage.clear();

  const { orbites, fOublier: fOublierOrbites } = await créerOrbiteTest({ n });
  fsOublier.push(fOublierOrbites);

  for (const i in [...Array(n).keys()]) {
    const client = fGénérerClient({
      opts: { orbite: orbites[i] },
    });
    clients.push(client);
  }

  const fOublier = async () => {
    if (isBrowser) return; // Mystère et boule de gomme !!

    await Promise.all(
      clients.map((client) => (client as ClientConstellation).fermer()),
    );
    await Promise.all(fsOublier.map((f) => f()));
  };
  return { fOublier, clients };
};

export const constellationConnectéeÀ = async (
  constellation: client.ClientConstellation,
  connectéeÀ: client.ClientConstellation,
): Promise<void> => {
  const dispositifsConnectés = new AttendreRésultat<
    réseau.statutDispositif[]
  >();
  const idCompte2 = await connectéeÀ.obtIdCompte();

  const fOublier = await constellation.réseau!.suivreConnexionsDispositifs({
    f: (dispositifs) => dispositifsConnectés.mettreÀJour(dispositifs),
  });
  await dispositifsConnectés.attendreQue((dispositifs) => {
    return !!dispositifs.find((d) => d.infoDispositif.idCompte === idCompte2);
  });
  await fOublier();
  return;
};

export const constellationsConnectées = async (
  ...clients: client.ClientConstellation[]
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
  return;
};
