
export interface Transaction {
  date: string;
  detail: string;
  movement: number;
  balance: number;
}

export enum Bank {
  POPULAR = "Banco Popular",
  OCCIDENTE = "Banco Occidente",
  DAVIVIENDA = "Davivienda",
  BOGOTA = "Banco Bogota",
  BBVA = "Banco BBVA",
  BANCOOMEVA = "Bancoomeva",
  BANCOLOMBIA = "Bancolombia",
  AVVILLAS = "AvVillas",
  AGRARIO = "Banco Agrario",
}

export enum EntityOption {
  GVAL = "GVAL",
  VEDU = "VEDU",
}
