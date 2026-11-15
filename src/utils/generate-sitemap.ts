import { SitemapStream, streamToPromise } from 'sitemap'
import fs from 'fs'
import path from 'path'

/** 静态路由表项（只用到这两列，不做宽泛 any）。 */
interface SitemapRoute {
  path?: string
  meta?: { noSitemap?: boolean }
}

const hostname = 'https://craft.luminolsuki.moe/'

const routes = [
  {
    path: '/',
    meta: {
      noSitemap: false
    }
  },
  {
    path: '/SimpleRules',
    meta: {
      noSitemap: false
    }
  },
  {
    path: '/Support',
    meta: {
      noSitemap: false
    }
  },
  {
    path: '/news',
    meta: {
      noSitemap: false
    }
  },
  {
    path: '/news/archive',
    meta: {
      noSitemap: false
    }
  },
  {
    path: '/Monitoring',
    meta: {
      noSitemap: false
    }
  },
  {
    path: '/:pathMatch(.*)*',
    meta: {
      noSitemap: true
    }
  }
]

async function generate() {
  const sitemap = new SitemapStream({ hostname })

  routes.forEach((route: SitemapRoute) => {
    if (!route.meta?.noSitemap && route.path) {
      const priority = route.path === '/' ? 1.0 : 0.7
      const changefreq = route.path === '/' ? 'daily' : 'weekly'
      
      sitemap.write({
        url: route.path,
        changefreq,
        priority
      })
    }
  })

  sitemap.end()

  const xml = await streamToPromise(sitemap)

  const outputPath = path.resolve('dist/sitemap.xml')
  fs.writeFileSync(outputPath, xml.toString(), 'utf-8')
  
  console.log('Sitemap generated successfully!')
}

generate()
