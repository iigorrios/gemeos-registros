/**
 * Porteiro do app: senha única, checada no edge da Vercel.
 *
 * Roda ANTES de qualquer arquivo ser servido — inclusive o JS do bundle, que é
 * onde mora a anon key do Supabase. Sem o cookie válido nada sai daqui, então a
 * chave não fica acessível para quem não tem a senha.
 *
 * A senha vem de APP_PASSWORD (sem prefixo VITE_, logo nunca entra no bundle).
 * Ela também é a chave que assina o cookie: trocar a senha na Vercel derruba
 * todas as sessões abertas automaticamente.
 */
import { next } from '@vercel/functions'

export const config = {
  runtime: 'edge',
  // Tudo passa pelo porteiro, menos os endpoints internos da Vercel.
  matcher: '/((?!_vercel/).*)',
}

const COOKIE = 'nb_sessao'
const LOGIN_PATH = '/__entrar'
const LOGOUT_PATH = '/__sair'
const SESSION_DAYS = 30

export default async function middleware(request: Request): Promise<Response> {
  const password = process.env.APP_PASSWORD
  const url = new URL(request.url)

  // Sem senha configurada o app fica fechado, nunca aberto: um site trancado
  // se resolve com um redeploy, um banco exposto não se desfaz.
  if (!password) return notConfiguredPage()

  if (url.pathname === LOGOUT_PATH) return logoutPage()

  if (url.pathname === LOGIN_PATH && request.method === 'POST') {
    return handleLogin(request, password)
  }

  const token = readCookie(request, COOKIE)
  if (token && (await verifyToken(token, password))) return next()

  return loginPage({ destino: url.pathname + url.search })
}

async function handleLogin(request: Request, password: string): Promise<Response> {
  const form = await request.formData()
  const enviada = String(form.get('senha') ?? '')
  const destino = safePath(String(form.get('destino') ?? '/'))

  if (!(await equalsConstantTime(enviada, password))) {
    // Freia tentativa em série; a defesa de verdade é uma senha longa.
    await new Promise((resolve) => setTimeout(resolve, 600))
    return loginPage({ destino, erro: 'Senha incorreta.', status: 401 })
  }

  const maxAge = SESSION_DAYS * 24 * 60 * 60
  return new Response(null, {
    status: 303,
    headers: {
      Location: destino,
      'Set-Cookie': `${COOKIE}=${await createToken(password, maxAge)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`,
      'Cache-Control': 'no-store',
    },
  })
}

/* ── Cookie assinado ─────────────────────────────────────────────── */

/** Token `<expiração>.<HMAC-SHA256(senha, expiração)>`. */
async function createToken(password: string, maxAgeSeconds: number): Promise<string> {
  const exp = Date.now() + maxAgeSeconds * 1000
  return `${exp}.${base64url(await hmac(password, String(exp)))}`
}

async function verifyToken(token: string, password: string): Promise<boolean> {
  const dot = token.indexOf('.')
  if (dot < 1) return false

  const exp = Number(token.slice(0, dot))
  if (!Number.isFinite(exp) || exp < Date.now()) return false

  const esperado = base64url(await hmac(password, String(exp)))
  return equalsConstantTime(token.slice(dot + 1), esperado)
}

async function hmac(key: string, data: string): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data)))
}

/**
 * Compara sem vazar o tamanho nem a posição do primeiro caractere diferente:
 * o digest tem sempre 32 bytes, independente do que entrou.
 */
async function equalsConstantTime(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder()
  const [da, db] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ])
  const va = new Uint8Array(da)
  const vb = new Uint8Array(db)
  let diff = 0
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i]
  return diff === 0
}

function base64url(bytes: Uint8Array): string {
  let bin = ''
  for (const byte of bytes) bin += String.fromCharCode(byte)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq > 0 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim()
  }
  return null
}

/** Evita open redirect: só caminho interno, nunca `//host` ou URL absoluta. */
function safePath(raw: string): string {
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  if (raw.startsWith(LOGIN_PATH) || raw.startsWith(LOGOUT_PATH)) return '/'
  return raw
}

/* ── Páginas ─────────────────────────────────────────────────────── */

const HTML_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
}

function loginPage({
  destino,
  erro,
  status = 200,
}: {
  destino: string
  erro?: string
  status?: number
}): Response {
  return new Response(shell({ destino, erro }), { status, headers: HTML_HEADERS })
}

/**
 * Apagar o cookie não basta num app instalado: o service worker ainda serviria
 * o app do cache (com a anon key junto). Aqui o cookie cai e o cache vai junto.
 */
function logoutPage(): Response {
  return new Response(
    page(
      'Saindo…',
      `<p class="msg">Encerrando a sessão neste aparelho…</p>
       <script>
         (async () => {
           try {
             const regs = await navigator.serviceWorker?.getRegistrations() ?? []
             await Promise.all(regs.map((r) => r.unregister()))
             const keys = await caches?.keys() ?? []
             await Promise.all(keys.map((k) => caches.delete(k)))
           } catch (e) {}
           location.replace('/')
         })()
       </script>
       <noscript><p class="msg"><a href="/">Voltar</a></p></noscript>`,
    ),
    {
      status: 200,
      headers: {
        ...HTML_HEADERS,
        'Set-Cookie': `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      },
    },
  )
}

function notConfiguredPage(): Response {
  return new Response(
    page(
      'Falta configurar a senha',
      `<p class="msg">A variável de ambiente <code>APP_PASSWORD</code> não está definida neste projeto.</p>
       <p class="msg">Cadastre-a em <strong>Vercel → Project Settings → Environment Variables</strong>
       e faça um novo deploy. Até lá o app fica fechado.</p>`,
    ),
    { status: 503, headers: HTML_HEADERS },
  )
}

function shell({ destino, erro }: { destino: string; erro?: string }): string {
  return page(
    'Nossos Bebês',
    `<p class="msg">Esta página é particular. Digite a senha para continuar.</p>
     <form method="POST" action="${LOGIN_PATH}">
       <input type="hidden" name="destino" value="${escapeHtml(destino)}" />
       <input
         type="password"
         name="senha"
         placeholder="Senha"
         aria-label="Senha"
         autocomplete="current-password"
         autofocus
         required
       />
       ${erro ? `<p class="erro">${escapeHtml(erro)}</p>` : ''}
       <button type="submit">Entrar</button>
     </form>`,
  )
}

/** Página completa e autossuficiente — nada aqui depende do bundle do app. */
function page(titulo: string, conteudo: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="robots" content="noindex, nofollow" />
<meta name="theme-color" content="#fff5f8" />
<title>${escapeHtml(titulo)}</title>
<style>
  :root {
    color-scheme: light dark;
    --canvas: #fff5f8; --surface: #fff; --ink: #0f172a; --soft: #64748b;
    --line: #f1e6ec; --field: #fdf2f6; --accent: #3b82f6;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --canvas: #0a0e17; --surface: #141a26; --ink: #e8eef8; --soft: #94a3b8;
      --line: #25304a; --field: #1c2433;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100dvh; display: grid; place-items: center; padding: 24px;
    background: radial-gradient(120% 60% at 50% 0%, var(--field) 0%, var(--canvas) 60%);
    color: var(--ink);
    font: 16px/1.5 Nunito, ui-rounded, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .card {
    width: 100%; max-width: 380px; background: var(--surface); border: 1px solid var(--line);
    border-radius: 28px; padding: 32px 28px; text-align: center;
    box-shadow: 0 8px 30px -8px rgb(15 23 42 / 0.18);
  }
  h1 { margin: 18px 0 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
  .msg { margin: 10px 0 0; color: var(--soft); font-size: 15px; }
  form { margin-top: 22px; display: grid; gap: 12px; }
  input {
    width: 100%; padding: 14px 16px; font: inherit; color: var(--ink);
    background: var(--field); border: 1px solid var(--line); border-radius: 16px; outline: none;
  }
  input:focus { border-color: transparent; box-shadow: 0 0 0 3px rgb(59 130 246 / 0.45); }
  button {
    padding: 14px 16px; font: inherit; font-weight: 800; color: #fff;
    background: var(--accent); border: 0; border-radius: 16px; cursor: pointer;
  }
  button:active { transform: scale(0.98); }
  .erro { margin: 0; color: #e11d48; font-size: 14px; font-weight: 700; }
  code { background: var(--field); padding: 2px 6px; border-radius: 6px; font-size: 14px; }
</style>
</head>
<body>
  <main class="card">
    <svg width="120" height="64" viewBox="0 0 120 64" aria-hidden="true">
      <g transform="translate(6 4)">
        <circle cx="30" cy="34" r="22" fill="#ffe0cc"/>
        <path d="M8 32a22 22 0 0 1 44 0c0 1.5-.2 3-.6 4.4C49.4 28.4 40.8 23 30 23S10.6 28.4 8.6 36.4A22 22 0 0 1 8 32Z" fill="#7cb2f0"/>
        <circle cx="30" cy="7" r="3.4" fill="#4f8fe0"/>
        <circle cx="22" cy="35" r="2.6" fill="#33404f"/><circle cx="38" cy="35" r="2.6" fill="#33404f"/>
        <path d="M25.5 43.5c1.3 1.8 3 2.7 4.5 2.7s3.2-.9 4.5-2.7" fill="none" stroke="#33404f" stroke-width="2.2" stroke-linecap="round"/>
      </g>
      <g transform="translate(52 4)">
        <circle cx="30" cy="34" r="22" fill="#ffe0cc"/>
        <path d="M8 32a22 22 0 0 1 44 0c0 1.5-.2 3-.6 4.4C49.4 28.4 40.8 23 30 23S10.6 28.4 8.6 36.4A22 22 0 0 1 8 32Z" fill="#f9a8d4"/>
        <circle cx="47" cy="18" r="4.2" fill="#f472b6"/>
        <circle cx="22" cy="35" r="2.6" fill="#33404f"/><circle cx="38" cy="35" r="2.6" fill="#33404f"/>
        <path d="M25.5 43.5c1.3 1.8 3 2.7 4.5 2.7s3.2-.9 4.5-2.7" fill="none" stroke="#33404f" stroke-width="2.2" stroke-linecap="round"/>
      </g>
    </svg>
    <h1>Nossos Bebês</h1>
    ${conteudo}
  </main>
</body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
