import { Helia, createHelia } from "helia";
import { ServicesLibp2pTest, créerLibp2psTest } from "./libp2p/index.js";
import { Libp2p } from "@libp2p/interface";
import { bitswap } from "@helia/block-brokers";
import { MemoryBlockstore } from "blockstore-core";
import { join } from "path";
import { sousDossier } from "./utils.js";
import { LevelBlockstore } from "blockstore-level";
import { obtenirAdresseRelai } from "./relai/index.js";

export const créerHéliasTest = async ({
  n,
  dossier,
  adresseRelai,
}: {
  n: number;
  dossier?: string;
  adresseRelai?: string;
}): Promise<{
  hélias: Helia<Libp2p<ServicesLibp2pTest>>[];
  fermer: () => Promise<void>;
}> => {
  adresseRelai = adresseRelai ?? obtenirAdresseRelai();

  const { libp2ps, fermer: fermerLibsp2p } = await créerLibp2psTest({
    n,
    adresseRelai,
  });

  let i = 0;
  const hélias = await Promise.all(
    libp2ps.map(async (libp2p) => {
      const blockstore = dossier
        ? new LevelBlockstore(
            join(sousDossier({ dossier, i }), "hélia", "blocks"),
          )
        : new MemoryBlockstore();
      i++;

      const optionsHélia = {
        blockstore,
        libp2p,
        blockBrokers: [bitswap()],
      };
      return await createHelia(optionsHélia);
    }),
  );

  const fermer = async () => {
    await Promise.all(
      hélias.map(async (h) => {
        await h.stop();
        // @ts-expect-error Je ne sais pas pourquoi
        await h.blockstore.unwrap()?.unwrap()?.child?.db?.close();
      }),
    );
    await fermerLibsp2p();
  };

  return { hélias, fermer };
};
