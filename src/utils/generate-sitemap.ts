import { SitemapStream, streamToPromise } from 'sitemap'
import fs from 'fs'
import path from 'path'

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
    path: '/News',
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

  routes.forEach((route: any) => {
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
