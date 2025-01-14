import { createLogger } from "@dassie/lib-logger"
import { createActor } from "@dassie/lib-reactive"

import { sendPeerMessage } from "./actions/send-peer-message"
import { peerMessageContent } from "./peer-schema"
import { nodeTableStore } from "./stores/node-table"
import { peerTableStore } from "./stores/peer-table"

const logger = createLogger("das:node:forward-link-state-update")

const COUNTER_THRESHOLD = 3
const MAX_RETRANSMIT_CHECK_INTERVAL = 200

export const forwardLinkStateUpdate = () =>
  createActor((sig) => {
    const nodes = sig.get(nodeTableStore)
    const peers = sig.get(peerTableStore)

    for (const node of nodes.values()) {
      if (
        node.lastLinkStateUpdate &&
        node.updateReceivedCounter < COUNTER_THRESHOLD &&
        node.scheduledRetransmitTime < Date.now()
      ) {
        // Set scheduled retransmit time to be infinitely far in the future so we don't retransmit the same update again.
        sig.use(nodeTableStore).updateNode(`${node.subnetId}.${node.nodeId}`, {
          scheduledRetransmitTime: Number.POSITIVE_INFINITY,
        })

        const message = peerMessageContent.serialize({
          type: "linkStateUpdate",
          value: {
            bytes: node.lastLinkStateUpdate,
          },
        })

        if (!message.success) {
          throw new Error("Failed to serialize link state update message", {
            cause: message.error,
          })
        }

        for (const peer of peers.values()) {
          if (peer.nodeId === node.nodeId) continue

          logger.debug("retransmit link state update", {
            from: node.nodeId,
            to: peer.nodeId,
            sequence: node.sequence,
          })

          // Retransmit the link state update
          sig
            .use(sendPeerMessage)({
              subnet: peer.subnetId,
              destination: peer.nodeId,
              message: {
                type: "linkStateUpdate",
                value: {
                  bytes: node.lastLinkStateUpdate,
                },
              },
              asUint8Array: message.value,
            })
            .catch((error: unknown) => {
              logger.error("failed to retransmit link state update", {
                from: node.nodeId,
                to: peer.nodeId,
                sequence: node.sequence,
                error,
              })
            })
        }
      }
    }

    sig.timeout(sig.wake.bind(sig), MAX_RETRANSMIT_CHECK_INTERVAL)
  })
