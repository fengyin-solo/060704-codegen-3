<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTopicStore } from '@/stores/topic'
import { globalTimeline } from '@/engine/Timeline'

interface Emits {
  (e: 'close'): void
  (e: 'created'): void
}

const emit = defineEmits<Emits>()
const topicStore = useTopicStore()

const title = ref('')
const description = ref('')
const deadlineHours = ref(24)
const maxWinners = ref(3)

const deadlineHoursOptions = [1, 6, 12, 24, 48, 72]
const maxWinnersOptions = [1, 3, 5, 10]

const canSubmit = computed(() => {
  return title.value.trim().length > 0 && 
         description.value.trim().length > 0 &&
         deadlineHours.value > 0 &&
         maxWinners.value > 0
})

const deadline = computed(() => {
  const now = globalTimeline.getTime()
  return now + deadlineHours.value * 100
})

function handleSubmit() {
  if (!canSubmit.value) return
  
  try {
    topicStore.createTopic({
      title: title.value.trim(),
      description: description.value.trim(),
      deadline: deadline.value,
      maxWinners: maxWinners.value
    })
    
    emit('created')
    emit('close')
  } catch (e: any) {
    console.error('[Topic] 创建主题失败:', e)
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
      class="bg-gray-900 rounded-lg border-2 border-diary-fresh w-full max-w-lg max-h-[90vh] overflow-y-auto"
      @click.stop
    >
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="font-vt323 text-2xl text-diary-fresh glow-text">
            ✨ 发起新主题
          </h2>
          <button 
            class="text-gray-500 hover:text-white text-2xl font-vt323"
            @click="$emit('close')"
          >
            ✕
          </button>
        </div>
        
        <div class="space-y-6">
          <div>
            <label class="block font-vt323 text-diary-fresh mb-2">
              主题标题 *
            </label>
            <input
              v-model="title"
              type="text"
              placeholder="给你的主题起个响亮的名字..."
              class="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded text-white font-jetbrains focus:border-diary-fresh focus:outline-none transition-colors"
              maxlength="50"
            />
            <p class="text-gray-500 text-xs mt-1 font-vt323">
              {{ title.length }}/50
            </p>
          </div>
          
          <div>
            <label class="block font-vt323 text-diary-fresh mb-2">
              主题描述 *
            </label>
            <textarea
              v-model="description"
              placeholder="详细描述你的主题，告诉大家你想征集什么样的作品..."
              class="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded text-white font-jetbrains focus:border-diary-fresh focus:outline-none transition-colors resize-none"
              rows="4"
              maxlength="500"
            ></textarea>
            <p class="text-gray-500 text-xs mt-1 font-vt323">
              {{ description.length }}/500
            </p>
          </div>
          
          <div>
            <label class="block font-vt323 text-diary-fresh mb-2">
              征集时长
            </label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="hours in deadlineHoursOptions"
                :key="hours"
                class="px-4 py-2 font-vt323 text-sm border-2 rounded transition-all"
                :class="{
                  'bg-diary-fresh/20 border-diary-fresh text-diary-fresh': deadlineHours === hours,
                  'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500': deadlineHours !== hours
                }"
                @click="deadlineHours = hours"
              >
                {{ hours }} 小时
              </button>
            </div>
            <p class="text-gray-500 text-xs mt-2 font-vt323">
              截止时间: +{{ deadlineHours * 100 }} 时间单位
            </p>
          </div>
          
          <div>
            <label class="block font-vt323 text-diary-fresh mb-2">
              入选名额
            </label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="count in maxWinnersOptions"
                :key="count"
                class="px-4 py-2 font-vt323 text-sm border-2 rounded transition-all"
                :class="{
                  'bg-diary-gold/20 border-diary-gold text-diary-gold': maxWinners === count,
                  'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500': maxWinners !== count
                }"
                @click="maxWinners = count"
              >
                {{ count }} 名
              </button>
            </div>
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
              🚀 发起主题
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
