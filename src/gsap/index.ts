export { registerGsapPlugins } from './plugin-setup'
export { setupGsapDefaults } from './defaults'
export { globalMatchMedia } from './match-media'
export { EASINGS } from './config/easings'
export { DURATIONS } from './config/durations'
export { STAGGERS } from './config/staggers'

import { registerGsapPlugins } from './plugin-setup'
import { setupGsapDefaults } from './defaults'

export function setupGsap(): void {
  registerGsapPlugins()
  setupGsapDefaults()
}
