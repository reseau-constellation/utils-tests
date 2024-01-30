/*
Certaines parties de ce fichier proviennent d'OrbitDB

MIT License

Copyright (c) 2019 Haja Networks Oy

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

import type { Helia } from "helia";
import type {
  FeedStoreTypé,
  KeyValueStoreTypé,
  OrbitDB,
  Store,
} from "@orbitdb/core";

import { accès } from "@constl/ipa";

import { once } from "events";

import { dossierTempo } from "@/dossiers.js";
import { connecterPairs } from "@/sfip.js";

const OrbitDBQuickstart = await import("@orbitdb/quickstart");
const { startOrbitDB, stopOrbitDB } = OrbitDBQuickstart;

export const créerOrbiteTest = async ({
  n = 1,
}: {
  n: number;
}): Promise<{ orbites: OrbitDB[]; fOublier: () => Promise<void> }> => {
  const sfips: Helia[] = [];
  const orbites: OrbitDB[] = [];

  const {
    dossier: racineDossierOrbite,
    fEffacer: fEffacerRacineDossierOrbite,
  } = await dossierTempo();

  fEffacerRacineDossierOrbite();

  const _générer = async (i: number): Promise<void> => {
    const racineDossier = `${racineDossierOrbite}/${i}`;
    const orbite = await startOrbitDB({
      directory: `${racineDossier}/orbite`,
    });

    for (const ip of sfips) {
      await connecterPairs(orbite.ipfs, ip);
    }

    orbites.push(orbite);
  };

  await Promise.all([...Array(n).keys()].map((i) => _générer(i)));

  const fOublier = async () => {
    await Promise.all(orbites.map(stopOrbitDB));

    fEffacerRacineDossierOrbite();
  };
  return { orbites, fOublier };
};

export const attendreSync = async (bd: Store): Promise<void> => {
  const accès = bd.access as unknown as ContrôleurConstellation;
  await once(accès.bd.events, "peer.exchanged");
};

type ContrôleurConstellation = Awaited<
  ReturnType<ReturnType<typeof accès.cntrlConstellation.default>>
>;

const attendreInvité = (
  accès: ContrôleurConstellation,
  idInvité: string,
): Promise<void> =>
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

export const peutÉcrire = async (
  bd: KeyValueStoreTypé<{ [clef: string]: number }> | FeedStoreTypé<string>,
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
      const bdKV = bd as KeyValueStoreTypé<{ [clef: string]: number }>;

      // Important d'avoir une clef unique pour éviter l'interférence entre les tests
      const CLEF = "test" + Math.random().toString();
      const VAL = 123;

      await bdKV.set(CLEF, VAL);
      const val = await bdKV.get(CLEF);

      await bdKV.del(CLEF);
      return val === VAL;
    } else if (bd.type === "feed") {
      const VAL = "test";

      await (bd as FeedStoreTypé<string>).add(VAL);
      const éléments = await (bd as FeedStoreTypé<string>).all();

      const autorisé = éléments.length === 1 && éléments[0].value === VAL;
      if (éléments.length === 1) {
        await (bd as FeedStoreTypé<string>).remove(éléments[0].hash);
      }
      return autorisé;
    } else if (bd.type === "set") {
      const VAL = "test";

      await (bd as FeedStoreTypé<string>).add(VAL);
      const éléments = await (bd as FeedStoreTypé<string>).all();

      const autorisé = éléments.length === 1 && éléments[0].value === VAL;
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
