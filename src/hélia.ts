import { join } from "path";
import { MemoryBlockstore } from "blockstore-core";
import { createHeliaLight, type HeliaInit } from "helia";
import * as dagCbor from "@ipld/dag-cbor";
import * as dagJson from "@ipld/dag-json";
import * as json from "multiformats/codecs/json";
import { sha512 } from "multiformats/hashes/sha2";
import { IDBBlockstore } from "blockstore-idb";
import { isElectronMain, isNode } from "wherearewe";
import { withLibp2pLight, type HeliaWithLibp2p } from "@helia/libp2p";
import { withBitswap } from "@helia/bitswap";
import { IDBDatastore } from "datastore-idb";
import { MemoryDatastore } from "datastore-core";
import { sousDossier } from "./utils.js";

import {
  optionsDéfautLibp2p,
  toutesConnectées,
  type ServicesLibp2pTest,
} from "./libp2p/index.js";
import { obtenirAdresseRelai } from "./relai/index.ts";
import type { Blockstore } from "interface-blockstore";
import type { Datastore } from "interface-datastore";

export const obtStockageDonnées = async (
  dossier?: string,
): Promise<Datastore> => {
  if (!dossier) return new MemoryDatastore();
  if (isNode || isElectronMain) {
    // Cette librairie ne peut pas être compilée pour l'environnement
    // navigateur. Nous devons donc le'importer dynamiquement ici afin d'éviter
    // des problèmes de compilation sur navigateur.
    const { FsDatastore } = await import("datastore-fs");
    const stockage = new FsDatastore(dossier);
    await stockage.open();
    return stockage;
  } else {
    const stockage = new IDBDatastore(dossier);
    await stockage.open();
    return stockage;
  }
};

export const obtStockageBlocs = async (
  dossier?: string,
): Promise<Blockstore> => {
  if (!dossier) return new MemoryBlockstore();
  if (isNode || isElectronMain) {
    // Cette librairie ne peut pas être compilée pour l'environnement
    // navigateur. Nous devons donc le'importer dynamiquement ici afin d'éviter
    // des problèmes de compilation sur navigateur.
    const { FsBlockstore } = await import("blockstore-fs");
    const stockage = new FsBlockstore(dossier);
    await stockage.open();
    return stockage;
  } else {
    const stockage = new IDBBlockstore(dossier);
    await stockage.open();
    return stockage;
  }
};

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
    const dossierHélia = dossier
      ? join(sousDossier({ dossier, i }), "hélia")
      : undefined;

    const dossierBlocs = dossierHélia ? join(dossierHélia, "blocs") : undefined;
    const stockageBlocs = await obtStockageBlocs(dossierBlocs);

    const dossierDonnées = dossierHélia
      ? join(dossierHélia, "données")
      : undefined;
    const stockageDonnées = await obtStockageDonnées(dossierDonnées);

    const optionsHélia: HeliaInit = {
      blockstore: stockageBlocs,
      datastore: stockageDonnées,
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
