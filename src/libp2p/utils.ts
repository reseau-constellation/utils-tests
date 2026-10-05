import { WebRTC } from "@multiformats/multiaddr-matcher";
import { multiaddr, type Multiaddr } from "@multiformats/multiaddr";
import { isBrowser, isElectronRenderer } from "wherearewe";
import { que } from "../attente.ts";
import type { Libp2p } from "@libp2p/interface";
import type { ServicesLibp2pTest } from "./config.js";

const filtreParDéfaut = () => true;

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

  if (isBrowser || isElectronRenderer) {
    await libp2p1.dial(multiaddr(options.adresseRelai));

    const adresse1 = await new Promise<Multiaddr>((résoudre) => {
      const testConnecté = () => {
        const adresse = libp2p1
          .getMultiaddrs()
          .filter((ma) => WebRTC.matches(ma) && filtre(ma))
          .pop();
        if (adresse != null) {
          clearInterval(interval);
          résoudre(adresse);
        }
      };
      const interval = setInterval(testConnecté, 100);
      testConnecté();
    });
    libp2p2.dial(adresse1);

    await new Promise((résoudre) => {
      const testConnecté = () => {
        const adresse = libp2p1
          .getConnections()
          .filter((c) => c.remotePeer.toString() === libp2p2.peerId.toString())
          .pop();
        if (adresse != null) {
          clearInterval(interval);
          résoudre(adresse);
        }
      };
      const interval = setInterval(testConnecté, 100);
      testConnecté();
    });
  } else {
    await libp2p2.peerStore.save(libp2p1.peerId, {
      multiaddrs: libp2p1.getMultiaddrs().filter(filtre),
    });
    await libp2p2.dial(libp2p1.peerId);
    await que(() => !!libp2p1.getPeers().find((p) => p.equals(libp2p2.peerId)));
  }
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
