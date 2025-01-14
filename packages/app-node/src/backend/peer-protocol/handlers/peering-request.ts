import type { Reactor } from "@dassie/lib-reactive"

import { EMPTY_UINT8ARRAY } from "../../../common/constants/general"
import type { PeerMessageContent } from "../actions/handle-peer-message"
import { peerTableStore } from "../stores/peer-table"

export const handlePeeringRequest = (reactor: Reactor) => {
  const peerTable = reactor.use(peerTableStore)
  return (content: PeerMessageContent<"peeringRequest">) => {
    const { nodeInfo } = content

    const { subnetId, nodeId, url, nodePublicKey } = nodeInfo.signed
    peerTable.addPeer({
      subnetId,
      nodeId,
      state: { id: "peered" },
      url,
      nodePublicKey,
      lastSeen: Date.now(),
    })

    return EMPTY_UINT8ARRAY
  }
}
