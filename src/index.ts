import { once } from "events";

import { FeedStoreTypé, KeyValueStoreTypé, OrbitDB, type Store } from "@orbitdb/core";

import type { client, réseau } from "@constl/ipa";

import { AttendreRésultat } from "@/attente.js";
import type ContrôleurConstellation from "@constl/ipa/dist/src/accès/cntrlConstellation.js";

export * as sfip from "@/sfip.js";
export * as attente from "@/attente.js";
export * as client from "@/client.js";
export * as dossiers from "@/dossiers.js";
export { version } from "@/version.js";

const attendreInvité = (accès: ContrôleurConstellation, idInvité: string): Promise<void> =>
  new Promise<void>((resolve) => {
    const testAutorisé = async () => {
      const autorisé = await accès.estAutorisé(idInvité);
      if (autorisé) {
        clearInterval(interval);
        resolve();
      }
    };
    const interval = setInterval(testAutorisé, 100);
    testAutorisé();
  });

export const clientConnectéÀ = async (
  client1: client.ClientConstellation,
  client2: client.ClientConstellation,
): Promise<void> => {
  const dispositifsConnectés = new AttendreRésultat<
    réseau.statutDispositif[]
  >();
  const idCompte2 = await client2.obtIdCompte();

  const fOublier = await client1.réseau!.suivreConnexionsDispositifs({
    f: (dispositifs) => dispositifsConnectés.mettreÀJour(dispositifs),
  });
  await dispositifsConnectés.attendreQue((dispositifs) => {
    return !!dispositifs.find((d) => d.infoDispositif.idCompte === idCompte2);
  });
  await fOublier();
  return;
};

export const clientsConnectés = async (
  ...clients: client.ClientConstellation[]
): Promise<void> => {
  if (clients.length < 2) return;
  const promesses: Promise<void>[] = [];
  for (let i = 1; i < clients.length; i++) {
    for (let j = 0; j < i; j++) {
      promesses.push(clientConnectéÀ(clients[i], clients[j]));
      promesses.push(clientConnectéÀ(clients[j], clients[i]));
    }
  }
  await Promise.all(promesses);
  return;
};

export const attendreSync = async (bd: Store): Promise<void> => {
  const accès = bd.access as unknown as ContrôleurConstellation;
  await once(accès.bd!.events, "peer.exchanged");
};

export const peutÉcrire = async (
  bd: KeyValueStoreTypé<{ test: number }> | FeedStoreTypé<string>,
  attendre?: OrbitDB,
): Promise<boolean> => {
  if (attendre) {
    await attendreInvité(bd.access as unknown as ContrôleurConstellation, attendre.identity.id);
  }

  try {
    if (bd.type === "keyvalue") {
      const bdKV = bd as KeyValueStoreTypé<{ test: number }>
      const CLEF = "test";
      const VAL = 123;

      await bdKV.set(CLEF, VAL);
      const val = await bdKV.get(CLEF);

      await (bd as KeyValueStoreTypé<{ test: number }>).del(CLEF);
      return val === VAL;
    } else if (bd.type === "feed") {
      const VAL = "test";

      await (bd as FeedStoreTypé<string>).add(VAL);
      const éléments = await (bd as FeedStoreTypé<string>).all();

      const autorisé =
        éléments.length === 1 && éléments[0].value === VAL;
      if (éléments.length === 1) {
        await (bd as FeedStoreTypé<string>).remove(éléments[0].hash);
      }
      return autorisé;
    } else {
      throw new Error(`Type de BD ${bd.type} non supporté par ce test.`);
    }
  } catch {
    return false;
  }
};
