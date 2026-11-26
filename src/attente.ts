import { isBrowser, isElectronRenderer } from "wherearewe";
import { isNull } from "lodash-es";
import { TypedEmitter } from "tiny-typed-emitter";
import type { Oublier } from "./types.ts";

export const que = async (
  f: () => boolean | Promise<boolean>,
  t = 50,
): Promise<void> => {
  let chrono: ReturnType<typeof setTimeout> | undefined = undefined;
  return new Promise((résoudre, rejeter) => {
    const fFinale = async () => {
      try {
        if (await f()) {
          clearTimeout(chrono);
          résoudre();
        } else {
          t *= 1.5;
          chrono = setTimeout(fFinale, t);
        }
      } catch (e) {
        clearTimeout(chrono);
        rejeter(e);
      }
    };
    fFinale();
  });
};

export const attendreFichierExiste = async ({
  fichier,
  signal,
}: {
  fichier: string;
  signal?: AbortSignal;
}): Promise<boolean> => {
  if (isBrowser || isElectronRenderer) {
    throw new Error("Test non disponible dans le navigateur.");
  }
  const chokidar = await import("chokidar");
  const fs = await import("fs");
  const path = await import("path");

  return new Promise<boolean>((résoudre) => {
    // Arrêter tout de suite si le fichier existe déjà
    if (fs.existsSync(fichier)) résoudre(true);

    // Actions signal
    const lorsqueAvorté = () => {
      fermerEtRésoudre(false);
    };

    // Actions écouteur de fichiers
    const dossier = path.dirname(fichier);
    const écouteur = chokidar.watch(dossier, { awaitWriteFinish: true });
    const fermerÉcouteur = async () => await écouteur.close();

    const lorsquFichierAjouté = () => {
      if (fs.existsSync(fichier)) {
        fermerEtRésoudre(true);
      }
    };

    // Fermeture des écouteurs
    const fermerEtRésoudre = async (statut: boolean) => {
      signal?.removeEventListener("abort", lorsqueAvorté);
      écouteur.off("add", lorsquFichierAjouté);
      await fermerÉcouteur();

      résoudre(statut);
    };

    signal?.addEventListener("abort", lorsqueAvorté);

    écouteur.on("add", lorsquFichierAjouté);
    if (signal?.aborted) fermerEtRésoudre(false);

    if (fs.existsSync(fichier)) fermerEtRésoudre(true);
  });
};

export const attendreFichierModifié = async ({
  fichier,
  condition,
  signal,
}: {
  fichier: string;
  condition?: () => Promise<boolean>;
  signal?: AbortSignal;
}): Promise<boolean> => {
  if (isBrowser || isElectronRenderer) {
    throw new Error("Test non disponible dans le navigateur.");
  }

  await attendreFichierExiste({ fichier, signal });
  const tempsAvant = Date.now();

  const chokidar = await import("chokidar");
  const fs = await import("fs");

  return new Promise<boolean>((résoudre) => {
    // Actions signal
    const lorsqueAvorté = () => {
      fermerEtRésoudre(false);
    };

    // Actions écouteur de fichiers
    const écouteur = chokidar.watch(fichier);
    const fermerÉcouteur = async () => await écouteur.close();
    const lorsqueModifié = async (adresse: string) => {
      if (adresse !== fichier) return;
      await vérifierModifié();
    };

    const fermerEtRésoudre = async (statut: boolean) => {
      clearInterval(intervale);
      signal?.removeEventListener("abort", lorsqueAvorté);
      écouteur.off("change", lorsqueModifié);
      await fermerÉcouteur();

      résoudre(statut);
    };

    const vérifierModifié = async () => {
      try {
        const { mtime } = fs.statSync(fichier);
        const prêt = mtime.getTime() > tempsAvant;

        if (prêt && (!condition || (await condition()))) {
          fermerEtRésoudre(true);
        }
      } catch {
        // Le fichier a été effacé
        await fermerEtRésoudre(false);
      }
    };

    signal?.addEventListener("abort", lorsqueAvorté);

    écouteur.on("change", lorsqueModifié);
    écouteur.on("unlink", lorsqueModifié);

    if (signal?.aborted) fermerEtRésoudre(false);

    // Parfois, on dirait que chokidar ne détecte pas l'événement...
    const intervale = setInterval(vérifierModifié, 1000);
  });
};

export const obtenir = async <T>(
  f: (args: {
    si: (
      f: (x: T | undefined) => boolean | Promise<boolean>,
    ) => (x: T | undefined) => void;
    siDéfini: () => (x: T | undefined) => void;
    siNonDéfini: () => (x: T | undefined) => void;
    siVide: () => (x: T) => void;
    siNul: () => (x: T) => void;
    siPasVide: () => (x: T | undefined) => void;
    siPasNul: () => (x: T) => void;
    siLongueurAuMoins: (n: number) => (x: T | undefined) => void;
    tous: () => (x: T) => void;
  }) => Promise<Oublier>,
): Promise<T> => {
  const événements = new TypedEmitter<{ résolu: (x: T) => void }>();
  let résultat: { val: T } | undefined = undefined;

  const si = (
    fTest: (x: T | undefined) => boolean | Promise<boolean>,
  ): ((x: T | undefined) => void) => {
    return async (x: T | undefined) => {
      const passe = await fTest(x);
      if (passe) {
        événements.emit("résolu", x as T);
        résultat = { val: x as T };
      }
    };
  };

  const siDéfini = (): ((x: T | undefined) => void) => {
    return si((x: T | undefined): x is T => x !== undefined);
  };

  const siNonDéfini = (): ((x: T | undefined) => void) => {
    return si((x: T | undefined) => x === undefined);
  };

  const siVide = (): ((x: T) => void) => {
    return si((x) => {
      if (Array.isArray(x)) return x.length === 0;
      else if (x instanceof Set) return x.size === 0;
      else if (typeof x === "object" && !isNull(x))
        return Object.keys(x).length === 0;
      else return false;
    });
  };
  const siNul = (): ((x: T) => void) => {
    return si((x: T | undefined) => isNull(x));
  };
  const siPasVide = (): ((x: T | undefined) => void) => {
    return si((x) => {
      if (Array.isArray(x)) return x.length > 0;
      else if (x instanceof Set) return x.size > 0;
      else if (typeof x === "object" && !isNull(x))
        return Object.keys(x).length > 0;
      else return false;
    });
  };
  const siPasNul = (): ((x: T) => void) => {
    return si((x: T | undefined) => !isNull(x));
  };

  const siLongueurAuMoins = (n: number): ((x: T | undefined) => void) => {
    return si(
      (x) =>
        !!x &&
        ((Array.isArray(x) && x.length >= n) ||
          (Object.keys(x) && Object.keys(x).length >= n)),
    );
  };

  const tous = (): ((x: T) => void) => {
    return si(() => true);
  };

  const fOublier = await f({
    si,
    siDéfini,
    siNonDéfini,
    siVide,
    siNul,
    siPasVide,
    siPasNul,
    siLongueurAuMoins,
    tous,
  });

  return new Promise<T>((compléter) => {
    if (résultat) {
      const résultatExistant = résultat;
      // On rend la valeur retrouvée même si on a eu une erreur dans la fonction d'oubli.
      fOublier().finally(() => compléter(résultatExistant.val));
    } else {
      événements.once("résolu", async (x) => {
        // On rend la valeur retrouvée même si on a eu une erreur dans la fonction d'oubli.
        await fOublier().finally(() => compléter(x));
      });
    }
  });
};
