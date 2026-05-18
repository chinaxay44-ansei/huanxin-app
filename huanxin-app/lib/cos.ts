import COS from 'cos-nodejs-sdk-v5'

const COS_BUCKET = process.env.TENCENT_COS_BUCKET || 'haunxing1203-1329480565'
const COS_REGION = process.env.TENCENT_COS_REGION || 'ap-chengdu'
const COS_PUBLIC_DOMAIN =
  process.env.TENCENT_COS_PUBLIC_DOMAIN || 'https://haunxing1203-1329480565.cos.ap-chengdu.myqcloud.com'

const secretId = process.env.TENCENT_COS_SECRET_ID || ''
const secretKey = process.env.TENCENT_COS_SECRET_KEY || ''

if (!secretId || !secretKey) {
  throw new Error('COS_CONFIG_MISSING: 请在环境变量中配置 TENCENT_COS_SECRET_ID 和 TENCENT_COS_SECRET_KEY')
}

const cos = new COS({
  SecretId: secretId,
  SecretKey: secretKey,
})

function toBuffer(input: Buffer | ArrayBuffer | Uint8Array): Buffer {
  if (Buffer.isBuffer(input)) return input
  if (input instanceof ArrayBuffer) return Buffer.from(input)
  return Buffer.from(input.buffer, input.byteOffset, input.byteLength)
}

function buildKey(bucketPrefix: string, objectPath: string) {
  const prefix = bucketPrefix.replace(/^\/+|\/+$/g, '')
  const path = objectPath.replace(/^\/+/, '')
  return `${prefix}/${path}`
}

export function buildPublicUrl(key: string) {
  return `${COS_PUBLIC_DOMAIN}/${encodeURI(key)}`
}

export async function uploadToCos(params: {
  bucketPrefix: string
  objectPath: string
  body: Buffer | ArrayBuffer | Uint8Array
  contentType?: string
}): Promise<{ key: string; url: string }> {
  const Key = buildKey(params.bucketPrefix, params.objectPath)
  const Body = toBuffer(params.body)

  await new Promise((resolve, reject) => {
    cos.putObject(
      {
        Bucket: COS_BUCKET,
        Region: COS_REGION,
        Key,
        Body,
        ContentLength: Body.length,
        ContentType: params.contentType,
        ACL: 'public-read',
      },
      (err) => {
        if (err) return reject(err)
        resolve(null)
      }
    )
  })

  return { key: Key, url: buildPublicUrl(Key) }
}

export async function listCosObjects(prefix: string, maxKeys = 1000) {
  const Prefix = prefix.replace(/^\/+/, '')
  const data = await new Promise<any>((resolve, reject) => {
    cos.getBucket(
      {
        Bucket: COS_BUCKET,
        Region: COS_REGION,
        Prefix,
        MaxKeys: maxKeys,
      },
      (err, result) => {
        if (err) return reject(err)
        resolve(result)
      }
    )
  })
  return data
}

export async function deleteCosObjects(keys: string[]) {
  if (!keys.length) return
  await new Promise((resolve, reject) => {
    cos.deleteMultipleObject(
      {
        Bucket: COS_BUCKET,
        Region: COS_REGION,
        Objects: keys.map((Key) => ({ Key })),
      },
      (err) => {
        if (err) return reject(err)
        resolve(null)
      }
    )
  })
}
