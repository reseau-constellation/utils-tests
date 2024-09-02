import type { GossipSub } from "@chainsafe/libp2p-gossipsub";
import type { Multiaddr } from "@multiformats/multiaddr";
import type { sfip } from "@constl/ipa";

import { DefaultLibp2pServices, createHelia, type HeliaLibp2p } from "helia";
import { bitswap } from "@helia/block-brokers";
import { createLibp2p, Libp2p } from "libp2p";
import { MemoryBlockstore } from "blockstore-core";
import { LevelBlockstore } from "blockstore-level";
import { multiaddr } from "@multiformats/multiaddr";
import { WebRTC } from "@multiformats/multiaddr-matcher";
import {} from "@libp2p/interface";

import { isBrowser, isElectronRenderer } from "wherearewe";

import {
  DefaultLibp2pBrowserOptions,
  DefaultLibp2pOptions,
} from "@orbitdb/quickstart";

export const créerHéliaTest = async ({
  dossier,
}: {
  dossier?: string;
} = {}): Promise<HeliaLibp2p<Libp2p<sfip.ServicesLibp2p>>> => {
  const options =
    isBrowser || isElectronRenderer
      ? DefaultLibp2pBrowserOptions
      : DefaultLibp2pOptions;

  const libp2p = (await createLibp2p({
    ...options,
  })) as unknown as Libp2p<sfip.ServicesLibp2p>;

  const blockstore = dossier
    ? new LevelBlockstore(`${dossier}/blocks`)
    : new MemoryBlockstore();

  const heliaOptions = {
    blockstore,
    libp2p,
    blockBrokers: [bitswap()],
  };

  return createHelia({ ...heliaOptions });
};

const filtreParDéfaut = () => true;

export const connecterPairs = async <
  T extends Libp2p = Libp2p<DefaultLibp2pServices>,
>(
  sfip1: HeliaLibp2p<T>,
  sfip2: HeliaLibp2p<T>,
  options = {
    filtre: filtreParDéfaut,
  },
) => {
  if (isBrowser || isElectronRenderer) {
    const idRelai = "12D3KooWAJjbRkp8FPF5MKgMU53aUTxWkqvDrs4zc1VMbwRwfsbE";

    await sfip1.libp2p.dial(
      multiaddr(`/ip4/127.0.0.1/tcp/12345/ws/p2p/${idRelai}`),
    );

    const adresse1 = await new Promise<Multiaddr>((resolve) => {
      const testConnecté = () => {
        const adresse = sfip1.libp2p
          .getMultiaddrs()
          .filter((ma) => WebRTC.matches(ma))
          .pop();
        if (adresse != null) {
          clearInterval(interval);
          resolve(adresse);
        }
      };
      const interval = setInterval(testConnecté, 100);
      testConnecté();
    });
    await sfip2.libp2p.dial(adresse1);
  } else {
    await sfip2.libp2p.peerStore.save(sfip1.libp2p.peerId, {
      multiaddrs: sfip1.libp2p.getMultiaddrs().filter(options.filtre),
    });
    await sfip2.libp2p.dial(sfip1.libp2p.peerId);
  }
};

export const toutesConnectées = async (
  sfips: HeliaLibp2p<Libp2p<{ pubsub: GossipSub }>>[],
) => {
  const connectés: HeliaLibp2p<Libp2p<{ pubsub: GossipSub }>>[] = [];
  for (const sfip of sfips) {
    for (const autre of connectés) {
      await connecterPairs(sfip, autre);
    }
    connectés.push(sfip);
  }
};

export const constObtFichierRelai = async (): Promise<string> => {
  const path = await import("path");
  const url = await import("url");
  const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

  const fichierRelai = path.join(__dirname, "./scripts/relai.js");
  return fichierRelai;
};

export const lancerRelai = async () => {
  const { $ } = await import("execa");

  const fichierRelai = await constObtFichierRelai();

  const relai = $`node ${fichierRelai} &`;

  relai.catch((e) => {
    // Ignorer l'erreur causée par la termination du processus par notre code
    if (e.signal !== "SIGTERM") throw new Error(e);
  });

  return () => relai.kill();
};

export const adresseRelai =
  "/ip4/127.0.0.1/tcp/12345/ws/p2p/12D3KooWAJjbRkp8FPF5MKgMU53aUTxWkqvDrs4zc1VMbwRwfsbE";
