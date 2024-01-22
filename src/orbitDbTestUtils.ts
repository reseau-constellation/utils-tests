/*
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

const defaultFilter = () => true;

export const connectPeers = async (
  ipfs1: Helia,
  ipfs2: Helia,
  options = {
    filter: defaultFilter,
  },
) => {
  const addresses1 = ipfs1.libp2p.getMultiaddrs().filter(options.filter);
  const addresses2 = ipfs2.libp2p.getMultiaddrs().filter(options.filter);
  if (addresses1.length && addresses2.length) {
    await ipfs1.libp2p.dial(addresses2[0]);
    await ipfs2.libp2p.dial(addresses1[0]);
  }
};

export const tousConnecter = async (sfips: Helia[]) => {
  const connectés: Helia[] = [];
  for (const sfip of sfips) {
    for (const autre of connectés) {
      await connectPeers(sfip, autre);
    }
    connectés.push(sfip);
  }
};
