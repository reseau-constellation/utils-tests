import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import { isBrowser, isWebWorker } from "wherearewe";
import type { Download } from "playwright";

export class AttendreRésultat<T> {
  val?: T;
  fsOublier: { [clef: string]: () => void };
  événements: EventEmitter;

  constructor() {
    this.événements = new EventEmitter();
    this.val = undefined;
    this.fsOublier = {};
  }

  mettreÀJour(x?: T) {
    this.val = x;
    this.événements.emit("changé");
  }

  async attendreQue(f: (x: T) => boolean | Promise<boolean>): Promise<T> {
    if (this.val !== undefined && (await f(this.val))) return this.val;
    const id = uuidv4();

    return new Promise((résoudre) => {
      const fLorsqueChangé = async () => {
        if (this.val !== undefined && (await f(this.val))) {
          this.oublier(id);
          résoudre(this.val);
        }
      };
      this.événements.on("changé", fLorsqueChangé);
      this.fsOublier[id] = () => this.événements.off("changé", fLorsqueChangé);
    });
  }

  async attendreExiste(): Promise<T> {
    const val = (await this.attendreQue((x) => !!x)) as T;
    return val;
  }

  async attendreNexistePas(): Promise<void> {
    if (this.val === undefined) return;

    const id = uuidv4();

    return new Promise((résoudre) => {
      const fLorsqueChangé = async () => {
        if (this.val === undefined) {
          this.oublier(id);
          résoudre();
        }
      };
      this.événements.on("changé", fLorsqueChangé);
      this.fsOublier[id] = () => this.événements.off("changé", fLorsqueChangé);
    });
  }

  oublier(id: string) {
    this.fsOublier[id]();
    delete this.fsOublier[id];
  }

  toutAnnuler() {
    Object.keys(this.fsOublier).forEach((id) => this.oublier(id));
  }
}

export class AttendreFichierExiste extends EventEmitter {
  fOublier?: () => void;
  fichier: string;
  attenteTéléchargement?: Promise<Download>;

  constructor(fichier: string) {
    super();
    this.fichier = fichier;
  }

  async attendre(): Promise<void> {
    if (isBrowser || isWebWorker) {
      throw new Error("Test non disponible dans le navigateur.");
    } else {
      const chokidar = await import("chokidar");
      const fs = await import("fs");
      const path = await import("path");

      await new Promise<void>((résoudre) => {
        if (fs.existsSync(this.fichier)) résoudre();
        const dossier = path.dirname(this.fichier);
        const écouteur = chokidar.watch(dossier);
        this.fOublier = () => écouteur.close();
        écouteur.on("add", async () => {
          if (fs.existsSync(this.fichier)) {
            await écouteur.close();
            résoudre();
          }
        });
        if (fs.existsSync(this.fichier)) {
          écouteur.close();
          résoudre();
        }
      });
    }
  }

  annuler() {
    this.fOublier?.();
  }
}

export class AttendreFichierModifié extends EventEmitter {
  fsOublier: (() => void)[];
  fichier: string;
  attendreExiste: AttendreFichierExiste;

  constructor(fichier: string) {
    super();
    this.fichier = fichier;
    this.attendreExiste = new AttendreFichierExiste(fichier);
    this.fsOublier = [];
    this.fsOublier.push(() => this.attendreExiste.annuler());
  }

  async attendre(
    tempsAvant: number,
    condition?: () => Promise<boolean>,
  ): Promise<void> {
    await this.attendreExiste.attendre();
    const chokidar = await import("chokidar");
    const fs = await import("fs");
    return new Promise((résoudre, rejeter) => {
      const écouteur = chokidar.watch(this.fichier);
      this.fsOublier.push(() => écouteur.close());

      const vérifierModifié = async () => {
        try {
          const { mtime } = fs.statSync(this.fichier);
          const prêt = mtime.getTime() > tempsAvant;

          if (prêt && (!condition || (await condition()))) {
            await écouteur.close();
            clearInterval(intervale);
            résoudre();
          }
        } catch (e) {
          // Le fichier a été effacé
          écouteur.close();
          rejeter(e);
        }
      };

      écouteur.on("change", async (adresse) => {
        if (adresse !== this.fichier) return;
        await vérifierModifié();
      });
      // Parfois, on dirait que chokidar ne détecte pas l'événement...
      const intervale = setInterval(vérifierModifié, 1000);
    });
  }

  annuler() {
    this.fsOublier.forEach((f) => f());
  }
}
