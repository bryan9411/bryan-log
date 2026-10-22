-- =============================================================================
-- Bryan Log 種子資料（由 scripts/seed/generate.ts 自動產生，請勿手動修改）
-- 重新產生：pnpm db:seed:generate
-- 須先執行 supabase_schema.sql；可重複執行，已存在的資料會略過
-- =============================================================================

begin;

-- post 父分類
insert into public.categories (type, parent_id, name, slug, description, sort_order) values
  ('post', null, '前端開發', 'frontend', 'React、Next.js 與現代 CSS 的實戰筆記', 0),
  ('post', null, '後端與資料庫', 'backend', 'Node.js 服務設計與 PostgreSQL 資料建模', 1),
  ('post', null, '雲端與 DevOps', 'devops', '容器化、持續整合與部署流程最佳化', 2),
  ('post', null, '資訊安全', 'security', 'Web 應用程式的防禦性設計與攻擊手法解析', 3)
on conflict (type, slug) do nothing;

-- post 子分類
insert into public.categories (type, parent_id, name, slug, description, sort_order) values
  ('post', (select id from public.categories where type = 'post' and slug = 'frontend'), 'React', 'react', null, 0),
  ('post', (select id from public.categories where type = 'post' and slug = 'frontend'), 'Next.js', 'nextjs', null, 1),
  ('post', (select id from public.categories where type = 'post' and slug = 'frontend'), 'CSS 與設計系統', 'css', null, 2),
  ('post', (select id from public.categories where type = 'post' and slug = 'backend'), 'PostgreSQL', 'postgresql', null, 0),
  ('post', (select id from public.categories where type = 'post' and slug = 'backend'), 'Node.js', 'nodejs', null, 1),
  ('post', (select id from public.categories where type = 'post' and slug = 'devops'), 'Docker 與容器', 'docker', null, 0),
  ('post', (select id from public.categories where type = 'post' and slug = 'devops'), 'CI/CD 自動化', 'ci-cd', null, 1),
  ('post', (select id from public.categories where type = 'post' and slug = 'security'), 'Web 安全', 'web-security', null, 0)
on conflict (type, slug) do nothing;

-- project 父分類
insert into public.categories (type, parent_id, name, slug, description, sort_order) values
  ('project', null, '網頁應用', 'web-apps', '從需求訪談到上線維運的完整產品', 0),
  ('project', null, '開發工具', 'dev-tools', '提升團隊開發體驗的工具與套件', 1)
on conflict (type, slug) do nothing;

-- project 子分類
insert into public.categories (type, parent_id, name, slug, description, sort_order) values
  ('project', (select id from public.categories where type = 'project' and slug = 'web-apps'), '全端應用', 'fullstack', null, 0),
  ('project', (select id from public.categories where type = 'project' and slug = 'web-apps'), 'SaaS 服務', 'saas', null, 1),
  ('project', (select id from public.categories where type = 'project' and slug = 'dev-tools'), '開源套件', 'open-source', null, 0),
  ('project', (select id from public.categories where type = 'project' and slug = 'dev-tools'), '命令列工具', 'cli', null, 1)
on conflict (type, slug) do nothing;

-- 技術文章
insert into public.posts (title, slug, excerpt, category_id, content_json, content_html, status, reading_time_minutes, view_count, published_at) values
  (
    'React 19 useActionState 完全指南：告別手刻表單狀態',
    'react-19-use-action-state',
    '從 useFormState 改名到 useActionState，一次搞懂 pending 狀態、錯誤回傳與漸進式增強的正確寫法。',
    (select id from public.categories where type = 'post' and slug = 'react'),
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"過去處理表單送出，我們總要自己維護 "},{"type":"text","text":"isLoading","marks":[{"type":"code"}]},{"type":"text","text":"、"},{"type":"text","text":"error","marks":[{"type":"code"}]},{"type":"text","text":"、"},{"type":"text","text":"data","marks":[{"type":"code"}]},{"type":"text","text":" 三個狀態，再用 "},{"type":"text","text":"try/catch","marks":[{"type":"code"}]},{"type":"text","text":" 包住 "},{"type":"text","text":"fetch","marks":[{"type":"code"}]},{"type":"text","text":"。React 19 推出的 "},{"type":"text","text":"useActionState","marks":[{"type":"code"}]},{"type":"text","text":" 把這套樣板收斂成一個 Hook，讓表單邏輯回歸宣告式。"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"基本用法"}]},{"type":"paragraph","content":[{"type":"text","text":"useActionState","marks":[{"type":"code"}]},{"type":"text","text":" 接收一個 action 函式與初始狀態，回傳目前狀態、包裝後的 action，以及 "},{"type":"text","text":"pending","marks":[{"type":"bold"}]},{"type":"text","text":" 旗標。"}]},{"type":"codeBlock","attrs":{"language":"tsx"},"content":[{"type":"text","text":"\"use client\"\n\nimport { useActionState } from \"react\"\nimport { subscribe } from \"./actions\"\n\ntype FormState = { message: string | null }\n\nconst initialState: FormState = { message: null }\n\nexport function SubscribeForm() {\n  const [state, formAction, isPending] = useActionState(subscribe, initialState)\n\n  return (\n    <form action={formAction}>\n      <input name=\"email\" type=\"email\" required />\n      <button disabled={isPending}>{isPending ? \"送出中…\" : \"訂閱電子報\"}</button>\n      {state.message && <p role=\"alert\">{state.message}</p>}\n    </form>\n  )\n}"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"搭配 Server Action 回傳驗證錯誤"}]},{"type":"paragraph","content":[{"type":"text","text":"Server Action 的第一個參數是上一次的狀態，第二個才是 "},{"type":"text","text":"FormData","marks":[{"type":"code"}]},{"type":"text","text":"。回傳值會直接成為下一次渲染的 "},{"type":"text","text":"state","marks":[{"type":"code"}]},{"type":"text","text":"，非常適合放 Zod 驗證後的錯誤訊息。"}]},{"type":"codeBlock","attrs":{"language":"ts"},"content":[{"type":"text","text":"\"use server\"\n\nimport { z } from \"zod\"\n\nconst schema = z.object({ email: z.email(\"請輸入有效的電子郵件\") })\n\nexport async function subscribe(_prev: { message: string | null }, formData: FormData) {\n  const result = schema.safeParse({ email: formData.get(\"email\") })\n\n  if (!result.success) {\n    return { message: result.error.issues[0].message }\n  }\n\n  return { message: \"訂閱成功，感謝你的支持！\" }\n}"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"實務提醒"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"子元件若需要讀取 pending 狀態，改用 "},{"type":"text","text":"useFormStatus","marks":[{"type":"code"}]},{"type":"text","text":" 避免層層傳遞 props"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"action 在 JavaScript 載入前也能運作，記得伺服器端一定要再驗證一次"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"回傳的狀態物件需可序列化，不要放 "},{"type":"text","text":"Date","marks":[{"type":"code"}]},{"type":"text","text":" 或函式"}]}]}]}]}'::jsonb,
    '<p>過去處理表單送出，我們總要自己維護 <code>isLoading</code>、<code>error</code>、<code>data</code> 三個狀態，再用 <code>try/catch</code> 包住 <code>fetch</code>。React 19 推出的 <code>useActionState</code> 把這套樣板收斂成一個 Hook，讓表單邏輯回歸宣告式。</p><h2>基本用法</h2><p><code>useActionState</code> 接收一個 action 函式與初始狀態，回傳目前狀態、包裝後的 action，以及 <strong>pending</strong> 旗標。</p><pre><code class="language-tsx">&quot;use client&quot;

import { useActionState } from &quot;react&quot;
import { subscribe } from &quot;./actions&quot;

type FormState = { message: string | null }

const initialState: FormState = { message: null }

export function SubscribeForm() {
  const [state, formAction, isPending] = useActionState(subscribe, initialState)

  return (
    &lt;form action={formAction}&gt;
      &lt;input name=&quot;email&quot; type=&quot;email&quot; required /&gt;
      &lt;button disabled={isPending}&gt;{isPending ? &quot;送出中…&quot; : &quot;訂閱電子報&quot;}&lt;/button&gt;
      {state.message &amp;&amp; &lt;p role=&quot;alert&quot;&gt;{state.message}&lt;/p&gt;}
    &lt;/form&gt;
  )
}</code></pre><h2>搭配 Server Action 回傳驗證錯誤</h2><p>Server Action 的第一個參數是上一次的狀態，第二個才是 <code>FormData</code>。回傳值會直接成為下一次渲染的 <code>state</code>，非常適合放 Zod 驗證後的錯誤訊息。</p><pre><code class="language-ts">&quot;use server&quot;

import { z } from &quot;zod&quot;

const schema = z.object({ email: z.email(&quot;請輸入有效的電子郵件&quot;) })

export async function subscribe(_prev: { message: string | null }, formData: FormData) {
  const result = schema.safeParse({ email: formData.get(&quot;email&quot;) })

  if (!result.success) {
    return { message: result.error.issues[0].message }
  }

  return { message: &quot;訂閱成功，感謝你的支持！&quot; }
}</code></pre><h2>實務提醒</h2><ul><li><p>子元件若需要讀取 pending 狀態，改用 <code>useFormStatus</code> 避免層層傳遞 props</p></li><li><p>action 在 JavaScript 載入前也能運作，記得伺服器端一定要再驗證一次</p></li><li><p>回傳的狀態物件需可序列化，不要放 <code>Date</code> 或函式</p></li></ul>',
    'published',
    4,
    3239,
    '2026-01-08T01:00:00.000Z'::timestamptz
  ),
  (
    '深入理解 React Server Components 的心智模型',
    'react-server-components-mental-model',
    'Server Component 不是 SSR 的新名字。本文用「兩個模組圖」的觀點，釐清 use client 邊界與資料流向。',
    (select id from public.categories where type = 'post' and slug = 'react'),
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"許多人初學 RSC 時會把它和傳統 SSR 混為一談。其實 SSR 解決的是「首屏 HTML」，而 RSC 解決的是「哪些程式碼根本不需要送到瀏覽器」。"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"兩張模組圖"}]},{"type":"paragraph","content":[{"type":"text","text":"可以把應用想像成兩張模組圖：伺服器圖與客戶端圖。"},{"type":"text","text":"\"use client\"","marks":[{"type":"code"}]},{"type":"text","text":" 是兩張圖之間的"},{"type":"text","text":"單向門","marks":[{"type":"bold"}]},{"type":"text","text":"，門後的模組與其所有依賴都會被打包進瀏覽器。"}]},{"type":"codeBlock","attrs":{"language":"tsx"},"content":[{"type":"text","text":"// app/posts/page.tsx — Server Component，可直接存取資料庫\nimport { LikeButton } from \"./like-button\"\nimport { getPosts } from \"@/lib/posts\"\n\nexport default async function PostsPage() {\n  const posts = await getPosts()\n\n  return posts.map((post) => (\n    <article key={post.id}>\n      <h2>{post.title}</h2>\n      <LikeButton postId={post.id} />\n    </article>\n  ))\n}"}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"props 必須可序列化"}]},{"type":"paragraph","content":[{"type":"text","text":"跨越邊界的 props 會被序列化成 RSC Payload，因此不能傳遞函式（Server Action 除外）、類別實例或 Symbol。"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"把 use client 往葉節點推"}]},{"type":"paragraph","content":[{"type":"text","text":"越早宣告 "},{"type":"text","text":"use client","marks":[{"type":"code"}]},{"type":"text","text":"，被迫進入客戶端的程式碼就越多。最佳實踐是只在真正需要互動的最小元件上標記，讓版面、資料取得都留在伺服器。"}]},{"type":"blockquote","content":[{"type":"paragraph","content":[{"type":"text","text":"Server Component 預設，Client Component 例外——這是 App Router 時代最重要的一條原則。"}]}]}]}'::jsonb,
    '<p>許多人初學 RSC 時會把它和傳統 SSR 混為一談。其實 SSR 解決的是「首屏 HTML」，而 RSC 解決的是「哪些程式碼根本不需要送到瀏覽器」。</p><h2>兩張模組圖</h2><p>可以把應用想像成兩張模組圖：伺服器圖與客戶端圖。<code>&quot;use client&quot;</code> 是兩張圖之間的<strong>單向門</strong>，門後的模組與其所有依賴都會被打包進瀏覽器。</p><pre><code class="language-tsx">// app/posts/page.tsx — Server Component，可直接存取資料庫
import { LikeButton } from &quot;./like-button&quot;
import { getPosts } from &quot;@/lib/posts&quot;

export default async function PostsPage() {
  const posts = await getPosts()

  return posts.map((post) =&gt; (
    &lt;article key={post.id}&gt;
      &lt;h2&gt;{post.title}&lt;/h2&gt;
      &lt;LikeButton postId={post.id} /&gt;
    &lt;/article&gt;
  ))
}</code></pre><h3>props 必須可序列化</h3><p>跨越邊界的 props 會被序列化成 RSC Payload，因此不能傳遞函式（Server Action 除外）、類別實例或 Symbol。</p><h2>把 use client 往葉節點推</h2><p>越早宣告 <code>use client</code>，被迫進入客戶端的程式碼就越多。最佳實踐是只在真正需要互動的最小元件上標記，讓版面、資料取得都留在伺服器。</p><blockquote><p>Server Component 預設，Client Component 例外——這是 App Router 時代最重要的一條原則。</p></blockquote>',
    'published',
    3,
    1558,
    '2026-01-22T01:00:00.000Z'::timestamptz
  ),
  (
    '用 @tanstack/react-virtual 打造萬筆資料的流暢清單',
    'tanstack-virtual-list-performance',
    'DOM 節點數量決定捲動效能。示範如何只渲染可視範圍內的卡片，讓一萬筆資料也能維持 60fps。',
    (select id from public.categories where type = 'post' and slug = 'react'),
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"當清單超過數百筆，瀏覽器的排版與繪製成本會線性上升。虛擬滾動的核心概念很簡單："},{"type":"text","text":"只渲染看得到的項目","marks":[{"type":"bold"}]},{"type":"text","text":"，其餘用一個撐高的容器假裝存在。"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"最小可行範例"}]},{"type":"codeBlock","attrs":{"language":"tsx"},"content":[{"type":"text","text":"\"use client\"\n\nimport { useRef } from \"react\"\nimport { useVirtualizer } from \"@tanstack/react-virtual\"\n\nexport function VirtualList({ items }: { items: string[] }) {\n  const parentRef = useRef<HTMLDivElement>(null)\n\n  const virtualizer = useVirtualizer({\n    count: items.length,\n    getScrollElement: () => parentRef.current,\n    estimateSize: () => 120,\n    overscan: 5,\n  })\n\n  return (\n    <div ref={parentRef} className=\"h-[600px] overflow-auto\">\n      <div style={{ height: virtualizer.getTotalSize(), position: \"relative\" }}>\n        {virtualizer.getVirtualItems().map((row) => (\n          <div\n            key={row.key}\n            ref={virtualizer.measureElement}\n            data-index={row.index}\n            style={{ position: \"absolute\", top: 0, width: \"100%\", transform: \"translateY(\" + row.start + \"px)\" }}\n          >\n            {items[row.index]}\n          </div>\n        ))}\n      </div>\n    </div>\n  )\n}"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"動態高度的關鍵：measureElement"}]},{"type":"paragraph","content":[{"type":"text","text":"卡片高度不固定時，"},{"type":"text","text":"estimateSize","marks":[{"type":"code"}]},{"type":"text","text":" 只是初始猜測。把 "},{"type":"text","text":"measureElement","marks":[{"type":"code"}]},{"type":"text","text":" 綁到每個項目，virtualizer 會用 ResizeObserver 回報實際高度並修正位置。"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"效能檢查清單"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"用 "},{"type":"text","text":"transform","marks":[{"type":"code"}]},{"type":"text","text":" 取代 "},{"type":"text","text":"top","marks":[{"type":"code"}]},{"type":"text","text":" 定位，避免觸發重新排版"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"overscan","marks":[{"type":"code"}]},{"type":"text","text":" 設 3～8 即可，過大會失去虛擬化意義"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"列表項目用 "},{"type":"text","text":"memo","marks":[{"type":"code"}]},{"type":"text","text":" 包起來，避免捲動時整批重新渲染"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"在 DevTools 的 Elements 面板確認 DOM 節點數量維持穩定"}]}]}]}]}'::jsonb,
    '<p>當清單超過數百筆，瀏覽器的排版與繪製成本會線性上升。虛擬滾動的核心概念很簡單：<strong>只渲染看得到的項目</strong>，其餘用一個撐高的容器假裝存在。</p><h2>最小可行範例</h2><pre><code class="language-tsx">&quot;use client&quot;

import { useRef } from &quot;react&quot;
import { useVirtualizer } from &quot;@tanstack/react-virtual&quot;

export function VirtualList({ items }: { items: string[] }) {
  const parentRef = useRef&lt;HTMLDivElement&gt;(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () =&gt; parentRef.current,
    estimateSize: () =&gt; 120,
    overscan: 5,
  })

  return (
    &lt;div ref={parentRef} className=&quot;h-[600px] overflow-auto&quot;&gt;
      &lt;div style={{ height: virtualizer.getTotalSize(), position: &quot;relative&quot; }}&gt;
        {virtualizer.getVirtualItems().map((row) =&gt; (
          &lt;div
            key={row.key}
            ref={virtualizer.measureElement}
            data-index={row.index}
            style={{ position: &quot;absolute&quot;, top: 0, width: &quot;100%&quot;, transform: &quot;translateY(&quot; + row.start + &quot;px)&quot; }}
          &gt;
            {items[row.index]}
          &lt;/div&gt;
        ))}
      &lt;/div&gt;
    &lt;/div&gt;
  )
}</code></pre><h2>動態高度的關鍵：measureElement</h2><p>卡片高度不固定時，<code>estimateSize</code> 只是初始猜測。把 <code>measureElement</code> 綁到每個項目，virtualizer 會用 ResizeObserver 回報實際高度並修正位置。</p><h2>效能檢查清單</h2><ul><li><p>用 <code>transform</code> 取代 <code>top</code> 定位，避免觸發重新排版</p></li><li><p><code>overscan</code> 設 3～8 即可，過大會失去虛擬化意義</p></li><li><p>列表項目用 <code>memo</code> 包起來，避免捲動時整批重新渲染</p></li><li><p>在 DevTools 的 Elements 面板確認 DOM 節點數量維持穩定</p></li></ul>',
    'published',
    4,
    4677,
    '2026-02-05T01:00:00.000Z'::timestamptz
  ),
  (
    'Next.js 16 Cache Components 與 use cache 實戰',
    'nextjs-cache-components',
    'Cache Components 讓「靜態外殼 + 動態串流」成為預設。整理 use cache、cacheLife 與 cacheTag 的使用時機。',
    (select id from public.categories where type = 'post' and slug = 'nextjs'),
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Next.js 16 推出的 Cache Components 把快取決策從路由層級下放到元件與函式層級。啟用後，未快取的資料存取必須包在 "},{"type":"text","text":"<Suspense>","marks":[{"type":"code"}]},{"type":"text","text":" 中，框架會自動產生靜態外殼並串流其餘內容。"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"啟用方式"}]},{"type":"codeBlock","attrs":{"language":"ts"},"content":[{"type":"text","text":"import type { NextConfig } from \"next\"\n\nconst nextConfig: NextConfig = {\n  cacheComponents: true,\n}\n\nexport default nextConfig"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"快取一個資料函式"}]},{"type":"codeBlock","attrs":{"language":"ts"},"content":[{"type":"text","text":"import { cacheLife, cacheTag } from \"next/cache\"\n\nexport async function getLatestPosts() {\n  \"use cache\"\n  cacheLife(\"hours\")\n  cacheTag(\"posts\")\n\n  const { data } = await supabase\n    .from(\"posts\")\n    .select(\"id, title, slug, published_at\")\n    .eq(\"status\", \"published\")\n    .order(\"published_at\", { ascending: false })\n    .limit(5)\n\n  return data ?? []\n}"}]},{"type":"paragraph","content":[{"type":"text","text":"cacheTag","marks":[{"type":"code"}]},{"type":"text","text":" 讓我們在後台發布文章時，能透過 "},{"type":"text","text":"revalidateTag(\"posts\")","marks":[{"type":"code"}]},{"type":"text","text":" 精準清除相關快取，而不必整站重建。"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"常見誤區"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"use cache","marks":[{"type":"code"}]},{"type":"text","text":" 函式內不能讀取 "},{"type":"text","text":"cookies()","marks":[{"type":"code"}]},{"type":"text","text":" 或 "},{"type":"text","text":"headers()","marks":[{"type":"code"}]},{"type":"text","text":"，需由外層取值後當參數傳入"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"參數會成為快取鍵的一部分，請只傳遞可序列化的值"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"開發模式下快取行為與正式環境不同，驗證請以 "},{"type":"text","text":"pnpm build && pnpm start","marks":[{"type":"code"}]},{"type":"text","text":" 為準"}]}]}]}]}'::jsonb,
    '<p>Next.js 16 推出的 Cache Components 把快取決策從路由層級下放到元件與函式層級。啟用後，未快取的資料存取必須包在 <code>&lt;Suspense&gt;</code> 中，框架會自動產生靜態外殼並串流其餘內容。</p><h2>啟用方式</h2><pre><code class="language-ts">import type { NextConfig } from &quot;next&quot;

const nextConfig: NextConfig = {
  cacheComponents: true,
}

export default nextConfig</code></pre><h2>快取一個資料函式</h2><pre><code class="language-ts">import { cacheLife, cacheTag } from &quot;next/cache&quot;

export async function getLatestPosts() {
  &quot;use cache&quot;
  cacheLife(&quot;hours&quot;)
  cacheTag(&quot;posts&quot;)

  const { data } = await supabase
    .from(&quot;posts&quot;)
    .select(&quot;id, title, slug, published_at&quot;)
    .eq(&quot;status&quot;, &quot;published&quot;)
    .order(&quot;published_at&quot;, { ascending: false })
    .limit(5)

  return data ?? []
}</code></pre><p><code>cacheTag</code> 讓我們在後台發布文章時，能透過 <code>revalidateTag(&quot;posts&quot;)</code> 精準清除相關快取，而不必整站重建。</p><h2>常見誤區</h2><ul><li><p><code>use cache</code> 函式內不能讀取 <code>cookies()</code> 或 <code>headers()</code>，需由外層取值後當參數傳入</p></li><li><p>參數會成為快取鍵的一部分，請只傳遞可序列化的值</p></li><li><p>開發模式下快取行為與正式環境不同，驗證請以 <code>pnpm build &amp;&amp; pnpm start</code> 為準</p></li></ul>',
    'published',
    3,
    2996,
    '2026-02-19T01:00:00.000Z'::timestamptz
  ),
  (
    'On-Demand Revalidation：讓部落格內容發布後立即更新',
    'nextjs-on-demand-revalidation',
    '比起固定秒數的 ISR，按需重新驗證能兼顧靜態效能與即時性。以 Server Action 示範發布流程。',
    (select id from public.categories where type = 'post' and slug = 'nextjs'),
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"部落格這類內容「讀多寫少」，最理想的策略是頁面完全靜態化，只有在作者發布或修改時才重新產生。這正是 On-Demand Revalidation 的用武之地。"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"在 Server Action 中觸發"}]},{"type":"codeBlock","attrs":{"language":"ts"},"content":[{"type":"text","text":"\"use server\"\n\nimport { revalidatePath } from \"next/cache\"\n\nexport async function publishPost(postId: string) {\n  const { error } = await supabase\n    .from(\"posts\")\n    .update({ status: \"published\" })\n    .eq(\"id\", postId)\n\n  if (error) {\n    return { ok: false, message: \"發布失敗，請稍後再試\" }\n  }\n\n  revalidatePath(\"/\")\n  revalidatePath(\"/posts\")\n\n  return { ok: true, message: \"文章已發布\" }\n}"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"revalidatePath 與 revalidateTag 的選擇"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"revalidatePath","marks":[{"type":"bold"}]},{"type":"text","text":"：以路由為單位，直覺好懂，適合頁面數量少的情境"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"revalidateTag","marks":[{"type":"bold"}]},{"type":"text","text":"：以資料為單位，一篇文章同時出現在首頁、列表、分類頁時更精準"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"兩者都只會標記快取失效，下一次請求才真正重新產生"}]}]}]},{"type":"blockquote","content":[{"type":"paragraph","content":[{"type":"text","text":"重新驗證一定要放在權限檢查之後，否則任何人都能讓你的快取失效。"}]}]}]}'::jsonb,
    '<p>部落格這類內容「讀多寫少」，最理想的策略是頁面完全靜態化，只有在作者發布或修改時才重新產生。這正是 On-Demand Revalidation 的用武之地。</p><h2>在 Server Action 中觸發</h2><pre><code class="language-ts">&quot;use server&quot;

import { revalidatePath } from &quot;next/cache&quot;

export async function publishPost(postId: string) {
  const { error } = await supabase
    .from(&quot;posts&quot;)
    .update({ status: &quot;published&quot; })
    .eq(&quot;id&quot;, postId)

  if (error) {
    return { ok: false, message: &quot;發布失敗，請稍後再試&quot; }
  }

  revalidatePath(&quot;/&quot;)
  revalidatePath(&quot;/posts&quot;)

  return { ok: true, message: &quot;文章已發布&quot; }
}</code></pre><h2>revalidatePath 與 revalidateTag 的選擇</h2><ul><li><p><strong>revalidatePath</strong>：以路由為單位，直覺好懂，適合頁面數量少的情境</p></li><li><p><strong>revalidateTag</strong>：以資料為單位，一篇文章同時出現在首頁、列表、分類頁時更精準</p></li><li><p>兩者都只會標記快取失效，下一次請求才真正重新產生</p></li></ul><blockquote><p>重新驗證一定要放在權限檢查之後，否則任何人都能讓你的快取失效。</p></blockquote>',
    'published',
    2,
    1315,
    '2026-03-05T01:00:00.000Z'::timestamptz
  ),
  (
    '用 Next.js Proxy 實作後台路由防護',
    'nextjs-proxy-auth-guard',
    'Next.js 16 將 middleware 更名為 proxy。示範如何在請求進入頁面前檢查 Supabase 工作階段並導向登入頁。',
    (select id from public.categories where type = 'post' and slug = 'nextjs'),
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"後台頁面若只在元件內檢查登入狀態，未授權的使用者仍會短暫看到畫面骨架。把防護前移到 Proxy 層，才能在第一時間攔截請求。"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"基本結構"}]},{"type":"codeBlock","attrs":{"language":"ts"},"content":[{"type":"text","text":"import { NextResponse, type NextRequest } from \"next/server\"\n\nconst LOGIN_PATH = \"/admin/login\"\n\nexport async function proxy(request: NextRequest) {\n  const session = await getSessionFromCookies(request)\n  const isLoginPage = request.nextUrl.pathname === LOGIN_PATH\n\n  if (!session && !isLoginPage) {\n    const loginUrl = new URL(LOGIN_PATH, request.url)\n    loginUrl.searchParams.set(\"next\", request.nextUrl.pathname)\n    return NextResponse.redirect(loginUrl)\n  }\n\n  return NextResponse.next()\n}\n\nexport const config = {\n  matcher: [\"/admin/:path*\"],\n}"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"防禦性重點"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"next","marks":[{"type":"code"}]},{"type":"text","text":" 參數只允許站內相對路徑，避免開放式重導向（Open Redirect）"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Proxy 只是第一道防線，Server Action 與資料庫 RLS 仍需各自驗證身分"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"matcher 要排除靜態資源，避免每張圖片都觸發身分驗證"}]}]}]}]}'::jsonb,
    '<p>後台頁面若只在元件內檢查登入狀態，未授權的使用者仍會短暫看到畫面骨架。把防護前移到 Proxy 層，才能在第一時間攔截請求。</p><h2>基本結構</h2><pre><code class="language-ts">import { NextResponse, type NextRequest } from &quot;next/server&quot;

const LOGIN_PATH = &quot;/admin/login&quot;

export async function proxy(request: NextRequest) {
  const session = await getSessionFromCookies(request)
  const isLoginPage = request.nextUrl.pathname === LOGIN_PATH

  if (!session &amp;&amp; !isLoginPage) {
    const loginUrl = new URL(LOGIN_PATH, request.url)
    loginUrl.searchParams.set(&quot;next&quot;, request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [&quot;/admin/:path*&quot;],
}</code></pre><h2>防禦性重點</h2><ul><li><p><code>next</code> 參數只允許站內相對路徑，避免開放式重導向（Open Redirect）</p></li><li><p>Proxy 只是第一道防線，Server Action 與資料庫 RLS 仍需各自驗證身分</p></li><li><p>matcher 要排除靜態資源，避免每張圖片都觸發身分驗證</p></li></ul>',
    'published',
    3,
    4434,
    '2026-03-19T01:00:00.000Z'::timestamptz
  ),
  (
    'Tailwind CSS v4 設計權杖與無閃爍深色模式',
    'tailwind-v4-design-tokens',
    'v4 改用 CSS-first 設定，搭配 OKLCH 色彩與 next-themes，打造一致又不閃爍的雙主題介面。',
    (select id from public.categories where type = 'post' and slug = 'css'),
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Tailwind CSS v4 最大的改變是不再需要 "},{"type":"text","text":"tailwind.config.js","marks":[{"type":"code"}]},{"type":"text","text":"，所有設計權杖都直接寫在 CSS 的 "},{"type":"text","text":"@theme","marks":[{"type":"code"}]},{"type":"text","text":" 區塊中，讓設計系統回歸平台原生能力。"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"用 CSS 變數定義語意色彩"}]},{"type":"codeBlock","attrs":{"language":"css"},"content":[{"type":"text","text":"@import \"tailwindcss\";\n\n@custom-variant dark (&:is(.dark *));\n\n@theme inline {\n  --color-background: var(--background);\n  --color-foreground: var(--foreground);\n}\n\n:root {\n  --background: oklch(0.985 0 0);\n  --foreground: oklch(0.141 0.005 285.823);\n}\n\n.dark {\n  --background: oklch(0.141 0.005 285.823);\n  --foreground: oklch(0.985 0 0);\n}"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"為什麼會閃爍？"}]},{"type":"paragraph","content":[{"type":"text","text":"伺服器不知道使用者偏好的主題，若等 React hydration 後才切換 class，畫面就會先亮後暗。"},{"type":"text","text":"next-themes","marks":[{"type":"code"}]},{"type":"text","text":" 會在 "},{"type":"text","text":"<head>","marks":[{"type":"code"}]},{"type":"text","text":" 注入一段阻塞腳本，在第一次繪製前就套用正確的 class。"}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"別忘了 suppressHydrationWarning"}]},{"type":"paragraph","content":[{"type":"text","text":"因為腳本會改寫 "},{"type":"text","text":"<html>","marks":[{"type":"code"}]},{"type":"text","text":" 的 class，伺服器與客戶端屬性必然不同，需在 "},{"type":"text","text":"<html>","marks":[{"type":"code"}]},{"type":"text","text":" 加上 "},{"type":"text","text":"suppressHydrationWarning","marks":[{"type":"code"}]},{"type":"text","text":"。這個屬性只作用一層，不會掩蓋子元件的真正錯誤。"}]}]}'::jsonb,
    '<p>Tailwind CSS v4 最大的改變是不再需要 <code>tailwind.config.js</code>，所有設計權杖都直接寫在 CSS 的 <code>@theme</code> 區塊中，讓設計系統回歸平台原生能力。</p><h2>用 CSS 變數定義語意色彩</h2><pre><code class="language-css">@import &quot;tailwindcss&quot;;

@custom-variant dark (&amp;:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}

:root {
  --background: oklch(0.985 0 0);
  --foreground: oklch(0.141 0.005 285.823);
}

.dark {
  --background: oklch(0.141 0.005 285.823);
  --foreground: oklch(0.985 0 0);
}</code></pre><h2>為什麼會閃爍？</h2><p>伺服器不知道使用者偏好的主題，若等 React hydration 後才切換 class，畫面就會先亮後暗。<code>next-themes</code> 會在 <code>&lt;head&gt;</code> 注入一段阻塞腳本，在第一次繪製前就套用正確的 class。</p><h3>別忘了 suppressHydrationWarning</h3><p>因為腳本會改寫 <code>&lt;html&gt;</code> 的 class，伺服器與客戶端屬性必然不同，需在 <code>&lt;html&gt;</code> 加上 <code>suppressHydrationWarning</code>。這個屬性只作用一層，不會掩蓋子元件的真正錯誤。</p>',
    'published',
    2,
    2753,
    '2026-04-02T01:00:00.000Z'::timestamptz
  ),
  (
    'content-visibility：長文頁面的效能救星',
    'css-content-visibility',
    '一行 CSS 就能讓瀏覽器跳過視窗外內容的排版與繪製，實測萬字長文首次渲染時間縮短 40%。',
    (select id from public.categories where type = 'post' and slug = 'css'),
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"技術文章動輒數千字、數十個程式碼區塊。瀏覽器預設會對整份文件排版，即使使用者只看得到第一屏。"},{"type":"text","text":"content-visibility: auto","marks":[{"type":"code"}]},{"type":"text","text":" 讓瀏覽器延後處理畫面外的區塊。"}]},{"type":"codeBlock","attrs":{"language":"css"},"content":[{"type":"text","text":".article-section {\n  content-visibility: auto;\n  contain-intrinsic-size: auto 800px;\n}"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"contain-intrinsic-size 不可省略"}]},{"type":"paragraph","content":[{"type":"text","text":"被跳過的區塊高度會變成 0，導致捲軸長度亂跳。"},{"type":"text","text":"contain-intrinsic-size","marks":[{"type":"code"}]},{"type":"text","text":" 提供預估高度，加上 "},{"type":"text","text":"auto","marks":[{"type":"code"}]},{"type":"text","text":" 關鍵字後，瀏覽器會記住實際渲染過的尺寸。"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"適用與不適用的情境"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"適用：長文章、留言串、文件頁等靜態長內容"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"不適用：需要錨點精準定位的極短區塊"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"注意：被跳過的內容仍可被搜尋與無障礙工具讀取，不影響 SEO"}]}]}]}]}'::jsonb,
    '<p>技術文章動輒數千字、數十個程式碼區塊。瀏覽器預設會對整份文件排版，即使使用者只看得到第一屏。<code>content-visibility: auto</code> 讓瀏覽器延後處理畫面外的區塊。</p><pre><code class="language-css">.article-section {
  content-visibility: auto;
  contain-intrinsic-size: auto 800px;
}</code></pre><h2>contain-intrinsic-size 不可省略</h2><p>被跳過的區塊高度會變成 0，導致捲軸長度亂跳。<code>contain-intrinsic-size</code> 提供預估高度，加上 <code>auto</code> 關鍵字後，瀏覽器會記住實際渲染過的尺寸。</p><h2>適用與不適用的情境</h2><ul><li><p>適用：長文章、留言串、文件頁等靜態長內容</p></li><li><p>不適用：需要錨點精準定位的極短區塊</p></li><li><p>注意：被跳過的內容仍可被搜尋與無障礙工具讀取，不影響 SEO</p></li></ul>',
    'published',
    2,
    1072,
    '2026-04-16T01:00:00.000Z'::timestamptz
  ),
  (
    'PostgreSQL Row Level Security 從入門到實戰',
    'postgresql-rls-guide',
    'RLS 把權限檢查下放到資料庫，即使前端金鑰外洩也能守住資料。以部落格的草稿與發布為例逐步說明。',
    (select id from public.categories where type = 'post' and slug = 'postgresql'),
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"使用 Supabase 時，"},{"type":"text","text":"anon","marks":[{"type":"code"}]},{"type":"text","text":" 金鑰會公開在瀏覽器中。真正保護資料的不是金鑰，而是資料庫層的 "},{"type":"text","text":"Row Level Security","marks":[{"type":"bold"}]},{"type":"text","text":"。"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"啟用 RLS 與撰寫政策"}]},{"type":"codeBlock","attrs":{"language":"sql"},"content":[{"type":"text","text":"alter table public.posts enable row level security;\n\ncreate policy \"訪客僅能讀取已發布文章\" on public.posts\n  for select to anon\n  using (status = ''published'' and published_at <= now());\n\ncreate policy \"管理員可讀寫全部文章\" on public.posts\n  for all to authenticated\n  using (true) with check (true);"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"USING 與 WITH CHECK 的差別"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"USING","marks":[{"type":"code"}]},{"type":"text","text":"：決定「哪些既有資料列看得到、改得到」"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"WITH CHECK","marks":[{"type":"code"}]},{"type":"text","text":"：決定「寫入後的新資料列是否合法」"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"UPDATE 同時需要兩者，缺一可能造成資料被改到看不見的狀態"}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"縱深防禦"}]},{"type":"paragraph","content":[{"type":"text","text":"除了政策，也建議用 "},{"type":"text","text":"revoke insert, update, delete ... from anon","marks":[{"type":"code"}]},{"type":"text","text":" 在權限層再擋一次。政策寫錯時，這道保險能避免災難。"}]}]}'::jsonb,
    '<p>使用 Supabase 時，<code>anon</code> 金鑰會公開在瀏覽器中。真正保護資料的不是金鑰，而是資料庫層的 <strong>Row Level Security</strong>。</p><h2>啟用 RLS 與撰寫政策</h2><pre><code class="language-sql">alter table public.posts enable row level security;

create policy &quot;訪客僅能讀取已發布文章&quot; on public.posts
  for select to anon
  using (status = &#39;published&#39; and published_at &lt;= now());

create policy &quot;管理員可讀寫全部文章&quot; on public.posts
  for all to authenticated
  using (true) with check (true);</code></pre><h2>USING 與 WITH CHECK 的差別</h2><ul><li><p><code>USING</code>：決定「哪些既有資料列看得到、改得到」</p></li><li><p><code>WITH CHECK</code>：決定「寫入後的新資料列是否合法」</p></li><li><p>UPDATE 同時需要兩者，缺一可能造成資料被改到看不見的狀態</p></li></ul><h2>縱深防禦</h2><p>除了政策，也建議用 <code>revoke insert, update, delete ... from anon</code> 在權限層再擋一次。政策寫錯時，這道保險能避免災難。</p>',
    'published',
    2,
    4191,
    '2026-04-30T01:00:00.000Z'::timestamptz
  ),
  (
    'PostgreSQL JSONB 查詢技巧與 GIN 索引最佳化',
    'postgresql-jsonb-indexing',
    'Tiptap 的文件結構以 JSONB 儲存，該如何查詢特定節點？又該在什麼時候建立 GIN 索引？',
    (select id from public.categories where type = 'post' and slug = 'postgresql'),
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"富文本編輯器輸出的 JSON 結構適合存成 "},{"type":"text","text":"jsonb","marks":[{"type":"code"}]},{"type":"text","text":"：可驗證、可查詢，也能被編輯器原封不動地回填。"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"常用運算子"}]},{"type":"codeBlock","attrs":{"language":"sql"},"content":[{"type":"text","text":"-- 取出頂層節點型別\nselect content_json ->> ''type'' from posts;\n\n-- 找出包含程式碼區塊的文章\nselect title\nfrom posts\nwhere content_json @> ''{\"content\": [{\"type\": \"codeBlock\"}]}'';"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"GIN 索引"}]},{"type":"codeBlock","attrs":{"language":"sql"},"content":[{"type":"text","text":"create index posts_content_json_gin\n  on posts using gin (content_json jsonb_path_ops);"}]},{"type":"paragraph","content":[{"type":"text","text":"jsonb_path_ops","marks":[{"type":"code"}]},{"type":"text","text":" 只支援 "},{"type":"text","text":"@>","marks":[{"type":"code"}]},{"type":"text","text":" 包含查詢，但索引體積比預設的 "},{"type":"text","text":"jsonb_ops","marks":[{"type":"code"}]},{"type":"text","text":" 小上許多。若查詢模式固定，優先選擇它。"}]},{"type":"blockquote","content":[{"type":"paragraph","content":[{"type":"text","text":"索引不是越多越好。每個索引都會拖慢寫入，請以實際查詢計畫（EXPLAIN ANALYZE）為依據。"}]}]}]}'::jsonb,
    '<p>富文本編輯器輸出的 JSON 結構適合存成 <code>jsonb</code>：可驗證、可查詢，也能被編輯器原封不動地回填。</p><h2>常用運算子</h2><pre><code class="language-sql">-- 取出頂層節點型別
select content_json -&gt;&gt; &#39;type&#39; from posts;

-- 找出包含程式碼區塊的文章
select title
from posts
where content_json @&gt; &#39;{&quot;content&quot;: [{&quot;type&quot;: &quot;codeBlock&quot;}]}&#39;;</code></pre><h2>GIN 索引</h2><pre><code class="language-sql">create index posts_content_json_gin
  on posts using gin (content_json jsonb_path_ops);</code></pre><p><code>jsonb_path_ops</code> 只支援 <code>@&gt;</code> 包含查詢，但索引體積比預設的 <code>jsonb_ops</code> 小上許多。若查詢模式固定，優先選擇它。</p><blockquote><p>索引不是越多越好。每個索引都會拖慢寫入，請以實際查詢計畫（EXPLAIN ANALYZE）為依據。</p></blockquote>',
    'published',
    2,
    2510,
    '2026-05-14T01:00:00.000Z'::timestamptz
  ),
  (
    '用遞迴 CTE 處理樹狀分類資料',
    'postgresql-recursive-cte',
    '自關聯的 parent_id 設計簡單，但查詢整棵樹需要一點技巧。示範 WITH RECURSIVE 取出麵包屑與子孫節點。',
    (select id from public.categories where type = 'post' and slug = 'postgresql'),
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"分類表以 "},{"type":"text","text":"parent_id","marks":[{"type":"code"}]},{"type":"text","text":" 自我關聯是最常見的樹狀設計，稱為 Adjacency List。它寫入簡單，查詢時則仰賴遞迴 CTE。"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"取得某分類的所有子孫"}]},{"type":"codeBlock","attrs":{"language":"sql"},"content":[{"type":"text","text":"with recursive tree as (\n  select id, name, parent_id, 1 as depth\n  from categories\n  where slug = ''frontend''\n\n  union all\n\n  select c.id, c.name, c.parent_id, t.depth + 1\n  from categories c\n  join tree t on c.parent_id = t.id\n)\nselect * from tree order by depth;"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"限制層數的防呆"}]},{"type":"paragraph","content":[{"type":"text","text":"產品需求若只需要兩層分類，建議在資料庫以觸發器限制深度，而不是只靠前端表單。這樣即使透過 API 直接寫入，也不會產生第三層。"}]}]}'::jsonb,
    '<p>分類表以 <code>parent_id</code> 自我關聯是最常見的樹狀設計，稱為 Adjacency List。它寫入簡單，查詢時則仰賴遞迴 CTE。</p><h2>取得某分類的所有子孫</h2><pre><code class="language-sql">with recursive tree as (
  select id, name, parent_id, 1 as depth
  from categories
  where slug = &#39;frontend&#39;

  union all

  select c.id, c.name, c.parent_id, t.depth + 1
  from categories c
  join tree t on c.parent_id = t.id
)
select * from tree order by depth;</code></pre><h2>限制層數的防呆</h2><p>產品需求若只需要兩層分類，建議在資料庫以觸發器限制深度，而不是只靠前端表單。這樣即使透過 API 直接寫入，也不會產生第三層。</p>',
    'published',
    2,
    829,
    '2026-05-28T01:00:00.000Z'::timestamptz
  ),
  (
    'Node.js 22 原生功能盤點：從型別剝除到內建測試',
    'nodejs-22-native-features',
    '不裝套件也能跑 TypeScript、寫測試、監看檔案。整理 Node.js 22 值得立刻採用的新功能。',
    (select id from public.categories where type = 'post' and slug = 'nodejs'),
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Node.js 22 是目前的 LTS 版本，內建許多過去需要第三方套件才能完成的功能，讓工具鏈更精簡。"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"直接執行 TypeScript"}]},{"type":"codeBlock","attrs":{"language":"bash"},"content":[{"type":"text","text":"node --experimental-strip-types scripts/seed/generate.ts"}]},{"type":"paragraph","content":[{"type":"text","text":"型別剝除只移除型別註記，不做型別檢查，也不支援 "},{"type":"text","text":"enum","marks":[{"type":"code"}]},{"type":"text","text":" 這類需要轉譯的語法。搭配 "},{"type":"text","text":"tsc --noEmit","marks":[{"type":"code"}]},{"type":"text","text":" 就能兼顧速度與安全。"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"內建測試執行器"}]},{"type":"codeBlock","attrs":{"language":"ts"},"content":[{"type":"text","text":"import { test } from \"node:test\"\nimport assert from \"node:assert/strict\"\n\nimport { slugify } from \"./slugify.ts\"\n\ntest(\"將中英混合標題轉為網址代稱\", () => {\n  assert.equal(slugify(\"Hello 世界\"), \"hello\")\n})"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"其他好用功能"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"node --watch","marks":[{"type":"code"}]},{"type":"text","text":"：取代 nodemon"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"node --env-file=.env","marks":[{"type":"code"}]},{"type":"text","text":"：取代 dotenv"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"require(esm)","marks":[{"type":"code"}]},{"type":"text","text":"：CommonJS 也能載入 ES Module"}]}]}]}]}'::jsonb,
    '<p>Node.js 22 是目前的 LTS 版本，內建許多過去需要第三方套件才能完成的功能，讓工具鏈更精簡。</p><h2>直接執行 TypeScript</h2><pre><code class="language-bash">node --experimental-strip-types scripts/seed/generate.ts</code></pre><p>型別剝除只移除型別註記，不做型別檢查，也不支援 <code>enum</code> 這類需要轉譯的語法。搭配 <code>tsc --noEmit</code> 就能兼顧速度與安全。</p><h2>內建測試執行器</h2><pre><code class="language-ts">import { test } from &quot;node:test&quot;
import assert from &quot;node:assert/strict&quot;

import { slugify } from &quot;./slugify.ts&quot;

test(&quot;將中英混合標題轉為網址代稱&quot;, () =&gt; {
  assert.equal(slugify(&quot;Hello 世界&quot;), &quot;hello&quot;)
})</code></pre><h2>其他好用功能</h2><ul><li><p><code>node --watch</code>：取代 nodemon</p></li><li><p><code>node --env-file=.env</code>：取代 dotenv</p></li><li><p><code>require(esm)</code>：CommonJS 也能載入 ES Module</p></li></ul>',
    'published',
    2,
    3948,
    '2026-06-11T01:00:00.000Z'::timestamptz
  ),
  (
    'Zod 執行期驗證：前後端共用的型別防線',
    'zod-runtime-validation',
    'TypeScript 只活在編譯期。用 Zod 定義一次結構，同時取得型別推導與繁體中文錯誤訊息。',
    (select id from public.categories where type = 'post' and slug = 'nodejs'),
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"來自表單、API、資料庫的資料在執行期都是 "},{"type":"text","text":"unknown","marks":[{"type":"code"}]},{"type":"text","text":"。Zod 讓我們用一份 schema 同時完成驗證與型別推導，杜絕「型別說有、實際沒有」的錯覺。"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"定義與推導"}]},{"type":"codeBlock","attrs":{"language":"ts"},"content":[{"type":"text","text":"import { z } from \"zod\"\n\nexport const postStatusSchema = z.enum([\"draft\", \"published\"])\n\nexport const postFormSchema = z.object({\n  title: z.string().trim().min(1, \"請輸入文章標題\").max(120, \"標題不可超過 120 字\"),\n  slug: z.string().regex(/^[a-z0-9-]+$/, \"網址代稱僅能包含小寫英文、數字與連字號\"),\n  status: postStatusSchema,\n})\n\nexport type PostFormValues = z.infer<typeof postFormSchema>"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"用列舉取代魔術字串"}]},{"type":"paragraph","content":[{"type":"text","text":"把 "},{"type":"text","text":"\"draft\"","marks":[{"type":"code"}]},{"type":"text","text":"、"},{"type":"text","text":"\"published\"","marks":[{"type":"code"}]},{"type":"text","text":" 集中定義在 "},{"type":"text","text":"z.enum","marks":[{"type":"code"}]},{"type":"text","text":"，程式各處透過 "},{"type":"text","text":"postStatusSchema.enum.draft","marks":[{"type":"code"}]},{"type":"text","text":" 取用，打錯字時編譯器會直接提醒。"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"safeParse 與 parse"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"safeParse","marks":[{"type":"code"}]},{"type":"text","text":" 回傳結果物件，適合表單驗證等「預期會失敗」的情境"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"parse","marks":[{"type":"code"}]},{"type":"text","text":" 失敗時拋出例外，適合環境變數等「失敗就該中止」的情境"}]}]}]}]}'::jsonb,
    '<p>來自表單、API、資料庫的資料在執行期都是 <code>unknown</code>。Zod 讓我們用一份 schema 同時完成驗證與型別推導，杜絕「型別說有、實際沒有」的錯覺。</p><h2>定義與推導</h2><pre><code class="language-ts">import { z } from &quot;zod&quot;

export const postStatusSchema = z.enum([&quot;draft&quot;, &quot;published&quot;])

export const postFormSchema = z.object({
  title: z.string().trim().min(1, &quot;請輸入文章標題&quot;).max(120, &quot;標題不可超過 120 字&quot;),
  slug: z.string().regex(/^[a-z0-9-]+$/, &quot;網址代稱僅能包含小寫英文、數字與連字號&quot;),
  status: postStatusSchema,
})

export type PostFormValues = z.infer&lt;typeof postFormSchema&gt;</code></pre><h2>用列舉取代魔術字串</h2><p>把 <code>&quot;draft&quot;</code>、<code>&quot;published&quot;</code> 集中定義在 <code>z.enum</code>，程式各處透過 <code>postStatusSchema.enum.draft</code> 取用，打錯字時編譯器會直接提醒。</p><h2>safeParse 與 parse</h2><ul><li><p><code>safeParse</code> 回傳結果物件，適合表單驗證等「預期會失敗」的情境</p></li><li><p><code>parse</code> 失敗時拋出例外，適合環境變數等「失敗就該中止」的情境</p></li></ul>',
    'published',
    2,
    2267,
    '2026-06-25T01:00:00.000Z'::timestamptz
  ),
  (
    'Docker 多階段建置：把 Next.js 映像檔瘦身到 150MB',
    'docker-multi-stage-nextjs',
    '善用 output: standalone 與多階段建置，讓部署映像檔只包含執行所需的最小檔案。',
    (select id from public.categories where type = 'post' and slug = 'docker'),
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"直接把整個專案複製進映像檔，動輒超過 1GB。透過 Next.js 的 "},{"type":"text","text":"output: \"standalone\"","marks":[{"type":"code"}]},{"type":"text","text":" 搭配多階段建置，可以只保留追蹤到的必要依賴。"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Dockerfile 範例"}]},{"type":"codeBlock","attrs":{"language":"dockerfile"},"content":[{"type":"text","text":"FROM node:22-alpine AS base\nRUN corepack enable\n\nFROM base AS deps\nWORKDIR /app\nCOPY package.json pnpm-lock.yaml ./\nRUN pnpm install --frozen-lockfile\n\nFROM base AS builder\nWORKDIR /app\nCOPY --from=deps /app/node_modules ./node_modules\nCOPY . .\nRUN pnpm build\n\nFROM node:22-alpine AS runner\nWORKDIR /app\nENV NODE_ENV=production\nCOPY --from=builder /app/.next/standalone ./\nCOPY --from=builder /app/.next/static ./.next/static\nCOPY --from=builder /app/public ./public\nUSER node\nCMD [\"node\", \"server.js\"]"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"安全性細節"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"最終階段以 "},{"type":"text","text":"USER node","marks":[{"type":"code"}]},{"type":"text","text":" 執行，避免容器內取得 root 權限"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"建置期的機密變數使用 "},{"type":"text","text":"--secret","marks":[{"type":"code"}]},{"type":"text","text":" 掛載，不要寫進 "},{"type":"text","text":"ENV","marks":[{"type":"code"}]}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"加入 "},{"type":"text","text":".dockerignore","marks":[{"type":"code"}]},{"type":"text","text":" 排除 "},{"type":"text","text":".env","marks":[{"type":"code"}]},{"type":"text","text":" 與 "},{"type":"text","text":".git","marks":[{"type":"code"}]}]}]}]}]}'::jsonb,
    '<p>直接把整個專案複製進映像檔，動輒超過 1GB。透過 Next.js 的 <code>output: &quot;standalone&quot;</code> 搭配多階段建置，可以只保留追蹤到的必要依賴。</p><h2>Dockerfile 範例</h2><pre><code class="language-dockerfile">FROM node:22-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
USER node
CMD [&quot;node&quot;, &quot;server.js&quot;]</code></pre><h2>安全性細節</h2><ul><li><p>最終階段以 <code>USER node</code> 執行，避免容器內取得 root 權限</p></li><li><p>建置期的機密變數使用 <code>--secret</code> 掛載，不要寫進 <code>ENV</code></p></li><li><p>加入 <code>.dockerignore</code> 排除 <code>.env</code> 與 <code>.git</code></p></li></ul>',
    'published',
    3,
    586,
    '2026-07-09T01:00:00.000Z'::timestamptz
  ),
  (
    'GitHub Actions 搭配 pnpm 快取，CI 時間減半',
    'github-actions-pnpm-cache',
    'pnpm 的內容定址儲存非常適合快取。示範一份同時執行格式檢查、型別檢查與建置的工作流程。',
    (select id from public.categories where type = 'post' and slug = 'ci-cd'),
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"CI 最花時間的往往是安裝依賴。pnpm 把所有套件存放在全域 store，只要快取這個目錄，後續安裝幾乎只剩建立連結。"}]},{"type":"codeBlock","attrs":{"language":"yaml"},"content":[{"type":"text","text":"name: CI\n\non: [push, pull_request]\n\njobs:\n  verify:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: pnpm/action-setup@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version-file: .nvmrc\n          cache: pnpm\n      - run: pnpm install --frozen-lockfile\n      - run: pnpm format:check\n      - run: pnpm typecheck\n      - run: pnpm build"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"重點說明"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"pnpm/action-setup","marks":[{"type":"code"}]},{"type":"text","text":" 會讀取 "},{"type":"text","text":"package.json","marks":[{"type":"code"}]},{"type":"text","text":" 的 "},{"type":"text","text":"packageManager","marks":[{"type":"code"}]},{"type":"text","text":" 欄位，版本與本機一致"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"node-version-file","marks":[{"type":"code"}]},{"type":"text","text":" 指向 "},{"type":"text","text":".nvmrc","marks":[{"type":"code"}]},{"type":"text","text":"，避免 Node 版本在多處重複定義"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"--frozen-lockfile","marks":[{"type":"code"}]},{"type":"text","text":" 確保 lockfile 與 package.json 不一致時直接失敗"}]}]}]}]}'::jsonb,
    '<p>CI 最花時間的往往是安裝依賴。pnpm 把所有套件存放在全域 store，只要快取這個目錄，後續安裝幾乎只剩建立連結。</p><pre><code class="language-yaml">name: CI

on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm format:check
      - run: pnpm typecheck
      - run: pnpm build</code></pre><h2>重點說明</h2><ul><li><p><code>pnpm/action-setup</code> 會讀取 <code>package.json</code> 的 <code>packageManager</code> 欄位，版本與本機一致</p></li><li><p><code>node-version-file</code> 指向 <code>.nvmrc</code>，避免 Node 版本在多處重複定義</p></li><li><p><code>--frozen-lockfile</code> 確保 lockfile 與 package.json 不一致時直接失敗</p></li></ul>',
    'published',
    2,
    3705,
    '2026-07-23T01:00:00.000Z'::timestamptz
  ),
  (
    'XSS 防禦實務：DOMPurify 與 CSP 雙重保險',
    'xss-defense-dompurify',
    '部落格輸出使用者撰寫的 HTML 時，該如何避免跨站腳本攻擊？從消毒到內容安全政策一次說清楚。',
    (select id from public.categories where type = 'post' and slug = 'web-security'),
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"只要頁面使用 "},{"type":"text","text":"dangerouslySetInnerHTML","marks":[{"type":"code"}]},{"type":"text","text":"，就等於信任了那段 HTML。即使內容來自管理員，也可能因帳號遭竊或編輯器漏洞而被植入惡意腳本。"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"第一道防線：伺服器端消毒"}]},{"type":"codeBlock","attrs":{"language":"ts"},"content":[{"type":"text","text":"import DOMPurify from \"isomorphic-dompurify\"\n\nexport function sanitizeArticleHtml(html: string) {\n  return DOMPurify.sanitize(html, {\n    USE_PROFILES: { html: true },\n    FORBID_TAGS: [\"style\", \"iframe\", \"form\"],\n    FORBID_ATTR: [\"style\", \"onerror\", \"onclick\"],\n  })\n}"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"第二道防線：Content Security Policy"}]},{"type":"paragraph","content":[{"type":"text","text":"CSP 告訴瀏覽器「只執行來自可信來源的腳本」。即使消毒有疏漏，沒有 nonce 的行內腳本也無法執行。"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"常見錯誤"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"只在儲存時消毒、輸出時沒有——規則更新後舊資料仍不安全"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"允許 "},{"type":"text","text":"javascript:","marks":[{"type":"code"}]},{"type":"text","text":" 協定的連結"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"外部連結忘了加上 "},{"type":"text","text":"rel=\"noopener noreferrer\"","marks":[{"type":"code"}]}]}]}]}]}'::jsonb,
    '<p>只要頁面使用 <code>dangerouslySetInnerHTML</code>，就等於信任了那段 HTML。即使內容來自管理員，也可能因帳號遭竊或編輯器漏洞而被植入惡意腳本。</p><h2>第一道防線：伺服器端消毒</h2><pre><code class="language-ts">import DOMPurify from &quot;isomorphic-dompurify&quot;

export function sanitizeArticleHtml(html: string) {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: [&quot;style&quot;, &quot;iframe&quot;, &quot;form&quot;],
    FORBID_ATTR: [&quot;style&quot;, &quot;onerror&quot;, &quot;onclick&quot;],
  })
}</code></pre><h2>第二道防線：Content Security Policy</h2><p>CSP 告訴瀏覽器「只執行來自可信來源的腳本」。即使消毒有疏漏，沒有 nonce 的行內腳本也無法執行。</p><h2>常見錯誤</h2><ul><li><p>只在儲存時消毒、輸出時沒有——規則更新後舊資料仍不安全</p></li><li><p>允許 <code>javascript:</code> 協定的連結</p></li><li><p>外部連結忘了加上 <code>rel=&quot;noopener noreferrer&quot;</code></p></li></ul>',
    'published',
    2,
    2024,
    '2026-08-06T01:00:00.000Z'::timestamptz
  ),
  (
    'Server Actions 的 CSRF 防護機制解析',
    'server-actions-csrf-protection',
    'Server Action 本質上是公開的 POST 端點。Next.js 內建了哪些保護？我們還需要補上什麼？',
    (select id from public.categories where type = 'post' and slug = 'web-security'),
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"每個 Server Action 都會被編譯成一個可透過 POST 呼叫的端點。理解它的安全模型，才能避免把資料庫操作直接暴露給全世界。"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Next.js 的內建保護"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"只接受 POST 方法"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"比對 "},{"type":"text","text":"Origin","marks":[{"type":"code"}]},{"type":"text","text":" 與 "},{"type":"text","text":"Host","marks":[{"type":"code"}]},{"type":"text","text":" 標頭，拒絕跨站請求"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Action ID 經過加密且會隨建置變動，無法被猜測"}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"仍需自行處理的部分"}]},{"type":"codeBlock","attrs":{"language":"ts"},"content":[{"type":"text","text":"\"use server\"\n\nexport async function deletePost(postId: string) {\n  const user = await getCurrentUser()\n\n  if (!user) {\n    throw new Error(\"尚未登入，無法執行此操作\")\n  }\n\n  const id = z.uuid().parse(postId)\n\n  await supabase.from(\"posts\").delete().eq(\"id\", id)\n}"}]},{"type":"blockquote","content":[{"type":"paragraph","content":[{"type":"text","text":"把每一個 Server Action 都當成公開 API 來設計：驗證身分、驗證輸入、最小權限。"}]}]}]}'::jsonb,
    '<p>每個 Server Action 都會被編譯成一個可透過 POST 呼叫的端點。理解它的安全模型，才能避免把資料庫操作直接暴露給全世界。</p><h2>Next.js 的內建保護</h2><ul><li><p>只接受 POST 方法</p></li><li><p>比對 <code>Origin</code> 與 <code>Host</code> 標頭，拒絕跨站請求</p></li><li><p>Action ID 經過加密且會隨建置變動，無法被猜測</p></li></ul><h2>仍需自行處理的部分</h2><pre><code class="language-ts">&quot;use server&quot;

export async function deletePost(postId: string) {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error(&quot;尚未登入，無法執行此操作&quot;)
  }

  const id = z.uuid().parse(postId)

  await supabase.from(&quot;posts&quot;).delete().eq(&quot;id&quot;, id)
}</code></pre><blockquote><p>把每一個 Server Action 都當成公開 API 來設計：驗證身分、驗證輸入、最小權限。</p></blockquote>',
    'published',
    2,
    343,
    '2026-08-20T01:00:00.000Z'::timestamptz
  ),
  (
    'Supabase Storage 未引用檔案清理策略',
    'supabase-storage-unreferenced-cleanup',
    '文章刪掉了，圖片還留在儲存桶裡。設計一個安全的掃描與清理流程，避免儲存空間無限膨脹。',
    (select id from public.categories where type = 'post' and slug = 'postgresql'),
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"編輯器拖放上傳圖片很方便，但使用者刪除圖片或放棄草稿時，Storage 裡的檔案並不會跟著消失。"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"掃描流程"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"列出儲存桶中的所有物件路徑"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"從 "},{"type":"text","text":"content_html","marks":[{"type":"code"}]},{"type":"text","text":" 與 "},{"type":"text","text":"cover_image_url","marks":[{"type":"code"}]},{"type":"text","text":" 擷取所有引用中的圖片網址"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"取差集即為未引用檔案，並排除 24 小時內上傳的檔案避免誤刪編輯中的內容"}]}]}]},{"type":"codeBlock","attrs":{"language":"ts"},"content":[{"type":"text","text":"export function findUnreferencedPaths(storedPaths: string[], referencedPaths: Set<string>) {\n  return storedPaths.filter((path) => !referencedPaths.has(path))\n}"}]}]}'::jsonb,
    '<p>編輯器拖放上傳圖片很方便，但使用者刪除圖片或放棄草稿時，Storage 裡的檔案並不會跟著消失。</p><h2>掃描流程</h2><ul><li><p>列出儲存桶中的所有物件路徑</p></li><li><p>從 <code>content_html</code> 與 <code>cover_image_url</code> 擷取所有引用中的圖片網址</p></li><li><p>取差集即為未引用檔案，並排除 24 小時內上傳的檔案避免誤刪編輯中的內容</p></li></ul><pre><code class="language-ts">export function findUnreferencedPaths(storedPaths: string[], referencedPaths: Set&lt;string&gt;) {
  return storedPaths.filter((path) =&gt; !referencedPaths.has(path))
}</code></pre>',
    'draft',
    1,
    0,
    null
  ),
  (
    'WebAuthn 與 Passkey 無密碼登入實作筆記',
    'webauthn-passkey-notes',
    '整理 Passkey 註冊與驗證流程中容易踩雷的細節。',
    (select id from public.categories where type = 'post' and slug = 'web-security'),
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Passkey 以公私鑰取代密碼，從根本上杜絕釣魚與密碼重用問題。本篇仍在撰寫中。"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"待補充章節"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Relying Party ID 的設定原則"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"挑戰值（challenge）的產生與保存"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"跨裝置同步與備援登入方式"}]}]}]}]}'::jsonb,
    '<p>Passkey 以公私鑰取代密碼，從根本上杜絕釣魚與密碼重用問題。本篇仍在撰寫中。</p><h2>待補充章節</h2><ul><li><p>Relying Party ID 的設定原則</p></li><li><p>挑戰值（challenge）的產生與保存</p></li><li><p>跨裝置同步與備援登入方式</p></li></ul>',
    'draft',
    1,
    0,
    null
  )
on conflict (slug) do nothing;

-- 作品集
insert into public.projects (title, slug, summary, description_html, category_id, tech_stack, is_featured, sort_order, demo_url, repo_url, status, published_at) values
  (
    'Bryan Log 個人品牌網站',
    'bryan-log',
    '以 Next.js 16 與 Supabase 打造的技術部落格與作品集，具備 RLS 權限控管、Tiptap 編輯器與 ISR 即時重新驗證。',
    '<p>這個網站本身就是作品：從資料庫綱要、權限政策到前台渲染策略，都以正式產品的標準設計。</p><h2>技術亮點</h2><ul><li><p>文章雙存 <code>content_json</code> 與 <code>content_html</code>，兼顧編輯回填與 SSR 效能</p></li><li><p>PostgreSQL RLS 確保匿名訪客只能讀取已發布內容</p></li><li><p><code>@tanstack/react-virtual</code> 虛擬滾動，大量卡片依然流暢</p></li></ul>',
    (select id from public.categories where type = 'project' and slug = 'fullstack'),
    array['Next.js', 'React 19', 'TypeScript', 'Supabase', 'Tiptap', 'Tailwind CSS']::text[],
    true,
    0,
    'https://example.com',
    'https://github.com/example/bryan-log',
    'published',
    '2026-01-08T01:00:00.000Z'::timestamptz
  ),
  (
    'TaskFlow 即時協作看板',
    'taskflow-realtime-kanban',
    '支援多人同步拖曳的看板工具，透過 Supabase Realtime 廣播變更，並以樂觀更新維持操作手感。',
    '<p>團隊在遠端協作時，最怕看板狀態不同步。TaskFlow 讓每一次拖曳都在 200 毫秒內同步到所有成員畫面。</p><h2>架構設計</h2><ul><li><p>以分數排序（fractional indexing）避免重新排序時大量更新</p></li><li><p>衝突時以伺服器版本為準並提示使用者</p></li><li><p>Playwright 多分頁測試驗證同步行為</p></li></ul>',
    (select id from public.categories where type = 'project' and slug = 'saas'),
    array['Next.js', 'Supabase Realtime', 'dnd-kit', 'Zustand', 'Playwright']::text[],
    true,
    1,
    'https://example.com/taskflow',
    'https://github.com/example/taskflow',
    'published',
    '2026-01-22T01:00:00.000Z'::timestamptz
  ),
  (
    '臺北公車即時動態查詢 PWA',
    'taipei-bus-tracker',
    '串接交通部 TDX 開放資料，提供到站預估、路線地圖與離線收藏站牌的漸進式網頁應用程式。',
    '<p>通勤時最需要的資訊只有一個：下一班車還有幾分鐘。這個 PWA 把查詢步驟縮短到一次點擊。</p><h2>技術挑戰</h2><ul><li><p>TDX API 有頻率限制，以邊緣快取合併相同請求</p></li><li><p>Service Worker 快取收藏站牌，地下道也能查看最後一次資料</p></li><li><p>地圖標記超過千個時改用 Canvas 圖層渲染</p></li></ul>',
    (select id from public.categories where type = 'project' and slug = 'fullstack'),
    array['React', 'TDX API', 'Leaflet', 'Service Worker', 'Vite']::text[],
    true,
    2,
    'https://example.com/bus',
    'https://github.com/example/taipei-bus',
    'published',
    '2026-02-05T01:00:00.000Z'::timestamptz
  ),
  (
    'zh-lint 中文文案排版檢查工具',
    'zh-lint',
    '自動檢查中英文間距、全半形標點與常見錯字的開源工具，可整合進編輯器與 CI 流程。',
    '<p>中文技術文件常見「中英文之間要不要空格」、「全形還是半形括號」等爭議。zh-lint 把團隊共識寫成可執行的規則。</p><pre><code class="language-bash">pnpm dlx zh-lint &quot;docs/**/*.md&quot; --fix</code></pre>',
    (select id from public.categories where type = 'project' and slug = 'open-source'),
    array['TypeScript', 'unified', 'remark', 'Vitest']::text[],
    false,
    3,
    null,
    'https://github.com/example/zh-lint',
    'published',
    '2026-02-19T01:00:00.000Z'::timestamptz
  ),
  (
    'shipit 一鍵部署命令列工具',
    'shipit-cli',
    '將建置、映像檔推送與健康檢查整合為單一指令，支援自動回滾與 Slack 通知。',
    '<p>小團隊不一定需要完整的 Kubernetes。shipit 用一個設定檔描述部署目標，讓上線流程可重複、可追蹤。</p><h2>主要功能</h2><ul><li><p>部署前以 Zod 驗證設定檔，錯誤訊息直接指出欄位</p></li><li><p>健康檢查失敗時自動回滾到上一個版本</p></li><li><p>所有操作記錄寫入本機日誌，方便事後稽核</p></li></ul>',
    (select id from public.categories where type = 'project' and slug = 'cli'),
    array['Node.js', 'Commander', 'Docker', 'Zod']::text[],
    false,
    4,
    null,
    'https://github.com/example/shipit',
    'published',
    '2026-03-05T01:00:00.000Z'::timestamptz
  )
on conflict (slug) do nothing;

commit;
