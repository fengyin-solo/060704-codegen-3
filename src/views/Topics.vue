<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTopicStore } from '@/stores/topic'
import { useUserStore } from '@/stores/user'
import TopicCard from '@/components/topic/TopicCard.vue'
import CreateTopicModal from '@/components/topic/CreateTopicModal.vue'

const topicStore = useTopicStore()
const userStore = useUserStore()

const showCreateModal = ref(false)
const activeTab = ref<'accepting' | 'finished' | 'my'>('accepting')

const tabs = [
  { key: 'accepting', label: '征集中', icon: '🔥' },
  { key: 'finished', label: '已结束', icon: '🏆' },
  { key: 'my', label: '我发起的', icon: '📝' }
] as const

const displayedTopics = computed(() => {
  switch (activeTab.value) {
    case 'accepting':
      return topicStore.acceptingTopics
    case 'finished':
      return topicStore.finishedTopics
    case 'my':
      return topicStore.myTopics
    default:
      return []
  }
})

const canCreate = computed(() => !!userStore.currentUserId)

function handleTopicCreated() {
  activeTab.value = 'my'
}

onMounted(() => {
  topicStore.init()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="font-vt323 text-3xl text-diary-fresh glow-text mb-1">
          🎨 主题广场
        </h1>
        <p class="text-gray-400 font-vt323">
          发现有趣的主题，投稿你的数字记忆
        </p>
      </div>
      
      <button
        v-if="canCreate"
        class="btn-pixel text-diary-fresh border-diary-fresh"
        @click="showCreateModal = true"
      >
        ✨ 发起主题
      </button>
    </div>
    
    <div class="flex gap-2 border-b border-gray-800 pb-1">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="px-4 py-2 font-vt323 text-sm transition-all border-b-2 -mb-[1px]"
        :class="{
          'text-diary-fresh border-diary-fresh': activeTab === tab.key,
          'text-gray-500 border-transparent hover:text-gray-300': activeTab !== tab.key
        }"
        @click="activeTab = tab.key"
      >
        {{ tab.icon }} {{ tab.label }}
      </button>
    </div>
    
    <div class="ascii-divider">
      ----------------------------------------------------------------
    </div>
    
    <div v-if="displayedTopics.length === 0" class="text-center py-16">
      <div class="text-6xl mb-4">
        {{ activeTab === 'accepting' ? '📭' : activeTab === 'finished' ? '📜' : '✍️' }}
      </div>
      <p class="text-gray-500 font-vt323 text-xl">
        {{ activeTab === 'accepting' ? '暂无正在征集的主题' : 
           activeTab === 'finished' ? '暂无已结束的主题' : 
           '你还没有发起过主题' }}
      </p>
      <p v-if="activeTab === 'my' && canCreate" class="text-gray-600 font-vt323 mt-2">
        点击右上角按钮发起第一个主题吧！
      </p>
    </div>
    
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <TopicCard
        v-for="topic in displayedTopics"
        :key="topic.id"
        :topic="topic"
      />
    </div>
    
    <CreateTopicModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="handleTopicCreated"
    />
  </div>
</template>
