import { z } from "zod"

import { databaseConfigStore } from "../../config/database-config"
import { trpc } from "../../local-ipc-server/trpc-context"
import { protectedProcedure } from "../../trpc-server/middlewares/auth"

export const tlsAdminRouter = trpc.router({
  setNodeTlsConfiguration: protectedProcedure
    .input(
      z.object({
        certificate: z.string(),
        privateKey: z.string(),
      })
    )
    .mutation(({ input: { certificate, privateKey }, ctx: { sig } }) => {
      const config = sig.use(databaseConfigStore)
      config.setTlsCertificates(certificate, privateKey)

      return true
    }),
})
