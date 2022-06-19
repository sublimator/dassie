export const privateKeyLabelRegex =
  /-----BEGIN PRIVATE KEY-----\n([a-zA-Z0-9+/\n]+?)\n-----END PRIVATE KEY-----/
export const derPreamble = Buffer.from(
  "302E020100300506032B657004220420",
  "hex"
)

/**
 * Parse a PEM-encoded private key.
 *
 * Handles keys generated by OpenSSL. Does not support encrypted private keys.
 *
 * @param source The textual representation of a PEM file
 * @returns The raw Ed25519 private key
 * @see https://datatracker.ietf.org/doc/html/rfc7468#section-10
 */
export function parseEd25519PrivateKey(source: string): Buffer {
  if (source.indexOf("-----BEGIN ENCRYPTED PRIVATE KEY-----") !== -1) {
    throw new Error("Parsing of encrypted private keys is not supported")
  }

  const match = privateKeyLabelRegex.exec(source) as [string, string] | null

  if (!match) {
    throw new Error("No ed25519 private key found in PEM file")
  }

  const derEncoding = Buffer.from(match[1].replaceAll("\n", ""), "base64")

  if (derEncoding.length !== 48) {
    throw new Error("Invalid length for DER-encoded ed25519 private key")
  }

  if (!derPreamble.equals(derEncoding.slice(0, derPreamble.length))) {
    throw new Error("Unexpected data in DER-encoded ed25519 private key")
  }

  return derEncoding.slice(16)
}
