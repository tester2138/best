import type { ActionResult } from '@/types/portal'

export type EditorialImageUpload = {
  url: string
  pathname: string
}

export async function uploadEditorialImage(file: File): Promise<ActionResult<EditorialImageUpload>> {
  const formData = new FormData()
  formData.set('file', file)

  try {
    const response = await fetch('/api/admin/editorial-media', {
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
    })
    const result = (await response.json().catch(() => null)) as ActionResult<EditorialImageUpload> | null

    if (result && !result.ok) return result
    if (
      !response.ok ||
      !result?.ok ||
      !result.data ||
      typeof result.data.url !== 'string' ||
      typeof result.data.pathname !== 'string'
    ) {
      return { ok: false, error: 'The image could not be uploaded. Please try again.', code: 'server' }
    }

    return { ok: true, data: { url: result.data.url, pathname: result.data.pathname } }
  } catch {
    return { ok: false, error: 'The upload service could not be reached. Please try again.', code: 'server' }
  }
}

