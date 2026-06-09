<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import type { Topic } from '@/types'
import { TOPIC_STATUS_NAMES, TOPIC_STATUS_COLORS } from '@/types'
import { useTopicStore } from '@/stores/topic'
import { formatTime } from '@/utils/id'
import { globalTimeline } from '@/engine/Timeline'

interface Props {
  topic: Topic
}

const props = defineProps<Props>()
const router = useRouter()
const topicStore = useTopicStore()

const timeRemaining = ref(0)
let timer: number | null = null

const statusColor = computed(() => TOPIC_STATUS_COLORS[props.topic.status])
const statusName = computed(() => TOPIC_STATUS_NAMES[props.topic.status])

const submissionCount = computed(() => {
  return topicStore.getSubmissionCount(props.topic.id)
})

const selectedCount = computed(() => {
  return props.topic.selectedSubmissionIds.length
})

const isUrgent = computed(() => {
  return props.topic.status === 'accepting' && timeRemaining.value < 100
})

function updateTimeRemaining() {
  timeRemaining.value = topicStore.getTimeRemaining(props.topic)
}

function goToDetail() {
  router.push(`/topics/${props.topic.id}`)
}

onMounted(() => {
  updateTimeRemaining()
  timer = window.setInterval(updateTimeRemaining, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<template>
  <div 
    class="topic-card relative overflow-hidden rounded-lg cursor-pointer transition-all duration-300 border-2"
    :class="{
      'border-diary-fresh hover:shadow-[0_0_20px_rgba(57,255,20,0.3)]': topic.status === 'accepting',
      'border-diary-gold hover:shadow-[0_0_20px_rgba(255,215,0,0.3)]': topic.status === 'judging',
      'border-diary-rotted hover:shadow-[0_0_20px_rgba(107,63,160,0.3)]': topic.status === 'finished',
      'animate-pulse': isUrgent
    }"
    @click="goToDetail"
  >
    <div class="p-4 bg-gray-900/80">
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-2">
            <span 
              class="state-indicator text-xs font-vt323"
              :style="{ color: statusColor, borderColor: statusColor }"
            >
              {{ statusName }}
            </span>
            <span class="text-gray-500 text-xs font-vt323">
              {{ submissionCount }} 人投稿
            </span>
          </div>
          <h3 
            class="font-vt323 text-xl truncate"
            :style="{ color: isUrgent ? '#ff6b35' : '#fff' }"
          >
            {{ topic.title }}
          </h3>
        </div>
      </div>
      
      <p class="text-gray-400 text-sm mb-3 line-clamp-2 font-jetbrains leading-relaxed">
        {{ topic.description }}
      </p>
      
      <div class="flex items-center justify-between text-xs font-vt323">
        <div class="flex items-center gap-4">
          <span class="text-gray-500">
            发起人: <span class="text-gray-300">{{ topic.ownerName }}</span>
          </span>
          <span class="text-gray-500">
            入选: <span :style="{ color: '#ffd700' }">{{ selectedCount }}/{{ topic.maxWinners }}</span>
          </span>
        </div>
        
        <div 
          v-if="topic.status === 'accepting'"
          class="flex items-center gap-1"
          :style="{ color: isUrgent ? '#ff6b35' : '#00d4ff' }"
        >
          <span>⏱️</span>
          <span>{{ formatTime(timeRemaining) }}</span>
        </div>
        
        <div 
          v-else-if="topic.status === 'judging'"
          class="flex items-center gap-1 text-diary-gold"
        >
          <span>🏆</span>
          <span>评选中</span>
        </div>
        
        <div 
          v-else
          class="flex items-center gap-1 text-diary-rotted"
        >
          <span>✅</span>
          <span>已结束</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.topic-card {
  background: linear-gradient(135deg, #222 0%, #1a1a1a 100%);
}

.topic-card:hover {
  transform: translateY(-2px);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
