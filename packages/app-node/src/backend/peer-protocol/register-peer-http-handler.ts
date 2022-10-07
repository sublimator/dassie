import {
  BadRequestError,
  assertAcceptHeader,
  assertContentTypeHeader,
  parseBody,
  respondPlainly,
} from "@dassie/lib-http-server"
import { createLogger } from "@dassie/lib-logger"
import type { EffectContext } from "@dassie/lib-reactive"

import { routerService } from "../http-server/serve-http"
import { incomingPeerMessageTopic } from "./handle-peer-messages"
import { peerMessage } from "./peer-schema"

const logger = createLogger("das:node:handle-peer-http-request")

export const registerPeerHttpHandler = (sig: EffectContext) => {
  const router = sig.get(routerService)

  if (!router) return

  router.post("/peer", async (request, response) => {
    assertAcceptHeader(request, "application/dassie-peer-message")
    assertContentTypeHeader(request, "application/dassie-peer-message")

    const body = await parseBody(request)

    const parseResult = peerMessage.parse(body)

    if (!parseResult.success) {
      logger.debug("error while parsing incoming dassie message", {
        error: parseResult.failure,
        body,
      })
      throw new BadRequestError(`Bad Request, failed to parse message`)
    }

    sig.use(incomingPeerMessageTopic).emit({
      message: parseResult.value,
      asUint8Array: body,
    })

    respondPlainly(response, 200, "OK")
  })
}