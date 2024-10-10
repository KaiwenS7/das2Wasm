/// <reference types="vite/client" />
declare namespace parser{
    interface packetInfo {
        pkgSize: number;
        pkgType: string; 
        nextIdx: number; 
        pkgId:  string;
    } 
}