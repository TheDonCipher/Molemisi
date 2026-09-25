/**
 * Minimal ambient declarations for the Node built-ins this package uses.
 *
 * `@types/node` is not resolvable from this package in the current workspace
 * layout, and `tsconfig.json` sets `"types": []` so TypeScript does not go
 * looking for it. Declaring the handful of symbols actually used keeps the
 * package self-contained and typechecking without a new dependency. DOM lib
 * (also enabled in tsconfig) supplies `fetch`, `Response`, `Headers` and `URL`.
 */

declare module 'node:fs' {
  export function writeFileSync(path: string, data: string): void;
  export function appendFileSync(path: string, data: string): void;
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function existsSync(path: string): boolean;
}

declare module 'node:path' {
  export function join(...parts: string[]): string;
  export function resolve(...parts: string[]): string;
}

declare const process: {
  argv: string[];
  env: Record<string, string | undefined>;
  exitCode: number | undefined;
  exit(code?: number): never;
  stdout: { write(chunk: string): boolean };
  stderr: { write(chunk: string): boolean };
};
