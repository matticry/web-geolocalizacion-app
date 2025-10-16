import { CUltimoRegxUsu } from "../CUltimoRegxUsu";

export interface RWebHistorialxDia {
    pedidos: Mpa_GEO_Pedidos[];
    cobros: Mpa_GEO_Cobros[];
    clientes: Mpa_GEO_Clientes[];
    usuarios: CUltimoRegxUsu;
    recorrido: Mpa_UltUbi[];
}
export interface Mpa_GEO_Pedidos {
    pdtclave1: string;
    pdtfactura: number;
    pdttd: string;
    pdtfechaf: string;
    pdtclave: string;
    pdtnombre: string;
    pdttotal: number;
    pdtlat: number;
    pdtlon: number;
    ubicacion: boolean;
}
export interface Mpa_GEO_Cobros {
    cobclave1: string;
    cobning: string;
    cobvalida: string;
    cabfecha: string;
    total: number;
    cobclave: string;
    cobnombre: string;
    cablat: number;
    cablon: number;
    ubicacion: boolean;
}
export interface Mpa_GEO_Clientes {

    dirclave: string;
    dirnombre: string;
    dirruc: string;
    dirclave1: string;
    asignado: boolean;
    numdire: number;
    dirdirec: string;
    latitud: number;
    longitud: number;
}
export interface Mpa_UltUbi {
    geubid: number;
    geubusu: string;
    geubfech: string;
    geublat: number;
    geublon: number;
    geubtim: number;
}