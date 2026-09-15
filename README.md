# Nossos Bebês

App web (PWA) para acompanhar a rotina do Léo e da Clara: amamentação, fraldas,
medicamentos, sono, medidas de crescimento e anotações.

Os dados vivem no Supabase e chegam por **dois caminhos**: por este app e pelo
fluxo do n8n que lê o grupo de WhatsApp da família. As telas usam Supabase
Realtime, então um registro feito no WhatsApp aparece aqui sem precisar de
refresh — e vice-versa.

## Stack

React + Vite + TypeScript · Tailwind CSS · Supabase (Postgres, Realtime,
Storage) · React Router · Recharts · vite-plugin-pwa · deploy na Vercel.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha as duas variáveis
npm run dev
```

### Variáveis de ambiente

| Variável                 | Onde encontrar                                   |
| ------------------------ | ------------------------------------------------ |
| `VITE_SUPABASE_URL`      | Supabase → Project Settings → API → Project URL   |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → chave `anon`  |
| `APP_PASSWORD`           | Senha única do app — você escolhe                 |

As duas primeiras são lidas via `import.meta.env` e nunca ficam escritas no
código; sem elas o app falha logo no start, com mensagem explicando o que
faltou. A terceira **não** tem prefixo `VITE_` de propósito: é isso que garante
que ela fique só no servidor e nunca entre no bundle.

O `npm run dev` do Vite **não executa o middleware**, então localmente não há
tela de senha. Para testar o porteiro, use `npx vercel dev`.

## Deploy na Vercel

Build padrão do Vite — nada de especial a configurar:

- **Build Command:** `npm run build` · **Output:** `dist`
- Cadastre as três variáveis acima em **Project Settings → Environment
  Variables** (Production, Preview e Development). As `VITE_*` entram no bundle
  **em tempo de build**: depois de alterá-las é preciso refazer o deploy.
  `APP_PASSWORD` é lida a cada requisição, mas mudá-la derruba as sessões
  abertas — é só entrar de novo com a senha nova.
- O [`vercel.json`](vercel.json) já traz o fallback de SPA (toda rota que não é
  arquivo cai em `index.html`, para `/historico` funcionar em acesso direto) e
  o cabeçalho que impede o `sw.js` de ficar preso em cache.

## PWA

Instalável no Android e no iOS ("adicionar à tela inicial"), abrindo sem a barra
de endereço (`display: standalone`, retrato).

- **Cache:** `NetworkFirst` para tudo que vem do Supabase — os dados mudam o
  tempo todo e vêm de duas fontes, então cache velho nunca deve mascarar o
  estado real. O app shell (JS/CSS/ícones/fontes) é `CacheFirst` via precache.
- **Offline:** o shell abre, mas não dá para salvar. O app avisa com um banner
  no topo e bloqueia o botão de salvar em vez de perder o registro em silêncio.
- **Ícones — placeholder:** os PNGs em [`public/icons/`](public/icons/) são
  gerados por [`scripts/generate-icons.mjs`](scripts/generate-icons.mjs) (os dois
  bebês + coração, inspirados no logo do mockup). Para usar um ícone próprio,
  substitua os arquivos daquela pasta (192, 512 e as versões `maskable`) ou
  edite o desenho no script e rode `npm run icons`.

## Fuso horário

Todo `timestamptz` do banco está em **UTC**; os horários reais são sempre de
**Brasília (America/Sao_Paulo)**. A conversão nos dois sentidos fica isolada em
[`src/lib/time.ts`](src/lib/time.ts), com `date-fns-tz` — o fuso do navegador
nunca é usado, então o app mostra o horário certo mesmo em outro fuso.

## Estrutura

```
middleware.ts  porteiro: senha única conferida no edge da Vercel
src/
  lib/        supabase, tipos, fuso horário, acesso a dados, cores por evento
  context/    tema, bebê selecionado, formulários, toasts
  hooks/      Realtime, carregamento assíncrono, online/offline
  components/ layout, ícones, formulário de registro, primitivos de UI
  pages/      Splash · Seleção · Hoje · Histórico · Relatórios · Mais
```

Registros criados pelo app **não** preenchem `raw_message_id` — essa coluna é
exclusiva do que vem do WhatsApp, e é o que desenha o selo verde no histórico.

## Banco de dados

O app usa as tabelas `gemeos_*` que já existiam. Foi preciso completar o que
faltava para as telas pedidas (migração `gemeos_app_schema_rls_realtime`):

- `gemeos_babies.photo_url` (foto de perfil);
- `gemeos_babies.birth_date` (`date`, sem fuso) — base do tempo de vida
  mostrado na Home e no perfil;
- `gemeos_feedings.breast_side` (`esquerdo` | `direito` | `ambos`), preenchida
  só quando `method = 'seio'`. Sem `CHECK`, igual às colunas irmãs `method` e
  `type`, para não quebrar o n8n se ele gravar outro rótulo — **se quiser que o
  WhatsApp também registre o lado, é essa coluna que o fluxo precisa preencher**;
- tabelas `gemeos_growth_measurements` e `gemeos_health_notes`;
- índices por `(baby_id, data)`;
- **policies de RLS** para a role `anon` — sem elas a anon key não lia nem
  escrevia nada (veja o aviso de segurança abaixo);
- as sete tabelas na publicação `supabase_realtime`, com `replica identity full`;
- bucket público `gemeos-fotos` para as fotos de perfil.

## Segurança — senha única no edge

[`middleware.ts`](middleware.ts) é um **Vercel Routing Middleware**: roda no edge
**antes do cache e antes de qualquer arquivo ser servido**. Sem cookie válido,
nada sai — nem o HTML, nem o JS do bundle, que é justamente onde mora a anon key
do Supabase. Não é uma tela de senha em JavaScript (essa não esconderia nada,
porque o bundle já teria sido baixado).

Como funciona:

- a senha vem de `APP_PASSWORD`, sem prefixo `VITE_`, então nunca entra no bundle;
- ela também assina o cookie de sessão (HMAC-SHA256), o que dá de graça uma
  propriedade útil: **trocar a senha na Vercel derruba todas as sessões**;
- o cookie é `HttpOnly`, `Secure`, `SameSite=Lax`, dura 30 dias e não carrega a
  senha dentro;
- a comparação da senha é em tempo constante (compara digests, não strings);
- se `APP_PASSWORD` não estiver definida, o app fica **fechado**, não aberto — um
  site trancado se resolve com um redeploy, um banco exposto não se desfaz;
- **Mais → Sair** (`/__sair`) apaga o cookie e também desregistra o service
  worker e limpa os caches — num app já instalado, só apagar o cookie não
  adiantaria, porque o app continuaria abrindo do cache.

Uma exceção fica de fora do porteiro, de propósito: `manifest.webmanifest` e
`/icons/*`. O Chrome busca o manifest com os cookies **omitidos**, então atrás
da senha ele recebia a tela de login no lugar do JSON, concluía que não havia
manifest válido e **recusava instalar o app**. O que fica público aí é o nome do
app, as cores e os desenhos dos ícones — nenhum dado dos bebês e nenhum pedaço
do bundle, que é onde a anon key mora.

### O que isso resolve e o que não resolve

Resolve o problema principal: a anon key deixa de estar publicada num endereço
adivinhável. Quem não tem a senha não consegue nem baixar o arquivo onde ela
está.

O que continua valendo a pena saber:

- **a chave ainda existe dentro do bundle.** Quem tem a senha (vocês dois) pode
  extraí-la do JS e falar direto com o Supabase, sem passar pelo porteiro. Para
  duas pessoas de confiança, tudo bem — mas se a chave vazar por outro caminho, o
  banco volta a ficar aberto, porque as policies de RLS liberam tudo para `anon`.
- **não há bloqueio por tentativas.** O edge é distribuído e sem estado
  compartilhado; há só um atraso de 600 ms a cada erro. A defesa real é o
  tamanho da senha — use algo longo, não uma palavra só.
- **num aparelho já autenticado, o app continua abrindo do cache** mesmo depois
  do cookie expirar. É o preço de ser instalável e funcionar offline. Use
  **Sair** quando quiser realmente trancar aquele aparelho.

Se um dia quiser fechar o último buraco (a chave dentro do bundle), o caminho é
**Supabase Auth** com Magic Link, trocando as policies de `anon` para
`authenticated` — aí a autorização passa a valer no banco, não só na porta.
