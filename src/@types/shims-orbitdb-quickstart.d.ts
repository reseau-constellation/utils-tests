declare module "@orbitdb/quickstart" {
  import { Identities, Identity, OrbitDB } from "@orbitdb/core";
  import { Libp2pOptions as Libp2pOptionsType } from "libp2p";

  export function startOrbitDB(args: {
    id?: string;
    identity?: Identity;
    identities?: Identities;
    directory?: string;
  }): Promise<OrbitDB>;
  export function stopOrbitDB(orbitdb: OrbitDB): Promise<void>;

  export const DefaultLibp2pOptions: Libp2pOptionsType;
  export const DefaultLibp2pBrowserOptions: Libp2pOptionsType;
}
