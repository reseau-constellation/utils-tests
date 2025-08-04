/*
Certaines parties de ce fichier proviennent de @orbitdb/quickstart

MIT License

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

import {
  gossipsub,
  GossipSubComponents,
  GossipSub,
} from "@chainsafe/libp2p-gossipsub";
import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { circuitRelayTransport } from "@libp2p/circuit-relay-v2";
import { Identify, identify } from "@libp2p/identify";
import { webRTC } from "@libp2p/webrtc";
import { webSockets } from "@libp2p/websockets";

import { Libp2pOptions } from "libp2p";

import { PrivateKey } from "@libp2p/interface";

export type ServicesLibp2pTest = {
  identify: Identify;
  pubsub: GossipSub;
  obtClefPrivée: ServiceClefPrivée;
};

export interface ComposantesServiceClefPrivée {
  privateKey: PrivateKey;
}

export class ServiceClefPrivée {
  privateKey: PrivateKey;

  constructor(components: ComposantesServiceClefPrivée) {
    this.privateKey = components.privateKey;
  }

  obtenirClef(): PrivateKey {
    return this.privateKey;
  }
}

/**
 * Configuration Libp2p pour Node.js.
 */
export const OptionsDéfautLibp2pNode: () => Libp2pOptions<ServicesLibp2pTest> =
  () => {
    return {
      addresses: {
        listen: ["/ip4/0.0.0.0/tcp/0/ws", "/p2p-circuit"],
      },
      transports: [webSockets(), webRTC(), circuitRelayTransport()],
      connectionEncrypters: [noise()],
      streamMuxers: [yamux()],
      connectionGater: {
        denyDialMultiaddr: () => false,
      },
      services: {
        identify: identify(),
        pubsub: gossipsub({ allowPublishToZeroTopicPeers: true }) as (
          components: GossipSubComponents,
        ) => GossipSub, // Erreur de type dans @chainsafe/pubsub
        obtClefPrivée: (components: ComposantesServiceClefPrivée) =>
          new ServiceClefPrivée(components),
      },
    };
  };

/**
 * Configuration Libp2p pour les navigateurs.
 */
export const OptionsDéfautLibp2pNavigateur: () => Libp2pOptions<ServicesLibp2pTest> =
  () => {
    return {
      addresses: {
        listen: ["/webrtc", "/p2p-circuit"],
      },
      transports: [webSockets(), webRTC(), circuitRelayTransport()],
      connectionEncrypters: [noise()],
      streamMuxers: [yamux()],
      connectionGater: {
        denyDialMultiaddr: () => false,
      },
      services: {
        identify: identify(),
        pubsub: gossipsub({ allowPublishToZeroTopicPeers: true }) as (
          components: GossipSubComponents,
        ) => GossipSub, // Erreur de type dans @chainsafe/pubsub,
        obtClefPrivée: (components: ComposantesServiceClefPrivée) =>
          new ServiceClefPrivée(components),
      },
    };
  };
