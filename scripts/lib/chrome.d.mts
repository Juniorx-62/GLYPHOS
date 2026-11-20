/** Types for the dependency-free Chrome DevTools Protocol helper (chrome.mjs). */
export interface ChromePage {
  call(method: string, params?: Record<string, unknown>): Promise<any>
  goto(url: string, options?: { waitMs?: number; timeout?: number }): Promise<void>
  eval(expression: string, options?: { timeout?: number }): Promise<any>
  screenshot(options?: { fullPage?: boolean }): Promise<Buffer>
  resize(width: number, height: number, mobile?: boolean): Promise<void>
  errors(): string[]
  clearEvents(): void
  close(): Promise<void>
}
export function findChrome(): string
export function launch(options?: { port?: number; headless?: boolean }): Promise<{
  newPage(options?: { width?: number; height?: number; mobile?: boolean }): Promise<ChromePage>
  close(): Promise<void>
  send(method: string, params?: Record<string, unknown>): Promise<any>
}>
