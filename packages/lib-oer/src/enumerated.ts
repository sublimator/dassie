import { OerType } from "./base-type"
import { ParseError, SerializeError } from "./utils/errors"
import { parseLengthPrefix } from "./utils/length-prefix"
import type { ParseContext, SerializeContext } from "./utils/parse"

export const enumerated = <TEnumeration extends Record<string, number>>(
  enumeration: TEnumeration
) => {
  const reverseMap = Object.fromEntries(
    Object.entries(enumeration).map(([key, value]) => [value, key])
  ) as Record<number, keyof TEnumeration>

  const setHint = Object.entries(enumeration)
    .map(([key, value]) => `${key}(${value})`)
    .join(",")

  const OerEnumerated = class extends OerType<keyof TEnumeration> {
    parseWithContext(context: ParseContext, offset: number) {
      const { uint8Array } = context
      const firstByte = uint8Array[offset]
      if (typeof firstByte === "undefined") {
        return new ParseError(
          "unable to read enumerated value - end of buffer",
          uint8Array,
          offset
        )
      }

      let numericEnumValue
      let length
      if (firstByte & 0x80) {
        const result = parseLengthPrefix(context, offset, true)
        if (result instanceof ParseError) {
          return result
        }
        ;[numericEnumValue, length] = result
      } else {
        numericEnumValue = firstByte
        length = 1
      }

      const enumValue = reverseMap[numericEnumValue]
      if (enumValue == undefined) {
        return new ParseError(
          `unable to read enumerated value - value ${firstByte} not in set ${setHint}`,
          uint8Array,
          offset
        )
      }

      return [enumValue, length] as const
    }

    serializeWithContext(input: string) {
      const value = enumeration[input]

      if (value == undefined) {
        return new SerializeError(
          `unable to serialize enumerated value - value ${input} not in set ${setHint}`
        )
      }

      return [
        ({ uint8Array }: SerializeContext, offset: number) => {
          uint8Array[offset] = value
        },
        1,
      ] as const
    }
  }
  return new OerEnumerated()
}