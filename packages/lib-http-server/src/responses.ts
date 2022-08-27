import type { ServerResponse } from "node:http"

export const respondPlainly = (
  response: ServerResponse,
  statusCode: number,
  message: string
) => {
  response.writeHead(statusCode, { "Content-Type": "text/plain" })
  response.end(message)
}

export const respondJson = (
  response: ServerResponse,
  statusCode: number,
  data: unknown
) => {
  response.writeHead(statusCode, { "Content-Type": "application/json" })
  response.end(JSON.stringify(data))
}