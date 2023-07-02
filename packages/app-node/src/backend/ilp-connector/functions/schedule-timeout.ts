import { setTimeout } from "node:timers/promises"

import { createLogger, isError } from "@dassie/lib-logger"

import { IlpErrorCode } from "../schemas/ilp-errors"
import { createTriggerRejection } from "./trigger-rejection"

const logger = createLogger("das:ilp-connector:schedule-timeout")

export interface ScheduleTimeoutEnvironment {
  triggerRejection: ReturnType<typeof createTriggerRejection>
}

export interface ScheduleTimeoutParameters {
  requestId: number
  timeoutAbort: AbortController
}

export const createScheduleTimeout = ({
  triggerRejection,
}: ScheduleTimeoutEnvironment) => {
  return ({ requestId, timeoutAbort }: ScheduleTimeoutParameters) => {
    setTimeout(5000, undefined, { signal: timeoutAbort.signal })
      .then(() => {
        logger.debug("ILP packet timed out", { requestId })
        triggerRejection({
          requestId,
          errorCode: IlpErrorCode.R00_TRANSFER_TIMED_OUT,
          message: "Packet timed out",
        })
      })
      .catch((error: unknown) => {
        if (isError(error) && error.name === "AbortError") return

        logger.error("error in packet timeout handler", { error })
      })
  }
}
