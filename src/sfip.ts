import { createHelia, type Helia } from "helia";
import { bitswap } from "@helia/block-brokers";
import { createLibp2p } from "libp2p";
import { MemoryBlockstore } from "blockstore-core";
import { LevelBlockstore } from "blockstore-level";

import { isBrowser, isElectronRenderer } from "wherearewe";
import { Libp2pBrowserOptions, Libp2pOptions } from "@orbitdb/quickstart";

export const créerHéliaTest = async ({
  directory,
}: {
  directory?: string;
} = {}): Promise<Helia> => {
  const options = (isBrowser || isElectronRenderer) ? Libp2pBrowserOptions : Libp2pOptions;

  const libp2p = await createLibp2p({ ...options });

  const blockstore = directory
    ? new LevelBlockstore(`${directory}/blocks`)
    : new MemoryBlockstore();

  const heliaOptions = {
    blockstore,
    libp2p,
    blockBrokers: [bitswap()],
  };

  return createHelia({ ...heliaOptions });
};
