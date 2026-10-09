import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'

test('production assets and hash reload work under a repository subpath', async ({ page }) => {
  const root = path.resolve('dist')
  const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://localhost')
      if (!url.pathname.startsWith('/roam/')) throw new Error('Outside repository prefix')
      const file = path.resolve(root, url.pathname.slice('/roam/'.length) || 'index.html')
      if (!file.startsWith(`${root}/`)) throw new Error('Outside build')
      response.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream')
      response.end(await readFile(file))
    } catch { response.writeHead(404).end() }
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Missing test server address')
    await page.goto(`http://127.0.0.1:${address.port}/roam/#profile`)
    await expect(page.getByLabel('Display name')).toBeVisible()
    await expect(page.getByRole('navigation')).toHaveCSS('position', 'fixed')
    await page.reload()
    await expect(page.getByRole('heading', { name: 'A personal touch.' })).toBeVisible()
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) }
})
