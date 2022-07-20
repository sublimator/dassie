import type { Opaque } from "type-fest"

type UnsignedBigint = Opaque<bigint, "bigint >= 0">

export const isUnsignedBigint = (value: unknown): value is UnsignedBigint =>
  typeof value === "bigint" && value >= 0n

export const unsignedBigintByteLength = (sample: UnsignedBigint) => {
  let remainder: bigint = sample
  let length = 0

  while (remainder > 0n) {
    remainder >>= 8n
    length++
  }

  return length
}

export const signedBigintByteLength = (sample: bigint) => {
  if (sample < 0n) {
    sample = -sample - 1n
  }

  sample <<= 1n

  return unsignedBigintByteLength(sample as UnsignedBigint)
}
