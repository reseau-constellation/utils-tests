import { join } from "path";

export const sousDossier = ({ dossier, i }: { dossier: string; i: number }) => {
  return join(dossier, i.toString());
};
