import { ID_DÉFAUT_RELAI, PORT_DÉFAUT_RELAI } from "./consts.js";

export const obtenirAdresseRelai = (
  {
    portRelai,
    idRelai,
  }: {
    portRelai: number;
    idRelai: string;
  } = {
    portRelai: PORT_DÉFAUT_RELAI,
    idRelai: ID_DÉFAUT_RELAI,
  },
) => `/ip4/127.0.0.1/tcp/${portRelai}/ws/p2p/${idRelai}`;
