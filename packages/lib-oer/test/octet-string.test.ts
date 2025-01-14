import { describe, test } from "vitest"

import { sequence, sequenceOf, uint8Number, uint32Number } from "../src"
import { octetString } from "../src/octet-string"
import { hexToUint8Array } from "../src/utils/hex"
import { parsedOk, serializedOk } from "./utils/result"
import { sampleBuffer } from "./utils/sample-buffer"
import { addLengthPrefix } from "./utils/sample-length-prefix"

describe("octetString", () => {
  test("should be a function", ({ expect }) => {
    expect(octetString).toBeTypeOf("function")
  })

  describe("with fixed length", () => {
    const schema = octetString(22)

    test("should return an object", ({ expect }) => {
      expect(schema).toBeTypeOf("object")
    })

    test("should serialize a valid value", ({ expect }) => {
      const value = schema.serialize(sampleBuffer.slice(0, 22))
      expect(value).toEqual(serializedOk(sampleBuffer.slice(0, 22)))
    })

    test("should parse a valid value", ({ expect }) => {
      const value = schema.parse(sampleBuffer.slice(0, 22))
      expect(value).toEqual(parsedOk(22, sampleBuffer.slice(0, 22)))
    })

    test("should refuse to serialize a value of the wrong length", ({
      expect,
    }) => {
      const value = schema.serialize(sampleBuffer.slice(0, 21))
      expect(value).toMatchInlineSnapshot(`
        {
          "error": [SerializeError: Expected octet string of length 22, but got 21],
          "success": false,
        }
      `)
    })

    test("should return a plain Uint8Array even when parsing an input Buffer", ({
      expect,
    }) => {
      const value = schema.parse(Buffer.from(sampleBuffer.slice(0, 22)))
      expect(value).toEqual(parsedOk(22, sampleBuffer.slice(0, 22)))
    })
  })

  describe("with variable length", () => {
    const schema = octetString()

    test("should return an object", ({ expect }) => {
      expect(schema).toBeTypeOf("object")
    })

    test("should serialize an empty buffer", ({ expect }) => {
      const value = schema.serialize(new Uint8Array(0))
      expect(value).toEqual(serializedOk("00"))
    })

    test("should serialize a buffer with one byte", ({ expect }) => {
      const value = schema.serialize(hexToUint8Array("12"))
      expect(value).toEqual(serializedOk("01 12"))
    })

    test("should serialize a buffer with 128 bytes", ({ expect }) => {
      const value = schema.serialize(sampleBuffer.slice(0, 128))
      expect(value).toMatchInlineSnapshot(`
        {
          "success": true,
          "value": Uint8Array [
            129,
            128,
            221,
            141,
            113,
            113,
            189,
            198,
            177,
            102,
            56,
            3,
            245,
            58,
            46,
            29,
            219,
            55,
            0,
            75,
            47,
            254,
            176,
            89,
            191,
            152,
            111,
            13,
            5,
            113,
            126,
            140,
            15,
            215,
            210,
            250,
            176,
            8,
            175,
            109,
            10,
            170,
            29,
            202,
            162,
            247,
            125,
            8,
            48,
            216,
            209,
            143,
            109,
            138,
            161,
            102,
            164,
            152,
            32,
            38,
            171,
            175,
            50,
            167,
            149,
            137,
            158,
            66,
            60,
            237,
            138,
            9,
            47,
            51,
            129,
            11,
            79,
            22,
            118,
            75,
            114,
            31,
            125,
            205,
            83,
            33,
            184,
            237,
            231,
            141,
            0,
            230,
            28,
            210,
            90,
            132,
            31,
            74,
            64,
            76,
            117,
            117,
            156,
            73,
            144,
            177,
            162,
            43,
            143,
            243,
            83,
            39,
            125,
            17,
            219,
            156,
            161,
            173,
            128,
            68,
            6,
            89,
            240,
            138,
            1,
            219,
            167,
            146,
            201,
            9,
          ],
        }
      `)
    })

    test("should reject a non-canonical length prefix which could fit one byte when allowNoncanonical is false", ({
      expect,
    }) => {
      const value = schema.parse(hexToUint8Array("81 01 12"))
      expect(value).toMatchInlineSnapshot(
        `
        {
          "error": [ParseError: non-canonical encoding - length prefix is not minimal (length <= 0x7f but not encoded as a single byte)

            81 01 12  
            ^^],
          "success": false,
        }
      `,
        "error"
      )
    })

    test("should accept a non-canonical length prefix which could fit one byte when allowNoncanonical is true", ({
      expect,
    }) => {
      const value = schema.parse(hexToUint8Array("81 01 12"), 0, {
        allowNoncanonical: true,
      })
      expect(value).toEqual(parsedOk(3, hexToUint8Array("12")))
    })

    test("should reject a non-canonical length prefix which could fit two bytes when allowNoncanonical is false", ({
      expect,
    }) => {
      const testVector = sampleBuffer.slice(0, 131)
      testVector.set(hexToUint8Array("82 00 80"), 0)
      const value = schema.parse(testVector)
      expect(value).toMatchInlineSnapshot(
        `
        {
          "error": [ParseError: non-canonical encoding - length prefix is not minimal (could be encoded in fewer bytes)

            82 00 80 71 bd c6 b1 66 38 03 f5 3a 2e 1d db 37 00 4b 2f fe …
            ^^],
          "success": false,
        }
      `,
        "error"
      )
    })

    test("should reject a non-canonical length prefix which could fit two bytes when allowNoncanonical is true", ({
      expect,
    }) => {
      const testVector = sampleBuffer.slice(0, 131)
      testVector.set(hexToUint8Array("82 00 80"), 0)
      const value = schema.parse(testVector, 0, { allowNoncanonical: true })
      expect(value).toMatchInlineSnapshot(`
        {
          "length": 131,
          "success": true,
          "value": Uint8Array [
            113,
            189,
            198,
            177,
            102,
            56,
            3,
            245,
            58,
            46,
            29,
            219,
            55,
            0,
            75,
            47,
            254,
            176,
            89,
            191,
            152,
            111,
            13,
            5,
            113,
            126,
            140,
            15,
            215,
            210,
            250,
            176,
            8,
            175,
            109,
            10,
            170,
            29,
            202,
            162,
            247,
            125,
            8,
            48,
            216,
            209,
            143,
            109,
            138,
            161,
            102,
            164,
            152,
            32,
            38,
            171,
            175,
            50,
            167,
            149,
            137,
            158,
            66,
            60,
            237,
            138,
            9,
            47,
            51,
            129,
            11,
            79,
            22,
            118,
            75,
            114,
            31,
            125,
            205,
            83,
            33,
            184,
            237,
            231,
            141,
            0,
            230,
            28,
            210,
            90,
            132,
            31,
            74,
            64,
            76,
            117,
            117,
            156,
            73,
            144,
            177,
            162,
            43,
            143,
            243,
            83,
            39,
            125,
            17,
            219,
            156,
            161,
            173,
            128,
            68,
            6,
            89,
            240,
            138,
            1,
            219,
            167,
            146,
            201,
            9,
            0,
            0,
            0,
          ],
        }
      `)
    })
  })

  describe("with variable length containing a sequence of uint8", () => {
    const schema = octetString().containing(sequenceOf(uint8Number()))

    test("should serialize an array of five numbers", ({ expect }) => {
      const value = schema.serialize([1, 2, 3, 4, 5])
      expect(value).toEqual(serializedOk(hexToUint8Array("0701050102030405")))
    })

    test("should serialize a pre-serialized array of five numbers, provided as a uint8array", ({
      expect,
    }) => {
      const value = schema.serialize(hexToUint8Array("01050102030405"))
      expect(value).toEqual(serializedOk(hexToUint8Array("0701050102030405")))
    })

    test("should serialize a pre-serialized array of five numbers, provided as a buffer", ({
      expect,
    }) => {
      const value = schema.serialize(Buffer.from("01050102030405", "hex"))
      expect(value).toEqual(serializedOk(hexToUint8Array("0701050102030405")))
    })

    test("should parse an array of five numbers", ({ expect }) => {
      const value = schema.parse(hexToUint8Array("0701050102030405"))
      expect(value).toEqual(parsedOk(8, [1, 2, 3, 4, 5]))
    })
  })

  describe("with variable length containing a sequence", () => {
    const schema = octetString().containing(
      sequence({
        a: uint8Number(),
        b: uint8Number(),
      })
    )

    test("should serialize a sequence", ({ expect }) => {
      const value = schema.serialize({ a: 1, b: 2 })
      expect(value).toEqual(serializedOk(hexToUint8Array("020102")))
    })

    test("should parse a sequence", ({ expect }) => {
      const value = schema.parse(hexToUint8Array("020102"))
      expect(value).toEqual(parsedOk(3, { a: 1, b: 2 }))
    })

    test("should serialize a pre-serialized value, provided as a uint8array", ({
      expect,
    }) => {
      const value = schema.serialize(hexToUint8Array("0102"))
      expect(value).toEqual(serializedOk(hexToUint8Array("020102")))
    })

    test("should serialize a pre-serialized value, provided as a buffer", ({
      expect,
    }) => {
      const value = schema.serialize(Buffer.from(hexToUint8Array("0102")))
      expect(value).toEqual(serializedOk(hexToUint8Array("020102")))
    })
  })

  describe("with fixed length containing a uint32", () => {
    const schema = octetString(4).containing(uint32Number())

    test("should serialize 123456", ({ expect }) => {
      const value = schema.serialize(123_456)
      expect(value).toEqual(serializedOk("0001e240"))
    })

    test("should serialize a pre-serialized value provided as a uint8array", ({
      expect,
    }) => {
      const value = schema.serialize(hexToUint8Array("0001e240"))
      expect(value).toEqual(serializedOk("0001e240"))
    })

    test("should serialize a pre-serialized value provided as a buffer", ({
      expect,
    }) => {
      const value = schema.serialize(Buffer.from(hexToUint8Array("0001e240")))
      expect(value).toEqual(serializedOk("0001e240"))
    })

    test("should fail to serialize a pre-serialized value that is the wrong length", ({
      expect,
    }) => {
      const value = schema.serialize(hexToUint8Array("0001e24000"))
      expect(value).toMatchInlineSnapshot(`
        {
          "error": [SerializeError: Expected octet string of length 4, but got 5],
          "success": false,
        }
      `)
    })

    test("should parse 123456", ({ expect }) => {
      const value = schema.parse(hexToUint8Array("0001e240"))
      expect(value).toEqual(parsedOk(4, 123_456))
    })
  })

  describe("with constrained variable length", () => {
    const schema = octetString([5, 8])

    test("should serialize a buffer with five bytes", ({ expect }) => {
      const value = schema.serialize(sampleBuffer.slice(0, 5))
      expect(value).toEqual(
        serializedOk(addLengthPrefix(sampleBuffer.slice(0, 5)))
      )
    })

    test("should parse a buffer with five bytes", ({ expect }) => {
      const value = schema.parse(addLengthPrefix(sampleBuffer.slice(0, 5)))
      expect(value).toEqual(parsedOk(6, sampleBuffer.slice(0, 5)))
    })

    test("should serialize a buffer with eight bytes", ({ expect }) => {
      const value = schema.serialize(sampleBuffer.slice(0, 8))
      expect(value).toEqual(
        serializedOk(addLengthPrefix(sampleBuffer.slice(0, 8)))
      )
    })

    test("should parse a buffer with eight bytes", ({ expect }) => {
      const value = schema.parse(addLengthPrefix(sampleBuffer.slice(0, 8)))
      expect(value).toEqual(parsedOk(9, sampleBuffer.slice(0, 8)))
    })

    test("should refuse to serialize a buffer with nine bytes", ({
      expect,
    }) => {
      const value = schema.serialize(sampleBuffer.slice(0, 9))
      expect(value).toMatchInlineSnapshot(`
        {
          "error": [SerializeError: Expected octet string of length at most 8, but got 9],
          "success": false,
        }
      `)
    })

    test("should refuse to parse a buffer with nine bytes", ({ expect }) => {
      const value = schema.parse(addLengthPrefix(sampleBuffer.slice(0, 9)))
      expect(value).toMatchInlineSnapshot(`
        {
          "error": [ParseError: Expected octet string of length at most 8, but got 9

            09 dd 8d 71 71 bd c6 b1 66 38  
            ^^],
          "success": false,
        }
      `)
    })

    test("should refuse to serialize a buffer with four bytes", ({
      expect,
    }) => {
      const value = schema.serialize(sampleBuffer.slice(0, 4))
      expect(value).toMatchInlineSnapshot(`
        {
          "error": [SerializeError: Expected octet string of length at least 5, but got 4],
          "success": false,
        }
      `)
    })

    test("should refuse to parse a buffer with four bytes", ({ expect }) => {
      const value = schema.parse(addLengthPrefix(sampleBuffer.slice(0, 4)))
      expect(value).toMatchInlineSnapshot(`
        {
          "error": [ParseError: Expected octet string of length at least 5, but got 4

            04 dd 8d 71 71  
            ^^],
          "success": false,
        }
      `)
    })
  })
})
