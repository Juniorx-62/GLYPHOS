/** Registers ts-resolve.mjs. Use with `node --import ./scripts/lib/register-ts.mjs`. */
import { register } from 'node:module'

register('./ts-resolve.mjs', import.meta.url)
