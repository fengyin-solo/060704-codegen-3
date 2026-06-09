<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Diary, Topic } from '@/types'
import { useDiaryStore } from '@/stores/diary'
import { useTopicStore } from '@/stores/topic'
import { useUserStore } from '@/stores/user'

interface Props {
  topic: Topic
}

interface Emits {
  (e: 'close'): void
  (e: 'submitted'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const diaryStore = useDiaryStore()
const topicStore = useTopicStore()
const userStore = useUserStore()

const selectedDiaryId = ref<string | null>(null)
const note = ref('')

const availableDiaries = computed(() => {
  const currentUserId = userStore.currentUserId
  if (!currentUserId) return []
  
  return diaryStore.currentUserDiaries.filter(d => {
    if (!d.isPublic) return false
    if (d.state === 'scheduled' || d.state === 'dead') return false
    
    const alreadySubmitted = topicStore.submissions.some(
      s => s.topicId === props.topic.id && s.diaryId === d.id
    )
    return !alreadySubmitted
  })
})

const selectedDiary = computed(() => {
  if (!selectedDiaryId.value) return null
  return diaryStore.getDiaryById(selectedDiaryId.value) || null
})

const canSubmit = computed(() => {
  return selectedDiaryId.value !== null
})

function handleSubmit() {
  if (!canSubmit.value || !selectedDiaryId.value) return
  
  try {
    topicStore.submitDiary(
      props.topic.id,
      selectedDiaryId.value,
      note.value.trim() || undefined
    )
    
    emit('submitted')
    emit('close')
  } catch (e: any) {
    console.error('[Topic] 投稿失败:', e)
    alert(e.message)
  }
}

function handleOverlayClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    emit('close')
  }
}
</script>

<template>
  <div 
    class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
    @click="handleOverlayClick"
  >
    <div 
      class="bg-gray-900 rounded-lg border-2 border-diary-fresh w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      @click.stop
    >
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="font-vt323 text-2xl text-diary-fresh glow-text">
            📝 投稿日记
          </h2>
          <button 
            class="text-gray-500 hover:text-white text-2xl font-vt323"
            @click="$emit('close')"
          >
            ✕
          </button>
        </div>
        
        <div class="mb-4 p-3 bg-gray-800/50 rounded border border-gray-700">
          <p class="font-vt323 text-diary-gold text-sm">
            投稿主题: {{ topic.title }}
          </p>
        </div>
        
        <div class="space-y-6">
          <div>
            <label class="block font-vt323 text-diary-fresh mb-3">
              选择要投稿的日记 *
            </label>
            
            <div v-if="availableDiaries.length === 0" class="text-center py-8">
              <div class="text-4xl mb-3">📭</div>
              <p class="text-gray-500 font-vt323">
                暂无可投稿的公开日记
              </p>
              <p class="text-gray-600 font-vt323 text-sm mt-1">
                请先创建一篇公开日记后再来投稿
              </p>
            </div>
            
            <div v-else class="space-y-2 max-h-64 overflow-y-auto">
              <div
                v-for="diary in availableDiaries"
                :key="diary.id"
                class="p-3 rounded border-2 cursor-pointer transition-all"
                :class="{
                  'bg-diary-fresh/10 border-diary-fresh': selectedDiaryId === diary.id,
                  'bg-gray-800/50 border-gray-700 hover:border-gray-500': selectedDiaryId !== diary.id
                }"
                @click="selectedDiaryId = diary.id"
              >
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <h4 class="font-vt323 text-lg truncate">
                      {{ diary.title }}
                    </h4>
                    <p class="text-gray-500 text-xs font-vt323 mt-1">
                      类型: {{ diary.type }} | 状态: {{ diary.state }}
                    </p>
                  </div>
                  <div 
                    class="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                    :class="{
                      'border-diary-fresh bg-diary-fresh/20': selectedDiaryId === diary.id,
                      'border-gray-600': selectedDiaryId !== diary.id
                    }"
                  >
                    <span v-if="selectedDiaryId === diary.id" class="text-diary-fresh text-sm">✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <label class="block font-vt323 text-diary-fresh mb-2">
              投稿附言 (可选)
            </label>
            <textarea
              v-model="note"
              placeholder="说点什么，让发起人更好地了解你的作品..."
              class="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded text-white font-jetbrains focus:border-diary-fresh focus:outline-none transition-colors resize-none"
              rows="3"
              maxlength="200"
            ></textarea>
            <p class="text-gray-500 text-xs mt-1 font-vt323">
              {{ note.length }}/200
            </p>
          </div>
          
          <div class="ascii-divider">
            ----------------------------------------------------------------
          </div>
          
          <div class="flex gap-3">
            <button
              class="flex-1 btn-pixel text-gray-400 border-gray-600"
              @click="$emit('close')"
            >
              取消
            </button>
            <button
              class="flex-1 btn-pixel text-diary-fresh border-diary-fresh"
              :disabled="!canSubmit"
              @click="handleSubmit"
            >
              🚀 确认投稿
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
