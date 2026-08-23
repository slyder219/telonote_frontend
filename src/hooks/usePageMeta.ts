import { useEffect } from 'react'

export function usePageMeta(title: string, options: { noindex?: boolean } = {}) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = title

    let metaRobots: HTMLMetaElement | null = null
    if (options.noindex) {
      metaRobots = document.createElement('meta')
      metaRobots.name = 'robots'
      metaRobots.content = 'noindex, nofollow'
      document.head.appendChild(metaRobots)
    }

    return () => {
      document.title = previousTitle
      if (metaRobots) document.head.removeChild(metaRobots)
    }
  }, [title, options.noindex])
}
