<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTopicStore } from '@/stores/topic'
import { useUserStore } from '@/stores/user'
import { TOPIC_STATUS_NAMES, TOPIC_STATUS_COLORS } from '@/types'
import type { TopicSubmission } from '@/types'
import SubmissionCard from '@/components/topic/SubmissionCard.vue'
import SubmitDiaryModal from '@/components/topic/SubmitDiaryModal.vue'
import { formatTime } from '@/utils/id'
import { globalTimeline } from '@/engine/Timeline'

const route = useRoute()
const router = useRouter()
const topicStore = useTopicStore()
const userStore = useUserStore()

const showSubmitModal = ref(false)
const activeTab = ref<'submissions' | 'selected'>('submissions')
const timeRemaining = ref(0)
let timer: number | null = null

const topicId = computed(() => route.params.id as string)

const topic = computed(() => {
  return topicStore.getTopicById(topicId.value)
})

const statusColor = computed(() => {
  if (!topic.value) return '#fff'
  return TOPIC_STATUS_COLORS[topic.value.status]
})

const statusName = computed(() => {
  if (!topic.value) return ''
  return TOPIC_STATUS_NAMES[topic.value.status]
})

const submissions = computed(() => {
  return topicStore.getSubmissionsByTopic(topicId.value)
})

const selectedSubmissions = computed(() => {
  return topicStore.getSelectedSubmissions(topicId.value)
})

const isOwner = computed(() => {
  if (!topic.value || !userStore.currentUserId) return false
  return topic.value.ownerId === userStore.currentUserId
})

const hasSubmitted = computed(() => {
  if (!userStore.currentUserId) return false
  return topicStore.hasUserSubmitted(topicId.value, userStore.currentUserId)
})

const canSubmit = computed(() => {
  return topic.value?.status === 'accepting' && 
         !hasSubmitted.value && 
         !!userStore.currentUserId
})

const canFinish = computed(() => {
  return isOwner.value && topic.value?.status === 'judging'
})

const mySubmission = computed((): TopicSubmission | undefined => {
  if (!userStore.currentUserId) return undefined
  return submissions.value.find(s => s.submitterId === userStore.currentUserId)
})

function updateTimeRemaining() {
  if (topic.value) {
    timeRemaining.value = topicStore.getTimeRemaining(topic.value)
  }
}

function handleFinish() {
  if (!canFinish.value) return
  if (!confirm('确定要结束评选吗？结束后将无法再修改入选名单。')) return
  
  try {
    topicStore.finishTopic(topicId.value)
  } catch (e: any) {
    alert(e.message)
  }
}

function goBack() {
  router.push('/topics')
}

onMounted(() => {
  topicStore.init()
  updateTimeRemaining()
  timer = window.setInterval(() => {
    updateTimeRemaining()
  }, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})
</script>

<template>
  <div class="space-y-6" v-if="topic">
    <div class="flex items-center gap-4">
      <button 
        class="btn-pixel text-gray-400 border-gray-600 text-sm"
        @click="goBack"
      >
        ← 返回
      </button>
    </div>
    
    <div 
      class="relative overflow-hidden rounded-lg border-2 p-6"
      :style="{ borderColor: statusColor }"
    >
      <div class="absolute top-0 right-0 w-32 h-32 opacity-10">
        <div 
          class="absolute top-4 right-4 w-24 h-24 rounded-full"
          :style="{ background: statusColor, filter: 'blur(40px)' }"
        ></div>
      </div>
      
      <div class="relative z-10">
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-3">
              <span 
                class="state-indicator text-sm font-vt323"
                :style="{ color: statusColor, borderColor: statusColor }"
              >
                {{ statusName }}
              </span>
              <span v-if="topic.status === 'accepting'" class="flex items-center gap-1 text-diary-frozen font-vt323 text-sm">
                <span>⏱️</span>
                <span>{{ formatTime(timeRemaining) }}</span>
              </span>
            </div>
            
            <h1 class="font-vt323 text-3xl text-white mb-2">
              {{ topic.title }}
            </h1>
            
            <div class="flex items-center gap-4 text-sm font-vt323 text-gray-500">
              <span>
                发起人: <span class="text-gray-300">{{ topic.ownerName }}</span>
              </span>
              <span>
                投稿: <span class="text-diary-fresh">{{ submissions.length }}</span>
              </span>
              <span>
                入选名额: <span class="text-diary-gold">{{ topic.selectedSubmissionIds.length }}/{{ topic.maxWinners }}</span>
              </span>
            </div>
          </div>
        </div>
        
        <div class="bg-gray-800/50 rounded-lg p-4 mb-6">
          <p class="text-gray-300 font-jetbrains leading-relaxed whitespace-pre-wrap">
            {{ topic.description }}
          </p>
        </div>
        
        <div class="flex flex-wrap gap-3">
          <button
            v-if="canSubmit"
            class="btn-pixel text-diary-fresh border-diary-fresh"
            @click="showSubmitModal = true"
          >
            📝 我要投稿
          </button>
          
          <button
            v-if="hasSubmitted && mySubmission"
            class="btn-pixel text-diary-gold border-diary-gold"
            disabled
          >
            ✅ 已投稿: {{ mySubmission.diaryTitle }}
          </button>
          
          <button
            v-if="canFinish"
            class="btn-pixel text-diary-rotted border-diary-rotted"
            @click="handleFinish"
          >
            🏁 结束评选
          </button>
        </div>
      </div>
    </div>
    
    <div class="flex gap-2 border-b border-gray-800 pb-1">
      <button
        class="px-4 py-2 font-vt323 text-sm transition-all border-b-2 -mb-[1px]"
        :class="{
          'text-diary-fresh border-diary-fresh': activeTab === 'submissions',
          'text-gray-500 border-transparent hover:text-gray-300': activeTab !== 'submissions'
        }"
        @click="activeTab = 'submissions'"
      >
        📋 全部投稿 ({{ submissions.length }})
      </button>
      
      <button
        class="px-4 py-2 font-vt323 text-sm transition-all border-b-2 -mb-[1px]"
        :class="{
          'text-diary-gold border-diary-gold': activeTab === 'selected',
          'text-gray-500 border-transparent hover:text-gray-300': activeTab !== 'selected'
        }"
        @click="activeTab = 'selected'"
      >
        🏆 入选作品 ({{ selectedSubmissions.length }})
      </button>
    </div>
    
    <div class="ascii-divider">
      ----------------------------------------------------------------
    </div>
    
    <template v-if="activeTab === 'selected'">
      <div v-if="topic.status === 'accepting'" class="text-center py-16">
        <div class="text-6xl mb-4">⏳</div>
        <p class="text-gray-500 font-vt323 text-xl">
          征集尚未截止
        </p>
        <p class="text-gray-600 font-vt323 mt-2">
          征集截止后将进入评选阶段，届时可查看入选结果
        </p>
      </div>
      
      <div v-else-if="selectedSubmissions.length === 0" class="text-center py-16">
        <div class="text-6xl mb-4">🏆</div>
        <p class="text-gray-500 font-vt323 text-xl">
          {{ topic.status === 'finished' ? '本主题暂无入选作品' : '暂无入选作品' }}
        </p>
        <p v-if="topic.status === 'judging' && isOwner" class="text-gray-600 font-vt323 mt-2">
          请在"全部投稿"中选择入选作品
        </p>
        <p v-else-if="topic.status === 'judging' && !isOwner" class="text-gray-600 font-vt323 mt-2">
          发起人正在评选中，请耐心等待结果
        </p>
      </div>
      
      <div v-else class="space-y-4">
        <div v-if="topic.status === 'finished'" class="p-4 bg-diary-gold/10 rounded-lg border border-diary-gold/30 mb-4">
          <p class="font-vt323 text-diary-gold text-center">
            🎉 最终入选结果已公布，恭喜以下作者！
          </p>
        </div>
        
        <SubmissionCard
          v-for="submission in selectedSubmissions"
          :key="submission.id"
          :submission="submission"
          :topic="topic"
          :show-select="isOwner && topic.status === 'judging'"
        />
      </div>
    </template>
    
    <template v-else>
      <div v-if="submissions.length === 0" class="text-center py-16">
        <div class="text-6xl mb-4">📭</div>
        <p class="text-gray-500 font-vt323 text-xl">
          暂无投稿
        </p>
        <p v-if="canSubmit" class="text-gray-600 font-vt323 mt-2">
          成为第一个投稿的人吧！
        </p>
      </div>
      
      <div v-else class="space-y-4">
        <SubmissionCard
          v-for="submission in submissions"
          :key="submission.id"
          :submission="submission"
          :topic="topic"
          :show-select="isOwner && topic.status === 'judging'"
        />
      </div>
    </template>
    
    <SubmitDiaryModal
      v-if="showSubmitModal"
      :topic="topic"
      @close="showSubmitModal = false"
      @submitted="activeTab = 'submissions'"
    />
  </div>
  
  <div v-else class="text-center py-16">
    <div class="text-6xl mb-4">❓</div>
    <p class="text-gray-500 font-vt323 text-xl">
      主题不存在
    </p>
    <button 
      class="btn-pixel text-diary-fresh border-diary-fresh mt-4"
      @click="goBack"
    >
      ← 返回主题广场
    </button>
  </div>
</template>
