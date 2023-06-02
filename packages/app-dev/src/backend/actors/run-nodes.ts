import assert from "node:assert"

import { createLogger } from "@dassie/lib-logger"
import { createActor, createMapped } from "@dassie/lib-reactive"

import { activeNodesSetSignal } from "../computed/active-nodes-set"
import { viteNodeService } from "../services/vite-node-server"
import { viteService } from "../services/vite-server"
import { activeNodesStore } from "../stores/active-nodes"
import { prepareDataDirectory } from "../utils/prepare-data-directory"
import {
  type CertificateInfo,
  validateCertificates,
} from "../utils/validate-certificates"
import { fileChangeTopic } from "./handle-file-change"
import { runNodeChildProcess } from "./run-node-child-process"

const logger = createLogger("das:dev:run-nodes")

export interface NodeDefinition<T> {
  id: string
  port: number
  debugPort: number
  peers: string[]
  config: T
  url: string
  entry?: string
}

export const runNodes = () =>
  createActor(async (sig) => {
    const viteServer = sig.get(viteService)
    const nodeServer = sig.get(viteNodeService)

    if (!viteServer || !nodeServer) return

    // Restart all nodes when a source code file changes
    sig.subscribe(fileChangeTopic)

    logger.debug("starting node processes")

    const nodeActorMap = () =>
      createMapped(activeNodesSetSignal, (nodeId) =>
        createActor(async (sig) => {
          const node = sig.get(
            activeNodesStore,
            (nodes) => nodes.find((node) => node.id === nodeId) ?? null
          )

          assert(node, `node ${nodeId} should exist in config store`)

          // Generate TLS certificates
          {
            const neededCertificates: CertificateInfo[] = [
              {
                type: "web",
                commonName: `${node.id}.localhost`,
                certificatePath: node.config.tlsWebCertFile,
                keyPath: node.config.tlsWebKeyFile,
              },
              {
                type: "dassie",
                commonName: `test.das.${node.id}`,
                certificatePath: node.config.tlsDassieCertFile,
                keyPath: node.config.tlsDassieKeyFile,
              },
            ]

            await validateCertificates({
              id: node.id,
              certificates: neededCertificates,
            })
          }

          // Prepare data directory
          {
            const { dataPath } = node.config

            await prepareDataDirectory(dataPath)
          }

          await sig.run(runNodeChildProcess, {
            viteServer,
            nodeServer,
            node,
          })
        })
      )

    await Promise.all(sig.runMap(nodeActorMap))
  })
