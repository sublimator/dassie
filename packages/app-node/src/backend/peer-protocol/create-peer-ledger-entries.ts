import assert from "node:assert"

import { createActor } from "@dassie/lib-reactive"

import { nodeTableStore } from ".."
import {
  cleanupPeer,
  initializePeer,
} from "../accounting/functions/manage-peer"
import { ledgerStore } from "../accounting/stores/ledger"
import { NodeId } from "./types/node-id"

export const createPeerLedgerEntries = () =>
  createActor((sig, peerId: NodeId) => {
    const ledger = sig.use(ledgerStore)
    const nodeTable = sig.use(nodeTableStore)

    const peerState = nodeTable.read().get(peerId)?.peerState

    assert(peerState?.id === "peered", "peer state must be 'peered'")

    const { subnetId } = peerState

    initializePeer(ledger, subnetId, peerId)

    sig.onCleanup(() => {
      cleanupPeer(ledger, peerId)
    })
  })