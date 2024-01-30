import { createHelia, type Helia } from "helia";
import { bitswap } from "@helia/block-brokers";
import { createLibp2p } from "libp2p";
import { MemoryBlockstore } from "blockstore-core";
import { LevelBlockstore } from "blockstore-level";

import { isBrowser, isElectronRenderer } from "wherearewe";
const OrbitDBQuickstart = await import("@orbitdb/quickstart");

const { Libp2pBrowserOptions, Libp2pOptions } = OrbitDBQuickstart;

export const créerHéliaTest = async ({
  dossier,
}: {
  dossier?: string;
} = {}): Promise<Helia> => {
  const options =
    isBrowser || isElectronRenderer ? Libp2pBrowserOptions : Libp2pOptions;

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
  const addresses1 = sfip1.libp2p.getMultiaddrs().filter(options.filtre);
  const addresses2 = sfip2.libp2p.getMultiaddrs().filter(options.filtre);
  if (addresses1.length && addresses2.length) {
    await sfip1.libp2p.dial(addresses2[0]);
    await sfip2.libp2p.dial(addresses1[0]);
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
