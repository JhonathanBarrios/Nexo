import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    // Comentado para evitar que se abra automáticamente
    // if (confirm('Nueva versión disponible. ¿Quieres actualizar?')) {
    //   updateSW(true)
    // }
    console.log('Nueva versión disponible. Recarga la página para actualizar.')
  },
  onOfflineReady() {
    console.log('App ready to work offline')
  },
})

export { updateSW }
