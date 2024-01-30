import { createHelia, type Helia } from "helia";
import { bitswap } from "@helia/block-brokers";
import { createLibp2p } from "libp2p";
import { MemoryBlockstore } from "blockstore-core";
import { LevelBlockstore } from "blockstore-level";
import { multiaddr } from "@multiformats/multiaddr";
import { WebRTC } from "@multiformats/multiaddr-matcher";
import type { Multiaddr } from "@multiformats/multiaddr";

import { isBrowser, isElectronRenderer } from "wherearewe";

import {
  DefaultLibp2pBrowserOptions,
  DefaultLibp2pOptions,
} from "@orbitdb/quickstart";

export const créerHéliaTest = async ({
  dossier,
}: {
  dossier?: string;
} = {}): Promise<Helia> => {
  const options =
    isBrowser || isElectronRenderer
      ? DefaultLibp2pBrowserOptions
      : DefaultLibp2pOptions;

  const libp2p = await createLibp2p({ ...options });

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

export const connecterPairs = async (
  sfip1: Helia,
  sfip2: Helia,
  options = {
    filtre: filtreParDéfaut,
  },
) => {
  if (isBrowser || isElectronRenderer) {
    const relayId = "12D3KooWAJjbRkp8FPF5MKgMU53aUTxWkqvDrs4zc1VMbwRwfsbE";

    await sfip1.libp2p.dial(
      multiaddr(`/ip4/127.0.0.1/tcp/12345/ws/p2p/${relayId}`),
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

export const toutesConnectées = async (sfips: Helia[]) => {
  const connectés: Helia[] = [];
  for (const sfip of sfips) {
    for (const autre of connectés) {
      await connecterPairs(sfip, autre);
    }
    connectés.push(sfip);
  }
};
