import { WebRTC } from "@multiformats/multiaddr-matcher";
import { multiaddr, type Multiaddr } from "@multiformats/multiaddr";
import { isBrowser, isElectronRenderer } from "wherearewe";
import { que } from "../attente.ts";
import type { Libp2p } from "@libp2p/interface";
import type { ServicesLibp2pTest } from "./config.js";
import { peerIdFromString } from "@libp2p/peer-id";

const filtreParDéfaut = (ma: Multiaddr) => ma.toString().startsWith("/ip4/127.0.0.1/");

type OptionsConnectionPairs = {
  adresseRelai: string;
  filtre?: (ma: Multiaddr) => boolean;
};
export const connecterPairs = async <
  T extends Libp2p = Libp2p<ServicesLibp2pTest>,
>(
  libp2p1: T,
  libp2p2: T,
  options: OptionsConnectionPairs,
): Promise<void> => {
  const filtre = options.filtre ?? filtreParDéfaut;
  if (libp2p1.getPeers().some((idPair) => idPair.equals(libp2p2.peerId)))
    return;
  const adresseRelai = multiaddr(options.adresseRelai);
  const idPairRelai = adresseRelai
    .getComponents()
    .find((c) => c.name === "p2p")?.value;
  if (!idPairRelai) throw new Error(`Adresse relai invalide : ${options.adresseRelai}`)

    const connecterAuRelai = async (pair: Libp2p) => {
      const connectéAuRelai = pair
          .getPeers()
          .some((idPair) => idPair.equals(idPairRelai));
      if (!connectéAuRelai)
          await pair.dial(adresseRelai);
      await que(() => pair.getConnections(peerIdFromString(idPairRelai)).length > 0);
          }
  let adressesLibp2p1: Multiaddr[];

  if (isBrowser || isElectronRenderer) {
    await connecterAuRelai(libp2p1)

    adressesLibp2p1 = await new Promise((résoudre) => {
      const testConnecté = () => {
        const adresses = libp2p1
          .getMultiaddrs()
          .filter(ma=>filtre(ma) && !WebRTC.matches(ma));
        if (adresses.length) {
          clearInterval(interval);
          résoudre(adresses);
        }
      };

      const interval = setInterval(testConnecté, 100);
      testConnecté();
    });
  } else {
    adressesLibp2p1 = libp2p1.getMultiaddrs().filter(filtre);
  }

  await libp2p2.peerStore.save(libp2p1.peerId, {
    multiaddrs: adressesLibp2p1,
  });
  libp2p2.dial(libp2p1.peerId);
  await que(() => libp2p1.getConnections(libp2p2.peerId).length > 0);
};

export const toutesConnectées = async (
  libp2ps: Libp2p<ServicesLibp2pTest>[],
  options: OptionsConnectionPairs,
): Promise<void> => {
  const connectées: Libp2p<ServicesLibp2pTest>[] = [];
  for (const lib of libp2ps) {
    for (const autre of connectées) {
      await connecterPairs(lib, autre, options);
    }
    connectées.push(lib);
  }
};
