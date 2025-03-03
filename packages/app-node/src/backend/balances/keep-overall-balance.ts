import { createActor } from "@dassie/lib-reactive"

import { overallBalanceSignal } from "./signals/overall-balance-signal"
import { subnetBalanceMapStore } from "./stores/subnet-balance-map"

export const keepOverallBalance = () =>
  createActor((sig) => {
    const subnetBalanceMap = sig.get(subnetBalanceMapStore)

    let totalBalance = 0n

    for (const balance of subnetBalanceMap.values()) {
      totalBalance += balance
    }

    sig.use(overallBalanceSignal).write(totalBalance)
  })
