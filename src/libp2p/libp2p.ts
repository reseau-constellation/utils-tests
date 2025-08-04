import { Libp2p } from "@libp2p/interface";
import { createLibp2p } from "libp2p";
import {
  OptionsDéfautLibp2pNavigateur,
  OptionsDéfautLibp2pNode,
  ServicesLibp2pTest,
} from "./config.js";
import { isBrowser } from "wherearewe";
import { connecterPairs } from "./utils.js";
import { obtenirAdresseRelai } from "../relai/index.js";

export const créerLibp2psTest = async ({
  n,
  adresseRelai,
}: {
  n: number;
  adresseRelai?: string;
}): Promise<{
  libp2ps: Libp2p<ServicesLibp2pTest>[];
  fermer: () => Promise<void>;
}> => {
  adresseRelai = adresseRelai ?? obtenirAdresseRelai();

  const libp2ps: Libp2p<ServicesLibp2pTest>[] = [];
  for (const _ of Array(n).keys()) {
    const libp2p = await createLibp2p(
      isBrowser ? OptionsDéfautLibp2pNavigateur() : OptionsDéfautLibp2pNode(),
    );

    for (const l of libp2ps) {
      await connecterPairs(libp2p, l, { adresseRelai });
    }
    libp2ps.push(libp2p);
  }

  const fermer = async () => {
    await Promise.all(libp2ps.map((l) => l.stop()));
  };

  return { libp2ps, fermer };
};
