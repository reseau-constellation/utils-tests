export type Suivi<T> = (x: T) => void | Promise<void>;

export type Oublier = () => Promise<void>;

export type RetourRecherche<N extends string = string> = {
  oublier: Oublier;
} & { [C in N]: (n: number) => Promise<void> };

export type RetourRechercheProfondeur = {
  oublier: Oublier;
  profondeur: (p: number) => Promise<void>;
};
