const ALPHABET = "0123456789abcdef";

export function newId(prefix: string): string {
  let suffix = "";
  for (let index = 0; index < 16; index += 1) {
    suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `${prefix}_${suffix}`;
}
