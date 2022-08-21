import type { WebSocket } from "ws"
import { WebSocketServer } from "ws"

import { createLogger } from "@dassie/lib-logger"
import { EffectContext, createValue } from "@dassie/lib-reactive"

import { configStore } from "../config"
import { httpServerValue } from "../http-server/serve-http"
import { incomingIlpPacketBuffer } from "../ilp-connector/topics/incoming-ilp-packet"
import {
  BtpType,
  btpEnvelopeSchema,
  btpMessageSchema,
  btpTransferSchema,
} from "./btp-codec"

const logger = createLogger("das:node:websocket-server")

export const registerBtpHttpUpgrade = (sig: EffectContext) => {
  const websocketServer = sig.get(websocketServerValue)
  const httpServer = sig.get(httpServerValue)

  httpServer.on("upgrade", (request, socket, head) => {
    if (request.url === "/btp") {
      websocketServer.handleUpgrade(request, socket, head, (ws) => {
        websocketServer.emit("connection", ws, request)
      })
    }
  })
}

let unique = 0

export const connectionMap = new Map<string, WebSocket>()

export const websocketServerValue = () =>
  createValue((sig) => {
    const ilpAddress = sig.get(configStore, (config) => config.ilpAddress)

    const wss = new WebSocketServer({ noServer: true })

    const handleConnection = (socket: WebSocket) => {
      try {
        const connectionId = unique++

        const clientIlpAddress = `${ilpAddress}.c${connectionId}`

        connectionMap.set(clientIlpAddress, socket)

        logger.debug("handle BTP websocket connection", { connectionId })

        socket.on("message", (messageBuffer) => {
          const messageResult = btpEnvelopeSchema.parse(
            messageBuffer as Uint8Array
          )
          if (messageResult.success) {
            const message = messageResult.value
            logger.debug("received BTP message", {
              type: message.messageType,
            })

            switch (message.messageType) {
              case BtpType.Message: {
                const messageParseResult = btpMessageSchema.parse(
                  message.message
                )

                if (!messageParseResult.success) {
                  logger.debug("failed to parse BTP message payload", {
                    error: messageParseResult.failure,
                  })
                  return
                }

                if (
                  messageParseResult.value.protocolData.some(
                    ({ protocolName }) => protocolName === "auth"
                  )
                ) {
                  logger.debug("received BTP auth packet")
                  const responseSerializationResult =
                    btpMessageSchema.serialize({
                      protocolData: [],
                    })
                  if (!responseSerializationResult.success) {
                    logger.error("error serializing BTP response message", {
                      error: responseSerializationResult.failure,
                    })
                    return
                  }
                  const envelopeSerializationResult =
                    btpEnvelopeSchema.serialize({
                      messageType: 1,
                      requestId: message.requestId,
                      message: responseSerializationResult.value,
                    })
                  if (!envelopeSerializationResult.success) {
                    logger.error("error serializing BTP response", {
                      error: envelopeSerializationResult.failure,
                    })
                    return
                  }
                  socket.send(envelopeSerializationResult.value)
                  return
                }

                for (const protocolData of messageParseResult.value
                  .protocolData) {
                  if (protocolData.protocolName === "ilp") {
                    logger.debug("received ILP packet via BTP message")
                    sig.emit(incomingIlpPacketBuffer, {
                      source: clientIlpAddress,
                      packet: protocolData.data,
                      requestId: message.requestId,
                    })
                    return
                  }
                }

                return
              }

              case BtpType.Transfer: {
                const transferParseResult = btpTransferSchema.parse(
                  message.message
                )

                if (!transferParseResult.success) {
                  logger.debug("failed to parse BTP transfer payload", {
                    error: transferParseResult.failure,
                  })
                  return
                }

                for (const protocolData of transferParseResult.value
                  .protocolData) {
                  if (protocolData.protocolName === "ilp") {
                    logger.debug("received ILP packet via BTP transfer")
                    sig.emit(incomingIlpPacketBuffer, {
                      source: clientIlpAddress,
                      packet: protocolData.data,
                      requestId: message.requestId,
                    })
                    return
                  }
                }
                return
              }

              case BtpType.Response: {
                const responseParseResult = btpMessageSchema.parse(
                  message.message
                )

                if (!responseParseResult.success) {
                  logger.debug("failed to parse BTP response payload", {
                    error: responseParseResult.failure,
                  })
                  return
                }

                for (const protocolData of responseParseResult.value
                  .protocolData) {
                  if (protocolData.protocolName === "ilp") {
                    logger.debug("received ILP packet via BTP response")
                    sig.emit(incomingIlpPacketBuffer, {
                      source: clientIlpAddress,
                      packet: protocolData.data,
                      requestId: message.requestId,
                    })
                    return
                  }
                }
              }
            }
          } else {
            logger.debug("failed to parse BTP message envelope", {
              // eslint-disable-next-line @typescript-eslint/no-base-to-string
              message: messageBuffer.toString("hex"),
              error: messageResult.failure,
            })
          }
        })
      } catch (error) {
        logger.error(
          "error handling websocket connection",
          { error },
          {
            skipAfter: "WebSocketService.handleConnection",
          }
        )
      }
    }

    wss.on("connection", handleConnection)

    sig.onCleanup(() => {
      wss.off("connection", handleConnection)
      wss.close()
    })

    return wss
  })
