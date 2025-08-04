export const obtenirFichierRelai = async (): Promise<string> => {
  const path = await import("path");
  const url = await import("url");
  const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

  const fichierRelai = path.join(__dirname, "./bin.js");
  return fichierRelai;
};

export const lancerRelai = async ({
  portDéfautRelai,
  clefPrivéeRelai,
}: {
  portDéfautRelai?: string;
  clefPrivéeRelai?: string;
} = {}) => {
  const { execa } = await import("execa");

  const fichierRelai = await obtenirFichierRelai();

  const relai = execa({
    env: {
      ...process.env,
      PORT_DÉFAUT_RELAI: portDéfautRelai,
      CLEF_PRIVÉE_RELAI: clefPrivéeRelai,
    },
  })`node ${fichierRelai} &`;

  relai.catch((e) => {
    // Ignorer l'erreur causée par la termination du processus par notre code
    if (e.signal !== "SIGTERM") throw new Error(e);
  });

  relai.stdout.on("data", (x) => {
    const texte = new TextDecoder().decode(x);
    console.log(texte);
  });

  return () => relai.kill();
};
