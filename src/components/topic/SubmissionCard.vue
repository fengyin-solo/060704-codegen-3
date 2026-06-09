<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { TopicSubmission, Topic } from '@/types'
import { useTopicStore } from '@/stores/topic'
import { useUserStore } from '@/stores/user'

interface Props {
  submission: TopicSubmission
  topic: Topic
  showSelect?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showSelect: false
})

const router = useRouter()
const topicStore = useTopicStore()
const userStore = useUserStore()

const isOwner = computed(() => {
  return props.topic.ownerId === userStore.currentUserId
})

const canSelect = computed(() => {
  return props.showSelect && isOwner.value && props.topic.status === 'judging'
})

function goToDiary() {
  router.push(`/diary/${props.submission.diaryId}`)
}

function handleSelect() {
  if (!canSelect.value) return
  
  try {
    topicStore.selectSubmission(props.submission.id)
  } catch (e: any) {
    alert(e.message)
  }
}
</script>

<template>
  <div 
    class="submission-card relative overflow-hidden rounded-lg transition-all duration-300 border-2"
    :class="{
      'border-diary-gold shadow-[0_0_15px_rgba(255,215,0,0.3)]': submission.isSelected,
      'border-gray-700 hover:border-diary-fresh': !submission.isSelected
    }"
  >
    <div class="p-4">
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-2">
            <span 
              v-if="submission.isSelected"
              class="px-2 py-0.5 rounded text-xs font-vt323 bg-diary-gold/20 text-diary-gold border border-diary-gold/50"
            >
              🏆 已入选
            </span>
            <span class="text-gray-500 text-xs font-vt323">
              投稿者: {{ submission.submitterName }}
            </span>
          </div>
          <h4 
            class="font-vt323 text-lg cursor-pointer hover:text-diary-fresh transition-colors"
            @click="goToDiary"
          >
            {{ submission.diaryTitle }}
          </h4>
        </div>
        
        <button
          v-if="canSelect"
          class="px-3 py-1 font-vt323 text-sm transition-all duration-150 border-2"
          :class="{
            'bg-diary-gold/20 text-diary-gold border-diary-gold': submission.isSelected,
            'bg-gray-800 text-gray-400 border-gray-600 hover:border-diary-gold hover:text-diary-gold': !submission.isSelected
          }"
          @click.stop="handleSelect"
        >
          {{ submission.isSelected ? '取消入选' : '选为入选' }}
        </button>
      </div>
      
      <p 
        v-if="submission.note" 
        class="text-gray-400 text-sm mb-3 font-jetbrains leading-relaxed italic"
      >
        "{{ submission.note }}"
      </p>
      
      <div class="flex items-center justify-between text-xs font-vt323 text-gray-500">
        <span>
          投稿时间: +{{ Math.floor(submission.submittedAt - topic.createdAt) }}
        </span>
        <button
          class="text-diary-fresh hover:underline"
          @click="goToDiary"
        >
          查看日记 →
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.submission-card {
  background: linear-gradient(135deg, #1f1f1f 0%, #1a1a1a 100%);
}

.submission-card:hover {
  transform: translateY(-1px);
}
</style>
