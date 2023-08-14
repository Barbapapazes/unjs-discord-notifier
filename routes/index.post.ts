export default defineEventHandler(async (event) => {
  const body = await readBody<GitHubWebookRelease>(event)

  if (body.action === 'published') {
    // Add more filters for our use case.
    const releaseId = body.release.id
    const publishedAt = body.release.published_at
    const key = `${releaseId}-${publishedAt}`

    await useStorage('cache').setItem(key, JSON.stringify(body))

    setResponseStatus(event, 201)
  }
})

interface GitHubWebookRelease {
  action: 'published'
  release: {
    id: string
    html_url: string
    body: string
    published_at: string
  }
}

const splitId = /^(?<id>\d{9})-(?<publishedAt>.*)$/
// We wait 15 minutes before sending the notification.
// const waitingTime = 15 * 60 * 1000
const waitingTime = 60 * 1000

/**
 * @see https://developers.cloudflare.com/workers/runtime-apis/scheduled-event/#syntax
 */
// @ts-expect-error Next line is not working.
addEventListener('scheduled', (event: ScheduledEvent) => {
  event.waitUntil((async () => {
    const keys = await useStorage('cache').getKeys()

    for (const key of keys) {
      const match = key.match(splitId)
      const date = new Date(match?.groups?.publishedAt ?? '')

      if (date.getTime() + waitingTime < Date.now()) {
        const body = await useStorage('cache').getItem(key) as string

        // Send the notification.
        await $fetch('<discord-web-hook>', {
          method: 'POST',
          body,
          headers: {
            'Content-Type': 'application/json',
            'X-GitHub-Event': 'release',
          },
        }).catch((error) => {
          console.error(error)
        })

        // Remove the item from the cache.
        await useStorage('cache').removeItem(key)
      }
    }
  })())
})

interface ScheduledEvent {
  cron: string
  type: 'scheduled'
  scheduledTime: string
  env: { [key: string]: string }
  waitUntil: (promise: Promise<void>) => void
}
