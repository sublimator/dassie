import { type DatabaseSchema } from "@dassie/lib-sqlite"

import { ACME_DATABASE_SCALARS } from "../acme-certificate-manager/schemas/database-scalars"
import { acmeTokensTable } from "../acme-certificate-manager/tables/acme-tokens"
import { CONFIG_DATABASE_SCALARS } from "../config/schemas/database-scalars"
import { incomingPaymentTable } from "../open-payments/tables/incoming-payment"
import { nodesTable } from "../peer-protocol/tables/nodes"
import { peersTable } from "../peer-protocol/tables/peers"
import { settlementSchemesTable } from "../settlement-schemes/database-tables/settlement-schemes"
import migrations from "./migrations"

/**
 * Unique application ID for identifying the SQLite database as belonging to Dassie.
 *
 * This constant application ID was generated by first generating a random, positive, signed, 32-bit integer
 * and replacing the second through fourth nibbles with the HEX digits "DA5" to represent Dassie.
 */
const DASSIE_SQLITE_APPLICATION_ID = 0x1d_a5_3b_81

export const DASSIE_DATABASE_SCHEMA = {
  applicationId: DASSIE_SQLITE_APPLICATION_ID,
  migrations,
  tables: {
    incomingPayment: incomingPaymentTable,
    settlementSchemes: settlementSchemesTable,
    nodes: nodesTable,
    peers: peersTable,
    acmeTokens: acmeTokensTable,
  },
  scalars: {
    ...CONFIG_DATABASE_SCALARS,
    ...ACME_DATABASE_SCALARS,
  },
} as const satisfies DatabaseSchema
