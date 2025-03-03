import { createActor } from "@dassie/lib-reactive"

import { forwardLinkStateUpdate } from "./forward-link-state-update"
import { registerPeerHttpHandler } from "./register-peer-http-handler"
import { sendHeartbeats } from "./send-heartbeats"

export const speakPeerProtocol = () =>
  createActor((sig) => {
    // Handle incoming Dassie messages via HTTP
    sig.run(registerPeerHttpHandler)

    sig.run(sendHeartbeats)
    sig.run(forwardLinkStateUpdate)
  })
