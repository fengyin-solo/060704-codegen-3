import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Topic, TopicSubmission, CreateTopicInput } from '@/types'
import { TopicStatus as TS } from '@/types'
import { storage } from '@/utils/storage'
import { generateId } from '@/utils/id'
import { globalTimeline } from '@/engine/Timeline'
import { useUserStore } from './user'
import { useDiaryStore } from './diary'

let _userStore: any = null
let _diaryStore: any = null

const getUserStore = () => {
  if (!_userStore) {
    _userStore = useUserStore()
  }
  return _userStore
}

const getDiaryStore = () => {
  if (!_diaryStore) {
    _diaryStore = useDiaryStore()
  }
  return _diaryStore
}

export const useTopicStore = defineStore('topic', () => {
  const topics = ref<Topic[]>([])
  const submissions = ref<TopicSubmission[]>([])

  const acceptingTopics = computed(() => {
    return topics.value
      .filter(t => t.status === TS.ACCEPTING)
      .sort((a, b) => b.createdAt - a.createdAt)
  })

  const finishedTopics = computed(() => {
    return topics.value
      .filter(t => t.status === TS.FINISHED || t.status === TS.JUDGING)
      .sort((a, b) => b.createdAt - a.createdAt)
  })

  const myTopics = computed(() => {
    const userStore = getUserStore()
    return topics.value
      .filter(t => t.ownerId === userStore.currentUserId)
      .sort((a, b) => b.createdAt - a.createdAt)
  })

  function init() {
    topics.value = storage.getTopics()
    submissions.value = storage.getTopicSubmissions()
    
    const userStore = getUserStore()
    if (userStore.currentUserId && topics.value.length === 0) {
      setTimeout(() => createSampleTopics(), 100)
    }
    
    checkAndUpdateStatus()
  }

  function checkAndUpdateStatus() {
    const now = globalTimeline.getTime()
    let hasChanges = false

    topics.value.forEach(topic => {
      if (topic.status === TS.ACCEPTING && topic.deadline <= now) {
        topic.status = TS.JUDGING
        hasChanges = true
      }
    })

    if (hasChanges) {
      storage.saveTopics(topics.value)
    }
  }

  function createTopic(input: CreateTopicInput): Topic {
    const userStore = getUserStore()
    const currentUser = userStore.currentUser
    
    if (!currentUser) {
      throw new Error('用户未登录')
    }

    const now = globalTimeline.getTime()
    
    const topic: Topic = {
      id: generateId(),
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      title: input.title,
      description: input.description,
      coverImage: input.coverImage,
      deadline: input.deadline,
      maxWinners: input.maxWinners,
      status: TS.ACCEPTING,
      createdAt: now,
      selectedSubmissionIds: []
    }

    topics.value.push(topic)
    storage.saveTopics(topics.value)
    
    console.log('[Topic] 主题创建成功:', topic.title)
    return topic
  }

  function getTopicById(topicId: string): Topic | undefined {
    return topics.value.find(t => t.id === topicId)
  }

  function getSubmissionsByTopic(topicId: string): TopicSubmission[] {
    return submissions.value
      .filter(s => s.topicId === topicId)
      .sort((a, b) => b.submittedAt - a.submittedAt)
  }

  function getSelectedSubmissions(topicId: string): TopicSubmission[] {
    return getSubmissionsByTopic(topicId)
      .filter(s => s.isSelected)
      .sort((a, b) => (b.selectedAt || 0) - (a.selectedAt || 0))
  }

  function submitDiary(topicId: string, diaryId: string, note?: string): TopicSubmission {
    const topic = getTopicById(topicId)
    if (!topic) {
      throw new Error('主题不存在')
    }

    if (topic.status !== TS.ACCEPTING) {
      throw new Error('主题已停止征集')
    }

    const userStore = getUserStore()
    const currentUser = userStore.currentUser
    
    if (!currentUser) {
      throw new Error('用户未登录')
    }

    const diaryStore = getDiaryStore()
    const diary = diaryStore.getDiaryById(diaryId)
    
    if (!diary) {
      throw new Error('日记不存在')
    }

    if (diary.ownerId !== currentUser.id) {
      throw new Error('只能投稿自己的日记')
    }

    if (!diary.isPublic) {
      throw new Error('只能投稿公开日记')
    }

    const existingSubmission = submissions.value.find(
      s => s.topicId === topicId && s.diaryId === diaryId
    )
    
    if (existingSubmission) {
      throw new Error('该日记已投稿过此主题')
    }

    const now = globalTimeline.getTime()
    
    const submission: TopicSubmission = {
      id: generateId(),
      topicId,
      diaryId,
      submitterId: currentUser.id,
      submitterName: currentUser.name,
      diaryTitle: diary.title,
      note,
      submittedAt: now,
      isSelected: false
    }

    submissions.value.push(submission)
    storage.saveTopicSubmissions(submissions.value)
    
    console.log('[Topic] 投稿成功:', diary.title, '->', topic.title)
    return submission
  }

  function selectSubmission(submissionId: string): void {
    const submission = submissions.value.find(s => s.id === submissionId)
    if (!submission) {
      throw new Error('投稿不存在')
    }

    const topic = getTopicById(submission.topicId)
    if (!topic) {
      throw new Error('主题不存在')
    }

    const userStore = getUserStore()
    if (topic.ownerId !== userStore.currentUserId) {
      throw new Error('只有主题发起人可以评选')
    }

    if (submission.isSelected) {
      submission.isSelected = false
      submission.selectedAt = undefined
      topic.selectedSubmissionIds = topic.selectedSubmissionIds.filter(id => id !== submissionId)
    } else {
      if (topic.selectedSubmissionIds.length >= topic.maxWinners) {
        throw new Error(`最多只能选择 ${topic.maxWinners} 个入选作品`)
      }
      submission.isSelected = true
      submission.selectedAt = globalTimeline.getTime()
      topic.selectedSubmissionIds.push(submissionId)
    }

    storage.saveTopics(topics.value)
    storage.saveTopicSubmissions(submissions.value)
    
    console.log('[Topic] 评选状态更新:', submission.diaryTitle, submission.isSelected ? '入选' : '取消入选')
  }

  function finishTopic(topicId: string): void {
    const topic = getTopicById(topicId)
    if (!topic) {
      throw new Error('主题不存在')
    }

    const userStore = getUserStore()
    if (topic.ownerId !== userStore.currentUserId) {
      throw new Error('只有主题发起人可以结束评选')
    }

    topic.status = TS.FINISHED
    storage.saveTopics(topics.value)
    
    console.log('[Topic] 主题已结束:', topic.title)
  }

  function hasUserSubmitted(topicId: string, userId: string): boolean {
    return submissions.value.some(
      s => s.topicId === topicId && s.submitterId === userId
    )
  }

  function getUserSubmissions(userId: string): TopicSubmission[] {
    return submissions.value
      .filter(s => s.submitterId === userId)
      .sort((a, b) => b.submittedAt - a.submittedAt)
  }

  function getSubmissionCount(topicId: string): number {
    return submissions.value.filter(s => s.topicId === topicId).length
  }

  function getTimeRemaining(topic: Topic): number {
    const now = globalTimeline.getTime()
    return Math.max(0, topic.deadline - now)
  }

  function createSampleTopics() {
    const userStore = getUserStore()
    const now = globalTimeline.getTime()
    
    const sampleTopics: Omit<Topic, 'id'>[] = [
      {
        ownerId: userStore.users[0]?.id || '',
        ownerName: userStore.users[0]?.name || '故障收藏家',
        title: '春日限定 · 记忆碎片',
        description: '征集关于春天的记忆，可以是一次旅行、一场邂逅，或者只是某个阳光明媚的午后。让我们一起在数字世界中留住春天的温度。',
        deadline: now + 500,
        maxWinners: 3,
        status: TS.ACCEPTING,
        createdAt: now - 200,
        selectedSubmissionIds: []
      },
      {
        ownerId: userStore.users[1]?.id || '',
        ownerName: userStore.users[1]?.name || '时间旅人',
        title: '赛博朋克梦境',
        description: '你是否做过关于未来的梦？霓虹灯、数据流、机械义肢...那些在梦中出现的赛博场景，用文字记录下来吧。',
        deadline: now + 1000,
        maxWinners: 5,
        status: TS.ACCEPTING,
        createdAt: now - 100,
        selectedSubmissionIds: []
      },
      {
        ownerId: userStore.users[0]?.id || '',
        ownerName: userStore.users[0]?.name || '故障收藏家',
        title: '写给未来的信',
        description: '给一年后的自己写一封信。那时的你，会是什么样子？这些文字在时间的侵蚀下会变成什么模样？',
        deadline: now - 50,
        maxWinners: 3,
        status: TS.JUDGING,
        createdAt: now - 300,
        selectedSubmissionIds: []
      },
      {
        ownerId: userStore.users[1]?.id || '',
        ownerName: userStore.users[1]?.name || '时间旅人',
        title: '深夜食堂',
        description: '征集关于食物和记忆的故事。那道菜、那家店、那个人...味蕾的记忆总是最持久的。',
        deadline: now - 200,
        maxWinners: 3,
        status: TS.FINISHED,
        createdAt: now - 500,
        selectedSubmissionIds: []
      }
    ]

    sampleTopics.forEach(sample => {
      const topic: Topic = {
        id: generateId(),
        ...sample
      }
      topics.value.push(topic)
    })

    const diaryStore = getDiaryStore()
    const publicDiaries = diaryStore.publicDiaries
    
    if (publicDiaries.length > 0 && topics.value.length >= 2) {
      const acceptingTopic = topics.value.find(t => t.status === TS.ACCEPTING)
      if (acceptingTopic) {
        publicDiaries.slice(0, 2).forEach(diary => {
          const submission: TopicSubmission = {
            id: generateId(),
            topicId: acceptingTopic.id,
            diaryId: diary.id,
            submitterId: diary.ownerId,
            submitterName: userStore.getUserById(diary.ownerId)?.name || '匿名',
            diaryTitle: diary.title,
            note: '这篇日记正好符合主题，希望能入选！',
            submittedAt: now - 50,
            isSelected: false
          }
          submissions.value.push(submission)
        })
      }
    }

    storage.saveTopics(topics.value)
    storage.saveTopicSubmissions(submissions.value)
  }

  return {
    topics,
    submissions,
    acceptingTopics,
    finishedTopics,
    myTopics,
    init,
    createTopic,
    getTopicById,
    getSubmissionsByTopic,
    getSelectedSubmissions,
    submitDiary,
    selectSubmission,
    finishTopic,
    hasUserSubmitted,
    getUserSubmissions,
    getSubmissionCount,
    getTimeRemaining,
    checkAndUpdateStatus
  }
})
