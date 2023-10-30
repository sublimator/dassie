import assert from "node:assert"

const SD_LISTEN_FDS_START = 3

export interface SocketActivationState {
  processId: number
  fileDescriptors: Record<string, readonly number[]>
}

export const getSocketActivationState = ():
  | SocketActivationState
  | undefined => {
  const { LISTEN_PID, LISTEN_FDS, LISTEN_FDNAMES } = process.env

  if (!LISTEN_PID || !LISTEN_FDS || !LISTEN_FDNAMES) {
    return undefined
  }

  const fdCount = Number(LISTEN_FDS)
  const fdNames = LISTEN_FDNAMES.split(":")

  assert(fdCount === fdNames.length)

  const fdRecord = new Map<string, number[]>()
  for (const [index, fdName] of fdNames.entries()) {
    if (!fdRecord.has(fdName)) {
      fdRecord.set(fdName, [])
    }

    fdRecord.get(fdName)!.push(SD_LISTEN_FDS_START + index)
  }

  return {
    processId: Number(LISTEN_PID),
    fileDescriptors: Object.fromEntries(
      [...fdRecord.entries()].map(([fdName, fds]) => [fdName, fds]),
    ),
  }
}

export const getSocketActivationFileDescriptors = (
  state: SocketActivationState,
  fileDescriptorName: string,
): readonly number[] => {
  return state.fileDescriptors[fileDescriptorName] ?? []
}
