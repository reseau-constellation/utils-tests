import { join } from "path";
import { MemoryBlockstore } from "blockstore-core";
import { createHeliaLight } from "helia";
import * as dagCbor from "@ipld/dag-cbor";
import * as dagJson from "@ipld/dag-json";
import * as json from "multiformats/codecs/json";
import { sha512 } from "multiformats/hashes/sha2";
import { IDBBlockstore } from "blockstore-idb";
import { isElectronMain, isNode } from "wherearewe";
import { withLibp2pLight, type HeliaWithLibp2p } from "@helia/libp2p";
import { withBitswap } from "@helia/bitswap";
import { sousDossier } from "./utils.js";
import {
  optionsDéfautLibp2p,
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
  const hélias: HeliaWithLibp2p<ServicesLibp2pTest>[] = [];

  for (const i of Array(n).keys()) {
    // Ceci ça doit aller dans la boucle parce que `withLibp2pLight` modifie l'objet d'options
    const optionsLibp2p = optionsDéfautLibp2p();

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
      codecs: [dagCbor, dagJson, json],
      hashers: [sha512],
    };
    const hélia = await withBitswap(
      withLibp2pLight(createHeliaLight(optionsHélia), optionsLibp2p),
    ).start();
    hélias.push(hélia);
  }

  await toutesConnectées(
    hélias.map((h) => h.libp2p),
    {
      adresseRelai: obtenirAdresseRelai(),
    },
  );

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
