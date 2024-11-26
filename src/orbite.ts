/*
Certaines parties de ce fichier proviennent d'OrbitDB et de @orbitdb/quickstart

MIT License

Copyright (c) 2019 Haja Networks Oy
Copyright (c) 2024 OrbitDB Community

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import type { HeliaLibp2p } from "helia";
import type {
  Identity,
  OrbitDB,
  Database,
  IdentitiesType,
} from "@orbitdb/core";
import type { TypedKeyValue, TypedFeed, TypedSet } from "@constl/bohr-db";
import { once } from "events";

import { dossierTempo } from "@/dossiers.js";
import { connecterPairs } from "@/sfip.js";
import { isNode, isElectronMain } from "wherearewe";

import { createHelia } from "helia";
import { createLibp2p } from "libp2p";
import { createOrbitDB } from "@orbitdb/core";
import { LevelBlockstore } from "blockstore-level";
import { bitswap } from "@helia/block-brokers";
import { DefaultLibp2pOptions, DefaultLibp2pBrowserOptions } from "./libp2p.js";

const isBrowser = () => typeof window !== "undefined";

const startOrbitDB = async ({
  id,
  identity,
  identities,
  directory,
}: {
  id?: string;
  identity?: Identity;
  identities?: IdentitiesType;
  directory?: string;
} = {}) => {
  const options = isBrowser()
    ? DefaultLibp2pBrowserOptions
    : DefaultLibp2pOptions;
  const libp2p = await createLibp2p({ ...options });
  directory = directory || ".";
  const blockstore = new LevelBlockstore(`${directory}/ipfs/blocks`);
  const ipfs = await createHelia({
    libp2p,
    blockstore,
    blockBrokers: [bitswap()],
  });
  const orbitdb = await createOrbitDB({
    ipfs,
    id,
    identity,
    identities,
    directory,
  });
  return orbitdb;
};

const stopOrbitDB = async (orbitdb: OrbitDB) => {
  await orbitdb.stop();
  await orbitdb.ipfs.stop();
  // @ts-expect-error Je ne sais pas pourquoi
  await orbitdb.ipfs.blockstore.unwrap().unwrap().child.db.close();
};

export const créerOrbiteTest = async ({
  n = 1,
}: {
  n: number;
}): Promise<{ orbites: OrbitDB[]; fOublier: () => Promise<void> }> => {
  const sfips: HeliaLibp2p[] = [];
  const orbites: OrbitDB[] = [];

  const {
    dossier: racineDossierOrbite,
    fEffacer: fEffacerRacineDossierOrbite,
  } = await dossierTempo();

  const _générer = async (i: number): Promise<void> => {
    const racineDossier = `${racineDossierOrbite}/${i}`;
    const orbite = await startOrbitDB({
      directory: `${racineDossier}/orbite`,
    });
    for (const ip of sfips) {
      await connecterPairs(orbite.ipfs, ip);
    }
    sfips.push(orbite.ipfs);

    orbites.push(orbite);
  };

  await Promise.all([...Array(n).keys()].map((i) => _générer(i)));

  const fOublier = async () => {
    for (const o of orbites) await stopOrbitDB(o);

    try {
      fEffacerRacineDossierOrbite();
    } catch (e) {
      // Sur Windows, parfois les fichiers de Hélia sont encore en utilisation
      if ((isNode || isElectronMain) && process.platform === "win32") {
        console.log("On ignore ça sur Windows\n", e);
        return;
      } else {
        throw e;
      }
    }
  };
  return { orbites, fOublier };
};

export const attendreSync = async (
  bd: Awaited<ReturnType<typeof Database>>,
): Promise<void> => {
  await once(bd.events, "update");
};

export type ContrôleurConstellation = {
  type: string;
  address: string;
  adresseBdAccès: string;
  write: string;
  estAutorisé: (id: string) => Promise<boolean>;
  grant: (rôle: "MODÉRATEUR" | "MEMBRE", id: string) => Promise<void>;
  revoke: (_rôle: "MODÉRATEUR" | "MEMBRE", _id: string) => Promise<void>;
  bd: Awaited<ReturnType<typeof Database>>;
};

const attendreInvité = (
  accès: ContrôleurConstellation,
  idInvité: string,
): Promise<void> =>
  new Promise<void>((résoudre) => {
    const testAutorisé = async () => {
      const autorisé = await accès.estAutorisé(idInvité);
      if (autorisé) {
        résoudre();
      } else {
        setTimeout(testAutorisé, 100);
      }
    };
    testAutorisé();
  });

export const peutÉcrire = async (
  bd:
    | TypedKeyValue<{ [clef: string]: number }>
    | TypedFeed<string>
    | TypedSet<string>,
  attendre?: OrbitDB,
): Promise<boolean> => {
  if (attendre) {
    await attendreInvité(
      bd.access as unknown as ContrôleurConstellation,
      attendre.identity.id,
    );
  }

  try {
    if (bd.type === "keyvalue") {
      const bdKV = bd as TypedKeyValue<{ [clef: string]: number }>;

      // Important d'avoir une clef unique pour éviter l'interférence entre les tests
      const CLEF = "test" + Math.random().toString();
      const VAL = 123;

      await bdKV.set(CLEF, VAL);
      const val = await bdKV.get(CLEF);

      await bdKV.del(CLEF);
      return val === VAL;
    } else if (bd.type === "feed") {
      const VAL = "test";

      await (bd as TypedFeed<string>).add(VAL);
      const éléments = await (bd as TypedFeed<string>).all();

      const autorisé = éléments.length === 1 && éléments[0].value === VAL;
      if (éléments.length === 1) {
        await (bd as TypedFeed<string>).remove(éléments[0].hash);
      }
      return autorisé;
    } else if (bd.type === "set") {
      const VAL = "test";

      await bd.add(VAL);
      const éléments = await bd.all();

      const autorisé = éléments.length === 1 && éléments[0].value === VAL;
      if (éléments.length === 1) {
        await bd.del(éléments[0].hash);
      }
      return autorisé;
    } else {
      // @ts-expect-error bd.type n'a plus d'options
      throw new Error(`Type de BD ${bd.type} non supporté par ce test.`);
    }
  } catch (e) {
    if (e.toString().includes("is not allowed to write to the log")) {
      return false;
    }
    throw e;
  }
};
