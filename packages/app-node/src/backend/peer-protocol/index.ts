import { createActor } from "@dassie/lib-reactive"

import { handlePeerMessage } from "./actions/handle-peer-message"
import { sendPeerMessage } from "./actions/send-peer-message"
import { peersComputation } from "./computed/peers"
import { requestedPeersComputation } from "./computed/requested-peers"
import { forwardLinkStateUpdate } from "./forward-link-state-update"
import { registerPeerHttpHandler } from "./register-peer-http-handler"
import { sendHeartbeats } from "./send-heartbeats"

export const speakPeerProtocol = () =>
  createActor((sig) => {
    sig.run(handlePeerMessage, undefined, { register: true })
    sig.run(sendPeerMessage, undefined, { register: true })
    sig.run(peersComputation, undefined, { register: true })
    sig.run(requestedPeersComputation, undefined, { register: true })

    // Handle incoming Dassie messages via HTTP
    sig.run(registerPeerHttpHandler)

    sig.run(sendHeartbeats)
    sig.run(forwardLinkStateUpdate)
  })
