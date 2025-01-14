import type { LogLine } from "./log-line"
import type { LogLineOptions } from "./log-options"

/**
 * Formatters process raw log messages for a specific channel such as a terminal or browser console.
 *
 * @beta
 */
export type Formatter = (line: LogLine, options: LogLineOptions) => void
