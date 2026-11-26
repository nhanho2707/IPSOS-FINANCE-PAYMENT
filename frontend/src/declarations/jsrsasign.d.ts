declare module 'jsrsasign' {
    export namespace KJUR {
      namespace crypto {
        class Signature {
          constructor(params?: { alg?: string });
          init(key: any): void;
          updateString(str: string): void;
          sign(): string;
        }
      }
    }
  
    export namespace KEYUTIL {
      function getKey(key: string): any;
    }

    export function hextob64(hex: string): string;
}