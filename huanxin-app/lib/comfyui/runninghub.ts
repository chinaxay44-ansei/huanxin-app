import { uploadToCos, buildPublicUrl } from '@/lib/cos'

const BASE_URL = process.env.RUNNINGHUB_BASE_URL || 'https://www.runninghub.cn'
const API_KEY = process.env.RUNNINGHUB_API_KEY || ''

export interface NodeInfoItem {
  nodeId: string
  fieldName: string
  fieldValue: any
}

export interface CreateTaskResponse {
  code: number
  msg: string
  data?: {
    netWssUrl?: string | null
    taskId?: string
    clientId?: string
    taskStatus?: 'QUEUED' | 'RUNNING' | 'FAILED' | 'SUCCESS'
    promptTips?: string
  }
}

export async function createTask(options: {
  workflowId: string
  nodeInfoList?: NodeInfoItem[]
  webhookUrl?: string
  apiKey?: string
  instanceType?: string
  usePersonalQueue?: boolean
}): Promise<CreateTaskResponse> {
  const payload: any = {
    apiKey: options.apiKey || API_KEY,
    workflowId: options.workflowId,
  }
  if (options.nodeInfoList && options.nodeInfoList.length > 0) {
    payload.nodeInfoList = options.nodeInfoList
  }
  if (options.webhookUrl) {
    payload.webhookUrl = options.webhookUrl
  }
  if (options.instanceType) {
    payload.instanceType = options.instanceType
  }
  if (typeof options.usePersonalQueue !== 'undefined') {
    payload.usePersonalQueue = options.usePersonalQueue
  }

  const res = await fetch(`${BASE_URL}/task/openapi/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': 'www.runninghub.cn',
    },
    body: JSON.stringify(payload),
  })
  const json = await res.json()
  return json
}

export async function getTaskStatus(taskId: string, apiKey?: string): Promise<{ code: number; msg: string; data: string }>{
  const res = await fetch(`${BASE_URL}/task/openapi/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': 'www.runninghub.cn',
    },
    body: JSON.stringify({ apiKey: apiKey || API_KEY, taskId }),
  })
  const json = await res.json()
  return json
}

export interface OutputItem {
  fileUrl: string
  fileType: string
  taskCostTime?: string
  nodeId?: string
  consumeCoins?: string
}

export async function getTaskOutputs(taskId: string, apiKey?: string): Promise<{ code: number; msg: string; data: OutputItem[] | any }>{
  const res = await fetch(`${BASE_URL}/task/openapi/outputs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': 'www.runninghub.cn',
    },
    body: JSON.stringify({ apiKey: apiKey || API_KEY, taskId }),
  })
  const json = await res.json()
  return json
}

export async function getWebhookDetail(taskId: string, apiKey?: string) {
  const res = await fetch(`${BASE_URL}/task/openapi/getWebhookDetail`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': 'www.runninghub.cn',
    },
    body: JSON.stringify({ apiKey: apiKey || API_KEY, taskId }),
  })
  return res.json()
}

export async function retryWebhook(webhookId: string, webhookUrl?: string, apiKey?: string) {
  const res = await fetch(`${BASE_URL}/task/openapi/retryWebhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': 'www.runninghub.cn',
    },
    body: JSON.stringify({ apiKey: apiKey || API_KEY, webhookId, webhookUrl }),
  })
  return res.json()
}

export async function saveOutputToStorage(userId: string, generationId: string, fileUrl: string): Promise<{ url: string; path: string }>{
  const bucket = 'work-media'
  const ext = (fileUrl.split('?')[0].split('.').pop() || 'png').toLowerCase()
  const path = `ai-generations/${userId}/${generationId}.${ext}`

  const resp = await fetch(fileUrl)
  const blob = await resp.arrayBuffer()

  await uploadToCos({
    bucketPrefix: bucket,
    objectPath: path,
    body: blob,
    contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
  })

  return { url: buildPublicUrl(`${bucket}/${path}`), path }
}
