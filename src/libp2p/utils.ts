import { Libp2p } from "@libp2p/interface";
import { WebRTC } from "@multiformats/multiaddr-matcher";
import { multiaddr, Multiaddr } from "@multiformats/multiaddr";
import { isBrowser, isElectronRenderer } from "wherearewe";
import { ServicesLibp2pTest } from "./config.js";

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
) => {
  const filtre = options.filtre ?? filtreParDéfaut;

  if (isBrowser || isElectronRenderer) {
    await libp2p1.dial(multiaddr(options.adresseRelai));

    const adresse1 = await new Promise<Multiaddr>((resolve) => {
      const testConnecté = () => {
        const adresse = libp2p1
          .getMultiaddrs()
          .filter((ma) => WebRTC.matches(ma) && filtre(ma))
          .pop();
        if (adresse != null) {
          clearInterval(interval);
          resolve(adresse);
        }
      };
      const interval = setInterval(testConnecté, 100);
      testConnecté();
    });
    await libp2p2.dial(adresse1);
  } else {
    await libp2p2.peerStore.save(libp2p1.peerId, {
      multiaddrs: libp2p1.getMultiaddrs().filter(filtre),
    });
    await libp2p2.dial(libp2p1.peerId);
  }
};

export const toutesConnectées = async (
  libp2ps: Libp2p<ServicesLibp2pTest>[],
  options: OptionsConnectionPairs,
) => {
  const connectées: Libp2p<ServicesLibp2pTest>[] = [];
  for (const lib of libp2ps) {
    for (const autre of connectées) {
      await connecterPairs(lib, autre, options);
    }
    connectées.push(lib);
  }
};
