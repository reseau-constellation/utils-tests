import { join } from "path";
import { MemoryBlockstore } from "blockstore-core";
import { createHelia } from "helia";
import { IDBBlockstore } from "blockstore-idb";
import { isBrowser, isElectronMain, isNode } from "wherearewe";
import { type HeliaWithLibp2p } from "@helia/libp2p";
import { sousDossier } from "./utils.js";
import {
  OptionsDéfautLibp2pNavigateur,
  OptionsDéfautLibp2pNode,
  toutesConnectées,
  type ServicesLibp2pTest,
} from "./libp2p/index.js";
import { obtenirAdresseRelai } from "./relai/index.ts";

export const créerHéliasTest = async ({
  n,
  dossier,
}: {
  n: number;
  dossier?: string;
}): Promise<{
  hélias: HeliaWithLibp2p<ServicesLibp2pTest>[];
  fermer: () => Promise<void>;
}> => {
  const optionsLibp2p = isBrowser
    ? OptionsDéfautLibp2pNavigateur()
    : OptionsDéfautLibp2pNode();

  const hélias: HeliaWithLibp2p<ServicesLibp2pTest>[] = [];
  for (const i of Array(n).keys()) {
    const dossierBlocs = dossier
      ? join(sousDossier({ dossier, i }), "hélia", "blocks")
      : undefined;
    const stockageBlocs = dossierBlocs
      ? isNode || isElectronMain
        ? new (await import("blockstore-fs")).FsBlockstore(dossierBlocs)
        : new IDBBlockstore(dossierBlocs)
      : new MemoryBlockstore();
    (stockageBlocs as IDBBlockstore).open?.();
    const optionsHélia = {
      blockstore: stockageBlocs,
      libp2p: optionsLibp2p,
    };
    const hélia = await createHelia(optionsHélia).start();
    hélias.push(hélia);
    await toutesConnectées(
      hélias.map((h) => h.libp2p),
      {
        adresseRelai: obtenirAdresseRelai(),
      },
    );
  }

  const fermer = async () => {
    await Promise.all(
      hélias.map(async (h) => {
        await h.stop();
        // @ts-expect-error Je ne sais pas pourquoi
        await h.blockstore.unwrap()?.unwrap()?.child?.db?.close();
      }),
    );
  };

  return { hélias, fermer };
};
