declare module "@orbitdb/core" {
  import EventEmitter from "events";
  import type { IPFS } from "ipfs-core";

  export function Database(args: {
    ipfs: IPFS;
    identity?: Identity;
    address: string;
    name?: string;
    access?: AccessController;
    directory?: string;
    meta?: object;
    headsStorage?: Storage;
    entryStorage?: Storage;
    indexStorage?: Storage;
    referencesCount?: number;
    syncAutomatically?: boolean;
    onUpdate?: () => void;
  }): Promise<{
    type: string;
    addOperation: (args: {
      op: string;
      key: string | null;
      value: unknown;
    }) => Promise<string>;
    address: string;
    close(): Promise<void>;
    drop(): Promise<void>;
    events: EventEmitter;
    access: AccessController;
    log: Log;
  }>;

  export type Identity = {
    id: string;
    publicKey: string;
    signatures: {
      id: string;
      publicKey: string;
    };
    type: string;
    sign: (identity: Identity, data: string) => Promise<string>;
    verify: (
      signature: string,
      publicKey: string,
      data: string,
    ) => Promise<boolean>;
  };

  export type OrbitDB = {
    id: string;
    open: (
      address: string,
      OrbitDBDatabaseOptions?,
    ) => ReturnType<typeof Database>;
    stop;
    ipfs;
    directory;
    keystore;
    identity: Identity;
    peerId;
  };
  export function createOrbitDB(args: {
    ipfs: IPFS;
    directory: string;
  }): Promise<OrbitDB>;

  export function useAccessController(accessController: { type: string }): void;
  export function isValidAddress(address: unknown): boolean;

  export type Log = {
    id;
    clock: Clock;
    heads: () => Promise<Entry[]>;
    traverse: () => AsyncGenerator<Entry, void, unknown>;
  };
  export type Identity = {
    id: string;
    publicKey: object;
    sigantures: object;
    type: string;
    sign: () => string;
    verify: () => boolean;
  };

  export function AccessControllerGenerator({
    orbitdb,
    identities,
    address,
  }: {
    orbitdb: OrbitDB;
    identities: Identities;
    address?: string;
  }): Promise<AccessController>;

  export class AccessController {
    type: string;
    address: string;
    canAppend: (entry: Entry) => Promise<boolean>;
  }

  export function IPFSAccessController(args: {
    write: string[];
    storage: Storage;
  }): (args: {
    orbitdb: OrbitDB;
    identities: Identities;
    address: string;
  }) => Promise<{
    type: "ipfs";
    address: string;
    write: string[];
    canAppend: (entry: Entry) => Promise<boolean>;
  }>;
  export class Identities {
    getIdentity;
    verifyIdentity: (identity) => boolean;
  }
  export class Storage {
    put;
    get;
  }
  export function IPFSBlockStorage({
    ipfs: IPFS,
    pin: boolean,
  }): Promise<Storage>;
  export function LRUStorage({ size: number }): Promise<Storage>;
  export function ComposedStorage(...args: Storage[]): Promise<Storage>;

  export type OrbitDBDatabaseOptions = {
    type: string;
    AccessController: AccessControllerGenerator;
  };

  export type Clock = {
    id: string;
    time: number;
  };

  export type Entry<T = unknown> = {
    id: string;
    payload: { op: string; key: string | null; value?: T };
    next: string[];
    refs: string[];
    clock: Clock;
    v: integer;
    key: string;
    identity: string;
    sig: string;
    hash: string;
  };

  // Temporaires
  export type Store =
    | FeedStore
    | SetStore
    | KeyValueStore
    | OrderedKeyValueStore;

  export type FeedStore = Awaited<ReturnType<typeof Database>> & {
    remove: (hash: string) => Promise<string>;
  };
  export type FeedStoreTypé<T extends élémentsBd> = Omit<
    FeedStore,
    "add" | "all"
  > & {
    add: (value: T) => Promise<string>;
    all: () => Promise<
      {
        value: T;
        hash: string;
      }[]
    >;
  };

  export type SetDatabase = ReturnType<typeof Database>;
  export type SetStore = Awaited<SetDatabase>;
  export type SetStoreTypé<T extends élémentsBd> = Omit<
    SetStore,
    "put" | "set" | "del" | "all"
  > & {
    put: (value: T) => Promise<string>;
    set: SetStoreTypé<T>["put"];
    del: (value: T) => Promise<string>;
    all: () => Promise<
      {
        value: T;
        hash: string;
      }[]
    >;
  };

  export type OrderedKeyValue = ReturnType<typeof Database>;
  export type OrderedKeyValueStore = Awaited<OrderedKeyValue>;
  export type OrderedKeyValueStoreTypé<T extends { [clef: string]: unknown }> =
    Omit<
      OrderedKeyValueStore,
      "put" | "set" | "del" | "move" | "get" | "all"
    > & {
      put: <K extends keyof T>(
        key: K,
        value: T[K],
        position?: number,
      ) => Promise<string>;
      set: OrderedKeyValueStoreTypé<T>["put"];
      del: <K extends keyof T>(key: K) => Promise<string>;
      move: <K extends keyof T>(key: K, position: number) => Promise<string>;
      get: <K extends keyof T>(key: K) => Promise<T[K] | undefined>;
      all: () => Promise<
        {
          key: keyof T;
          value: T[keyof T];
          hash: string;
        }[]
      >;
    };

  export type KeyValueStore = {
    type: "keyvalue";
    address: string;
    put(key: string, value: unknown): Promise<string>;
    set: KeyValueStore["put"];
    del(key: string): Promise<string>;
    get(key: string): Promise<unknown | undefined>;
    all(): Promise<{ key: string; value: unknown; hash: string }[]>;
    close(): Promise<void>;
    drop(): Promise<void>;
    events: EventEmitter;
    access: AccessController;
    log: Log;
  };
  export type KeyValueStoreTypé<T extends { [clef: string]: unknown }> = Omit<
    KeyValueStore,
    "put" | "set" | "del" | "get" | "all"
  > & {
    put<K extends keyof T>(key: K, value: T[K]): Promise<string>;
    set: KeyValueStoreTypé<T>["put"];
    del<K extends keyof T>(key: K): Promise<string>;
    get<K extends keyof T>(key: K): Promise<T[K] | undefined>;
    all(): Promise<T>;
  };
}
