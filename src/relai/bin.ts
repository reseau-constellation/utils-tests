/*
La majorité de ce fichier provient d'OrbitDB

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

import { yamux } from "@chainsafe/libp2p-yamux";
import { createLibp2p } from "libp2p";
import { noise } from "@chainsafe/libp2p-noise";
import { circuitRelayServer } from "@libp2p/circuit-relay-v2";
import { webSockets } from "@libp2p/websockets";
import { identify } from "@libp2p/identify";
import { keys } from "@libp2p/crypto";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";
import { FaultTolerance } from "@libp2p/interface";
import { CLEF_PRIVÉE_RELAI, PORT_DÉFAUT_RELAI } from "./consts.js";

const bavard = process.env.BAVARD;

// produit par: console.log(server.peerId.privateKey.toString('hex'))
const privateKeyString = process.env.CLEF_PRIVÉE_RELAI || CLEF_PRIVÉE_RELAI;

const chiffrée = uint8ArrayFromString(privateKeyString, "hex");
const clefPrivée = keys.privateKeyFromProtobuf(chiffrée);

const relai = await createLibp2p({
  privateKey: clefPrivée,
  addresses: {
    listen: [
      `/ip4/0.0.0.0/tcp/${process.env.PORT_DÉFAUT_RELAI || PORT_DÉFAUT_RELAI}/ws`,
    ],
  },
  transports: [webSockets()],
  transportManager: {
    faultTolerance: FaultTolerance.NO_FATAL,
  },
  connectionEncrypters: [noise()],
  streamMuxers: [yamux()],
  services: {
    identify: identify(),
    relay: circuitRelayServer({
      reservations: {
        maxReservations: 5000,
        defaultDataLimit: BigInt(1024 * 1024 * 1024),
      },
    }),
  },
});

relai.addEventListener("peer:connect", async (event) => {
  if (bavard) console.log("peer:connect", event.detail);
});

relai.addEventListener("peer:discovery", async (event) => {
  if (bavard) console.log("peer:discovery", event.detail);
});

relai.addEventListener("peer:disconnect", async (event) => {
  if (bavard) if (bavard) console.log("peer:disconnect", event.detail);
  relai.peerStore.delete(event.detail);
});

console.log(relai.peerId.toString());
if (bavard)
  console.log(
    "p2p addr: ",
    relai.getMultiaddrs().map((ma) => ma.toString()),
  );
// génère une adresse prédéterminée : /ip4/127.0.0.1/tcp/54321/ws/p2p/12D3KooWAJjbRkp8FPF5MKgMU53aUTxWkqvDrs4zc1VMbwRwfsbE
