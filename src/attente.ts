import { isBrowser, isElectronRenderer } from "wherearewe";

export const que = async <T>(
  f: () => T | Promise<T | undefined>,
  t = 100,
): Promise<T> => {
  return new Promise<T>((résoudre) => {
    const testF = async () => {
      const résultat = await f();
      if (résultat !== undefined) {
        résoudre(résultat);
      } else {
        setTimeout(testF, t);
      }
    };
    testF();
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
    const écouteur = chokidar.watch(dossier);
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
}) => {
  if (isBrowser || isElectronRenderer) {
    throw new Error("Test non disponible dans le navigateur.");
  }

  await attendreFichierExiste({ fichier, signal });
  const tempsAvant = Date.now();

  const chokidar = await import("chokidar");
  const fs = await import("fs");

  return new Promise((résoudre) => {
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
      } catch (e) {
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
