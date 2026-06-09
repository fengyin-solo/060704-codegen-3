import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/main.scss'
import { pluginLoader } from './engine/PluginLoader'
import { useUserStore } from './stores/user'
import { useDiaryStore } from './stores/diary'
import { useInventoryStore } from './stores/inventory'
import { useTopicStore } from './stores/topic'

async function initApp() {
  await pluginLoader.loadAll()
  
  const app = createApp(App)
  const pinia = createPinia()
  
  app.use(pinia)
  app.use(router)
  
  const userStore = useUserStore()
  userStore.init()
  
  const diaryStore = useDiaryStore()
  diaryStore.init()
  
  const topicStore = useTopicStore()
  topicStore.init()
  
  if (userStore.currentUserId) {
    const inventoryStore = useInventoryStore()
    inventoryStore.init(userStore.currentUserId)
  }
  
  app.mount('#app')
}

initApp().catch(console.error)
