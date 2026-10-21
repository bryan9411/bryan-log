import { CONTENT_STATUS } from "../../src/lib/constants/content.ts"
import { BLOCK_TYPE } from "./types.ts"
import type { SeedCategory, SeedPost, SeedProject } from "./types.ts"

const { HEADING_2, HEADING_3, PARAGRAPH, CODE, BULLET_LIST, QUOTE } = BLOCK_TYPE
const { DRAFT, PUBLISHED } = CONTENT_STATUS

export const postCategories: SeedCategory[] = [
  {
    slug: "frontend",
    name: "前端開發",
    description: "React、Next.js 與現代 CSS 的實戰筆記",
    children: [
      { slug: "react", name: "React" },
      { slug: "nextjs", name: "Next.js" },
      { slug: "css", name: "CSS 與設計系統" },
    ],
  },
  {
    slug: "backend",
    name: "後端與資料庫",
    description: "Node.js 服務設計與 PostgreSQL 資料建模",
    children: [
      { slug: "postgresql", name: "PostgreSQL" },
      { slug: "nodejs", name: "Node.js" },
    ],
  },
  {
    slug: "devops",
    name: "雲端與 DevOps",
    description: "容器化、持續整合與部署流程最佳化",
    children: [
      { slug: "docker", name: "Docker 與容器" },
      { slug: "ci-cd", name: "CI/CD 自動化" },
    ],
  },
  {
    slug: "security",
    name: "資訊安全",
    description: "Web 應用程式的防禦性設計與攻擊手法解析",
    children: [{ slug: "web-security", name: "Web 安全" }],
  },
]

export const projectCategories: SeedCategory[] = [
  {
    slug: "web-apps",
    name: "網頁應用",
    description: "從需求訪談到上線維運的完整產品",
    children: [
      { slug: "fullstack", name: "全端應用" },
      { slug: "saas", name: "SaaS 服務" },
    ],
  },
  {
    slug: "dev-tools",
    name: "開發工具",
    description: "提升團隊開發體驗的工具與套件",
    children: [
      { slug: "open-source", name: "開源套件" },
      { slug: "cli", name: "命令列工具" },
    ],
  },
]

export const posts: SeedPost[] = [
  {
    slug: "react-19-use-action-state",
    title: "React 19 useActionState 完全指南：告別手刻表單狀態",
    excerpt:
      "從 useFormState 改名到 useActionState，一次搞懂 pending 狀態、錯誤回傳與漸進式增強的正確寫法。",
    categorySlug: "react",
    status: PUBLISHED,
    blocks: [
      {
        type: PARAGRAPH,
        text: "過去處理表單送出，我們總要自己維護 `isLoading`、`error`、`data` 三個狀態，再用 `try/catch` 包住 `fetch`。React 19 推出的 `useActionState` 把這套樣板收斂成一個 Hook，讓表單邏輯回歸宣告式。",
      },
      { type: HEADING_2, text: "基本用法" },
      {
        type: PARAGRAPH,
        text: "`useActionState` 接收一個 action 函式與初始狀態，回傳目前狀態、包裝後的 action，以及 **pending** 旗標。",
      },
      {
        type: CODE,
        language: "tsx",
        code: `"use client"

import { useActionState } from "react"
import { subscribe } from "./actions"

type FormState = { message: string | null }

const initialState: FormState = { message: null }

export function SubscribeForm() {
  const [state, formAction, isPending] = useActionState(subscribe, initialState)

  return (
    <form action={formAction}>
      <input name="email" type="email" required />
      <button disabled={isPending}>{isPending ? "送出中…" : "訂閱電子報"}</button>
      {state.message && <p role="alert">{state.message}</p>}
    </form>
  )
}`,
      },
      { type: HEADING_2, text: "搭配 Server Action 回傳驗證錯誤" },
      {
        type: PARAGRAPH,
        text: "Server Action 的第一個參數是上一次的狀態，第二個才是 `FormData`。回傳值會直接成為下一次渲染的 `state`，非常適合放 Zod 驗證後的錯誤訊息。",
      },
      {
        type: CODE,
        language: "ts",
        code: `"use server"

import { z } from "zod"

const schema = z.object({ email: z.email("請輸入有效的電子郵件") })

export async function subscribe(_prev: { message: string | null }, formData: FormData) {
  const result = schema.safeParse({ email: formData.get("email") })

  if (!result.success) {
    return { message: result.error.issues[0].message }
  }

  return { message: "訂閱成功，感謝你的支持！" }
}`,
      },
      { type: HEADING_2, text: "實務提醒" },
      {
        type: BULLET_LIST,
        items: [
          "子元件若需要讀取 pending 狀態，改用 `useFormStatus` 避免層層傳遞 props",
          "action 在 JavaScript 載入前也能運作，記得伺服器端一定要再驗證一次",
          "回傳的狀態物件需可序列化，不要放 `Date` 或函式",
        ],
      },
    ],
  },
  {
    slug: "react-server-components-mental-model",
    title: "深入理解 React Server Components 的心智模型",
    excerpt:
      "Server Component 不是 SSR 的新名字。本文用「兩個模組圖」的觀點，釐清 use client 邊界與資料流向。",
    categorySlug: "react",
    status: PUBLISHED,
    blocks: [
      {
        type: PARAGRAPH,
        text: "許多人初學 RSC 時會把它和傳統 SSR 混為一談。其實 SSR 解決的是「首屏 HTML」，而 RSC 解決的是「哪些程式碼根本不需要送到瀏覽器」。",
      },
      { type: HEADING_2, text: "兩張模組圖" },
      {
        type: PARAGRAPH,
        text: '可以把應用想像成兩張模組圖：伺服器圖與客戶端圖。`"use client"` 是兩張圖之間的**單向門**，門後的模組與其所有依賴都會被打包進瀏覽器。',
      },
      {
        type: CODE,
        language: "tsx",
        code: `// app/posts/page.tsx — Server Component，可直接存取資料庫
import { LikeButton } from "./like-button"
import { getPosts } from "@/lib/posts"

export default async function PostsPage() {
  const posts = await getPosts()

  return posts.map((post) => (
    <article key={post.id}>
      <h2>{post.title}</h2>
      <LikeButton postId={post.id} />
    </article>
  ))
}`,
      },
      { type: HEADING_3, text: "props 必須可序列化" },
      {
        type: PARAGRAPH,
        text: "跨越邊界的 props 會被序列化成 RSC Payload，因此不能傳遞函式（Server Action 除外）、類別實例或 Symbol。",
      },
      { type: HEADING_2, text: "把 use client 往葉節點推" },
      {
        type: PARAGRAPH,
        text: "越早宣告 `use client`，被迫進入客戶端的程式碼就越多。最佳實踐是只在真正需要互動的最小元件上標記，讓版面、資料取得都留在伺服器。",
      },
      {
        type: QUOTE,
        text: "Server Component 預設，Client Component 例外——這是 App Router 時代最重要的一條原則。",
      },
    ],
  },
  {
    slug: "tanstack-virtual-list-performance",
    title: "用 @tanstack/react-virtual 打造萬筆資料的流暢清單",
    excerpt:
      "DOM 節點數量決定捲動效能。示範如何只渲染可視範圍內的卡片，讓一萬筆資料也能維持 60fps。",
    categorySlug: "react",
    status: PUBLISHED,
    blocks: [
      {
        type: PARAGRAPH,
        text: "當清單超過數百筆，瀏覽器的排版與繪製成本會線性上升。虛擬滾動的核心概念很簡單：**只渲染看得到的項目**，其餘用一個撐高的容器假裝存在。",
      },
      { type: HEADING_2, text: "最小可行範例" },
      {
        type: CODE,
        language: "tsx",
        code: `"use client"

import { useRef } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"

export function VirtualList({ items }: { items: string[] }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  })

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((row) => (
          <div
            key={row.key}
            ref={virtualizer.measureElement}
            data-index={row.index}
            style={{ position: "absolute", top: 0, width: "100%", transform: "translateY(" + row.start + "px)" }}
          >
            {items[row.index]}
          </div>
        ))}
      </div>
    </div>
  )
}`,
      },
      { type: HEADING_2, text: "動態高度的關鍵：measureElement" },
      {
        type: PARAGRAPH,
        text: "卡片高度不固定時，`estimateSize` 只是初始猜測。把 `measureElement` 綁到每個項目，virtualizer 會用 ResizeObserver 回報實際高度並修正位置。",
      },
      { type: HEADING_2, text: "效能檢查清單" },
      {
        type: BULLET_LIST,
        items: [
          "用 `transform` 取代 `top` 定位，避免觸發重新排版",
          "`overscan` 設 3～8 即可，過大會失去虛擬化意義",
          "列表項目用 `memo` 包起來，避免捲動時整批重新渲染",
          "在 DevTools 的 Elements 面板確認 DOM 節點數量維持穩定",
        ],
      },
    ],
  },
  {
    slug: "nextjs-cache-components",
    title: "Next.js 16 Cache Components 與 use cache 實戰",
    excerpt:
      "Cache Components 讓「靜態外殼 + 動態串流」成為預設。整理 use cache、cacheLife 與 cacheTag 的使用時機。",
    categorySlug: "nextjs",
    status: PUBLISHED,
    blocks: [
      {
        type: PARAGRAPH,
        text: "Next.js 16 推出的 Cache Components 把快取決策從路由層級下放到元件與函式層級。啟用後，未快取的資料存取必須包在 `<Suspense>` 中，框架會自動產生靜態外殼並串流其餘內容。",
      },
      { type: HEADING_2, text: "啟用方式" },
      {
        type: CODE,
        language: "ts",
        code: `import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  cacheComponents: true,
}

export default nextConfig`,
      },
      { type: HEADING_2, text: "快取一個資料函式" },
      {
        type: CODE,
        language: "ts",
        code: `import { cacheLife, cacheTag } from "next/cache"

export async function getLatestPosts() {
  "use cache"
  cacheLife("hours")
  cacheTag("posts")

  const { data } = await supabase
    .from("posts")
    .select("id, title, slug, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(5)

  return data ?? []
}`,
      },
      {
        type: PARAGRAPH,
        text: '`cacheTag` 讓我們在後台發布文章時，能透過 `revalidateTag("posts")` 精準清除相關快取，而不必整站重建。',
      },
      { type: HEADING_2, text: "常見誤區" },
      {
        type: BULLET_LIST,
        items: [
          "`use cache` 函式內不能讀取 `cookies()` 或 `headers()`，需由外層取值後當參數傳入",
          "參數會成為快取鍵的一部分，請只傳遞可序列化的值",
          "開發模式下快取行為與正式環境不同，驗證請以 `pnpm build && pnpm start` 為準",
        ],
      },
    ],
  },
  {
    slug: "nextjs-on-demand-revalidation",
    title: "On-Demand Revalidation：讓部落格內容發布後立即更新",
    excerpt:
      "比起固定秒數的 ISR，按需重新驗證能兼顧靜態效能與即時性。以 Server Action 示範發布流程。",
    categorySlug: "nextjs",
    status: PUBLISHED,
    blocks: [
      {
        type: PARAGRAPH,
        text: "部落格這類內容「讀多寫少」，最理想的策略是頁面完全靜態化，只有在作者發布或修改時才重新產生。這正是 On-Demand Revalidation 的用武之地。",
      },
      { type: HEADING_2, text: "在 Server Action 中觸發" },
      {
        type: CODE,
        language: "ts",
        code: `"use server"

import { revalidatePath } from "next/cache"

export async function publishPost(postId: string) {
  const { error } = await supabase
    .from("posts")
    .update({ status: "published" })
    .eq("id", postId)

  if (error) {
    return { ok: false, message: "發布失敗，請稍後再試" }
  }

  revalidatePath("/")
  revalidatePath("/posts")

  return { ok: true, message: "文章已發布" }
}`,
      },
      { type: HEADING_2, text: "revalidatePath 與 revalidateTag 的選擇" },
      {
        type: BULLET_LIST,
        items: [
          "**revalidatePath**：以路由為單位，直覺好懂，適合頁面數量少的情境",
          "**revalidateTag**：以資料為單位，一篇文章同時出現在首頁、列表、分類頁時更精準",
          "兩者都只會標記快取失效，下一次請求才真正重新產生",
        ],
      },
      { type: QUOTE, text: "重新驗證一定要放在權限檢查之後，否則任何人都能讓你的快取失效。" },
    ],
  },
  {
    slug: "nextjs-proxy-auth-guard",
    title: "用 Next.js Proxy 實作後台路由防護",
    excerpt:
      "Next.js 16 將 middleware 更名為 proxy。示範如何在請求進入頁面前檢查 Supabase 工作階段並導向登入頁。",
    categorySlug: "nextjs",
    status: PUBLISHED,
    blocks: [
      {
        type: PARAGRAPH,
        text: "後台頁面若只在元件內檢查登入狀態，未授權的使用者仍會短暫看到畫面骨架。把防護前移到 Proxy 層，才能在第一時間攔截請求。",
      },
      { type: HEADING_2, text: "基本結構" },
      {
        type: CODE,
        language: "ts",
        code: `import { NextResponse, type NextRequest } from "next/server"

const LOGIN_PATH = "/admin/login"

export async function proxy(request: NextRequest) {
  const session = await getSessionFromCookies(request)
  const isLoginPage = request.nextUrl.pathname === LOGIN_PATH

  if (!session && !isLoginPage) {
    const loginUrl = new URL(LOGIN_PATH, request.url)
    loginUrl.searchParams.set("next", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}`,
      },
      { type: HEADING_2, text: "防禦性重點" },
      {
        type: BULLET_LIST,
        items: [
          "`next` 參數只允許站內相對路徑，避免開放式重導向（Open Redirect）",
          "Proxy 只是第一道防線，Server Action 與資料庫 RLS 仍需各自驗證身分",
          "matcher 要排除靜態資源，避免每張圖片都觸發身分驗證",
        ],
      },
    ],
  },
  {
    slug: "tailwind-v4-design-tokens",
    title: "Tailwind CSS v4 設計權杖與無閃爍深色模式",
    excerpt:
      "v4 改用 CSS-first 設定，搭配 OKLCH 色彩與 next-themes，打造一致又不閃爍的雙主題介面。",
    categorySlug: "css",
    status: PUBLISHED,
    blocks: [
      {
        type: PARAGRAPH,
        text: "Tailwind CSS v4 最大的改變是不再需要 `tailwind.config.js`，所有設計權杖都直接寫在 CSS 的 `@theme` 區塊中，讓設計系統回歸平台原生能力。",
      },
      { type: HEADING_2, text: "用 CSS 變數定義語意色彩" },
      {
        type: CODE,
        language: "css",
        code: `@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

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
}`,
      },
      { type: HEADING_2, text: "為什麼會閃爍？" },
      {
        type: PARAGRAPH,
        text: "伺服器不知道使用者偏好的主題，若等 React hydration 後才切換 class，畫面就會先亮後暗。`next-themes` 會在 `<head>` 注入一段阻塞腳本，在第一次繪製前就套用正確的 class。",
      },
      { type: HEADING_3, text: "別忘了 suppressHydrationWarning" },
      {
        type: PARAGRAPH,
        text: "因為腳本會改寫 `<html>` 的 class，伺服器與客戶端屬性必然不同，需在 `<html>` 加上 `suppressHydrationWarning`。這個屬性只作用一層，不會掩蓋子元件的真正錯誤。",
      },
    ],
  },
  {
    slug: "css-content-visibility",
    title: "content-visibility：長文頁面的效能救星",
    excerpt: "一行 CSS 就能讓瀏覽器跳過視窗外內容的排版與繪製，實測萬字長文首次渲染時間縮短 40%。",
    categorySlug: "css",
    status: PUBLISHED,
    blocks: [
      {
        type: PARAGRAPH,
        text: "技術文章動輒數千字、數十個程式碼區塊。瀏覽器預設會對整份文件排版，即使使用者只看得到第一屏。`content-visibility: auto` 讓瀏覽器延後處理畫面外的區塊。",
      },
      {
        type: CODE,
        language: "css",
        code: `.article-section {
  content-visibility: auto;
  contain-intrinsic-size: auto 800px;
}`,
      },
      { type: HEADING_2, text: "contain-intrinsic-size 不可省略" },
      {
        type: PARAGRAPH,
        text: "被跳過的區塊高度會變成 0，導致捲軸長度亂跳。`contain-intrinsic-size` 提供預估高度，加上 `auto` 關鍵字後，瀏覽器會記住實際渲染過的尺寸。",
      },
      { type: HEADING_2, text: "適用與不適用的情境" },
      {
        type: BULLET_LIST,
        items: [
          "適用：長文章、留言串、文件頁等靜態長內容",
          "不適用：需要錨點精準定位的極短區塊",
          "注意：被跳過的內容仍可被搜尋與無障礙工具讀取，不影響 SEO",
        ],
      },
    ],
  },
  {
    slug: "postgresql-rls-guide",
    title: "PostgreSQL Row Level Security 從入門到實戰",
    excerpt:
      "RLS 把權限檢查下放到資料庫，即使前端金鑰外洩也能守住資料。以部落格的草稿與發布為例逐步說明。",
    categorySlug: "postgresql",
    status: PUBLISHED,
    blocks: [
      {
        type: PARAGRAPH,
        text: "使用 Supabase 時，`anon` 金鑰會公開在瀏覽器中。真正保護資料的不是金鑰，而是資料庫層的 **Row Level Security**。",
      },
      { type: HEADING_2, text: "啟用 RLS 與撰寫政策" },
      {
        type: CODE,
        language: "sql",
        code: `alter table public.posts enable row level security;

create policy "訪客僅能讀取已發布文章" on public.posts
  for select to anon
  using (status = 'published' and published_at <= now());

create policy "管理員可讀寫全部文章" on public.posts
  for all to authenticated
  using (true) with check (true);`,
      },
      { type: HEADING_2, text: "USING 與 WITH CHECK 的差別" },
      {
        type: BULLET_LIST,
        items: [
          "`USING`：決定「哪些既有資料列看得到、改得到」",
          "`WITH CHECK`：決定「寫入後的新資料列是否合法」",
          "UPDATE 同時需要兩者，缺一可能造成資料被改到看不見的狀態",
        ],
      },
      { type: HEADING_2, text: "縱深防禦" },
      {
        type: PARAGRAPH,
        text: "除了政策，也建議用 `revoke insert, update, delete ... from anon` 在權限層再擋一次。政策寫錯時，這道保險能避免災難。",
      },
    ],
  },
  {
    slug: "postgresql-jsonb-indexing",
    title: "PostgreSQL JSONB 查詢技巧與 GIN 索引最佳化",
    excerpt: "Tiptap 的文件結構以 JSONB 儲存，該如何查詢特定節點？又該在什麼時候建立 GIN 索引？",
    categorySlug: "postgresql",
    status: PUBLISHED,
    blocks: [
      {
        type: PARAGRAPH,
        text: "富文本編輯器輸出的 JSON 結構適合存成 `jsonb`：可驗證、可查詢，也能被編輯器原封不動地回填。",
      },
      { type: HEADING_2, text: "常用運算子" },
      {
        type: CODE,
        language: "sql",
        code: `-- 取出頂層節點型別
select content_json ->> 'type' from posts;

-- 找出包含程式碼區塊的文章
select title
from posts
where content_json @> '{"content": [{"type": "codeBlock"}]}';`,
      },
      { type: HEADING_2, text: "GIN 索引" },
      {
        type: CODE,
        language: "sql",
        code: `create index posts_content_json_gin
  on posts using gin (content_json jsonb_path_ops);`,
      },
      {
        type: PARAGRAPH,
        text: "`jsonb_path_ops` 只支援 `@>` 包含查詢，但索引體積比預設的 `jsonb_ops` 小上許多。若查詢模式固定，優先選擇它。",
      },
      {
        type: QUOTE,
        text: "索引不是越多越好。每個索引都會拖慢寫入，請以實際查詢計畫（EXPLAIN ANALYZE）為依據。",
      },
    ],
  },
  {
    slug: "postgresql-recursive-cte",
    title: "用遞迴 CTE 處理樹狀分類資料",
    excerpt:
      "自關聯的 parent_id 設計簡單，但查詢整棵樹需要一點技巧。示範 WITH RECURSIVE 取出麵包屑與子孫節點。",
    categorySlug: "postgresql",
    status: PUBLISHED,
    blocks: [
      {
        type: PARAGRAPH,
        text: "分類表以 `parent_id` 自我關聯是最常見的樹狀設計，稱為 Adjacency List。它寫入簡單，查詢時則仰賴遞迴 CTE。",
      },
      { type: HEADING_2, text: "取得某分類的所有子孫" },
      {
        type: CODE,
        language: "sql",
        code: `with recursive tree as (
  select id, name, parent_id, 1 as depth
  from categories
  where slug = 'frontend'

  union all

  select c.id, c.name, c.parent_id, t.depth + 1
  from categories c
  join tree t on c.parent_id = t.id
)
select * from tree order by depth;`,
      },
      { type: HEADING_2, text: "限制層數的防呆" },
      {
        type: PARAGRAPH,
        text: "產品需求若只需要兩層分類，建議在資料庫以觸發器限制深度，而不是只靠前端表單。這樣即使透過 API 直接寫入，也不會產生第三層。",
      },
    ],
  },
  {
    slug: "nodejs-22-native-features",
    title: "Node.js 22 原生功能盤點：從型別剝除到內建測試",
    excerpt: "不裝套件也能跑 TypeScript、寫測試、監看檔案。整理 Node.js 22 值得立刻採用的新功能。",
    categorySlug: "nodejs",
    status: PUBLISHED,
    blocks: [
      {
        type: PARAGRAPH,
        text: "Node.js 22 是目前的 LTS 版本，內建許多過去需要第三方套件才能完成的功能，讓工具鏈更精簡。",
      },
      { type: HEADING_2, text: "直接執行 TypeScript" },
      {
        type: CODE,
        language: "bash",
        code: `node --experimental-strip-types scripts/seed/generate.ts`,
      },
      {
        type: PARAGRAPH,
        text: "型別剝除只移除型別註記，不做型別檢查，也不支援 `enum` 這類需要轉譯的語法。搭配 `tsc --noEmit` 就能兼顧速度與安全。",
      },
      { type: HEADING_2, text: "內建測試執行器" },
      {
        type: CODE,
        language: "ts",
        code: `import { test } from "node:test"
import assert from "node:assert/strict"

import { slugify } from "./slugify.ts"

test("將中英混合標題轉為網址代稱", () => {
  assert.equal(slugify("Hello 世界"), "hello")
})`,
      },
      { type: HEADING_2, text: "其他好用功能" },
      {
        type: BULLET_LIST,
        items: [
          "`node --watch`：取代 nodemon",
          "`node --env-file=.env`：取代 dotenv",
          "`require(esm)`：CommonJS 也能載入 ES Module",
        ],
      },
    ],
  },
  {
    slug: "zod-runtime-validation",
    title: "Zod 執行期驗證：前後端共用的型別防線",
    excerpt: "TypeScript 只活在編譯期。用 Zod 定義一次結構，同時取得型別推導與繁體中文錯誤訊息。",
    categorySlug: "nodejs",
    status: PUBLISHED,
    blocks: [
      {
        type: PARAGRAPH,
        text: "來自表單、API、資料庫的資料在執行期都是 `unknown`。Zod 讓我們用一份 schema 同時完成驗證與型別推導，杜絕「型別說有、實際沒有」的錯覺。",
      },
      { type: HEADING_2, text: "定義與推導" },
      {
        type: CODE,
        language: "ts",
        code: `import { z } from "zod"

export const postStatusSchema = z.enum(["draft", "published"])

export const postFormSchema = z.object({
  title: z.string().trim().min(1, "請輸入文章標題").max(120, "標題不可超過 120 字"),
  slug: z.string().regex(/^[a-z0-9-]+$/, "網址代稱僅能包含小寫英文、數字與連字號"),
  status: postStatusSchema,
})

export type PostFormValues = z.infer<typeof postFormSchema>`,
      },
      { type: HEADING_2, text: "用列舉取代魔術字串" },
      {
        type: PARAGRAPH,
        text: '把 `"draft"`、`"published"` 集中定義在 `z.enum`，程式各處透過 `postStatusSchema.enum.draft` 取用，打錯字時編譯器會直接提醒。',
      },
      { type: HEADING_2, text: "safeParse 與 parse" },
      {
        type: BULLET_LIST,
        items: [
          "`safeParse` 回傳結果物件，適合表單驗證等「預期會失敗」的情境",
          "`parse` 失敗時拋出例外，適合環境變數等「失敗就該中止」的情境",
        ],
      },
    ],
  },
  {
    slug: "docker-multi-stage-nextjs",
    title: "Docker 多階段建置：把 Next.js 映像檔瘦身到 150MB",
    excerpt: "善用 output: standalone 與多階段建置，讓部署映像檔只包含執行所需的最小檔案。",
    categorySlug: "docker",
    status: PUBLISHED,
    blocks: [
      {
        type: PARAGRAPH,
        text: '直接把整個專案複製進映像檔，動輒超過 1GB。透過 Next.js 的 `output: "standalone"` 搭配多階段建置，可以只保留追蹤到的必要依賴。',
      },
      { type: HEADING_2, text: "Dockerfile 範例" },
      {
        type: CODE,
        language: "dockerfile",
        code: `FROM node:22-alpine AS base
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
CMD ["node", "server.js"]`,
      },
      { type: HEADING_2, text: "安全性細節" },
      {
        type: BULLET_LIST,
        items: [
          "最終階段以 `USER node` 執行，避免容器內取得 root 權限",
          "建置期的機密變數使用 `--secret` 掛載，不要寫進 `ENV`",
          "加入 `.dockerignore` 排除 `.env` 與 `.git`",
        ],
      },
    ],
  },
  {
    slug: "github-actions-pnpm-cache",
    title: "GitHub Actions 搭配 pnpm 快取，CI 時間減半",
    excerpt:
      "pnpm 的內容定址儲存非常適合快取。示範一份同時執行格式檢查、型別檢查與建置的工作流程。",
    categorySlug: "ci-cd",
    status: PUBLISHED,
    blocks: [
      {
        type: PARAGRAPH,
        text: "CI 最花時間的往往是安裝依賴。pnpm 把所有套件存放在全域 store，只要快取這個目錄，後續安裝幾乎只剩建立連結。",
      },
      {
        type: CODE,
        language: "yaml",
        code: `name: CI

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
      - run: pnpm build`,
      },
      { type: HEADING_2, text: "重點說明" },
      {
        type: BULLET_LIST,
        items: [
          "`pnpm/action-setup` 會讀取 `package.json` 的 `packageManager` 欄位，版本與本機一致",
          "`node-version-file` 指向 `.nvmrc`，避免 Node 版本在多處重複定義",
          "`--frozen-lockfile` 確保 lockfile 與 package.json 不一致時直接失敗",
        ],
      },
    ],
  },
  {
    slug: "xss-defense-dompurify",
    title: "XSS 防禦實務：DOMPurify 與 CSP 雙重保險",
    excerpt:
      "部落格輸出使用者撰寫的 HTML 時，該如何避免跨站腳本攻擊？從消毒到內容安全政策一次說清楚。",
    categorySlug: "web-security",
    status: PUBLISHED,
    blocks: [
      {
        type: PARAGRAPH,
        text: "只要頁面使用 `dangerouslySetInnerHTML`，就等於信任了那段 HTML。即使內容來自管理員，也可能因帳號遭竊或編輯器漏洞而被植入惡意腳本。",
      },
      { type: HEADING_2, text: "第一道防線：伺服器端消毒" },
      {
        type: CODE,
        language: "ts",
        code: `import DOMPurify from "isomorphic-dompurify"

export function sanitizeArticleHtml(html: string) {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "iframe", "form"],
    FORBID_ATTR: ["style", "onerror", "onclick"],
  })
}`,
      },
      { type: HEADING_2, text: "第二道防線：Content Security Policy" },
      {
        type: PARAGRAPH,
        text: "CSP 告訴瀏覽器「只執行來自可信來源的腳本」。即使消毒有疏漏，沒有 nonce 的行內腳本也無法執行。",
      },
      { type: HEADING_2, text: "常見錯誤" },
      {
        type: BULLET_LIST,
        items: [
          "只在儲存時消毒、輸出時沒有——規則更新後舊資料仍不安全",
          "允許 `javascript:` 協定的連結",
          '外部連結忘了加上 `rel="noopener noreferrer"`',
        ],
      },
    ],
  },
  {
    slug: "server-actions-csrf-protection",
    title: "Server Actions 的 CSRF 防護機制解析",
    excerpt: "Server Action 本質上是公開的 POST 端點。Next.js 內建了哪些保護？我們還需要補上什麼？",
    categorySlug: "web-security",
    status: PUBLISHED,
    blocks: [
      {
        type: PARAGRAPH,
        text: "每個 Server Action 都會被編譯成一個可透過 POST 呼叫的端點。理解它的安全模型，才能避免把資料庫操作直接暴露給全世界。",
      },
      { type: HEADING_2, text: "Next.js 的內建保護" },
      {
        type: BULLET_LIST,
        items: [
          "只接受 POST 方法",
          "比對 `Origin` 與 `Host` 標頭，拒絕跨站請求",
          "Action ID 經過加密且會隨建置變動，無法被猜測",
        ],
      },
      { type: HEADING_2, text: "仍需自行處理的部分" },
      {
        type: CODE,
        language: "ts",
        code: `"use server"

export async function deletePost(postId: string) {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error("尚未登入，無法執行此操作")
  }

  const id = z.uuid().parse(postId)

  await supabase.from("posts").delete().eq("id", id)
}`,
      },
      {
        type: QUOTE,
        text: "把每一個 Server Action 都當成公開 API 來設計：驗證身分、驗證輸入、最小權限。",
      },
    ],
  },
  {
    slug: "supabase-storage-orphan-cleanup",
    title: "Supabase Storage 孤兒檔案清理策略",
    excerpt: "文章刪掉了，圖片還留在儲存桶裡。設計一個安全的掃描與清理流程，避免儲存空間無限膨脹。",
    categorySlug: "postgresql",
    status: DRAFT,
    blocks: [
      {
        type: PARAGRAPH,
        text: "編輯器拖放上傳圖片很方便，但使用者刪除圖片或放棄草稿時，Storage 裡的檔案並不會跟著消失。",
      },
      { type: HEADING_2, text: "掃描流程" },
      {
        type: BULLET_LIST,
        items: [
          "列出儲存桶中的所有物件路徑",
          "從 `content_html` 與 `cover_image_url` 擷取所有引用中的圖片網址",
          "取差集即為孤兒檔案，並排除 24 小時內上傳的檔案避免誤刪編輯中的內容",
        ],
      },
      {
        type: CODE,
        language: "ts",
        code: `export function findOrphanPaths(storedPaths: string[], referencedPaths: Set<string>) {
  return storedPaths.filter((path) => !referencedPaths.has(path))
}`,
      },
    ],
  },
  {
    slug: "webauthn-passkey-notes",
    title: "WebAuthn 與 Passkey 無密碼登入實作筆記",
    excerpt: "整理 Passkey 註冊與驗證流程中容易踩雷的細節。",
    categorySlug: "web-security",
    status: DRAFT,
    blocks: [
      {
        type: PARAGRAPH,
        text: "Passkey 以公私鑰取代密碼，從根本上杜絕釣魚與密碼重用問題。本篇仍在撰寫中。",
      },
      { type: HEADING_2, text: "待補充章節" },
      {
        type: BULLET_LIST,
        items: [
          "Relying Party ID 的設定原則",
          "挑戰值（challenge）的產生與保存",
          "跨裝置同步與備援登入方式",
        ],
      },
    ],
  },
]

export const projects: SeedProject[] = [
  {
    slug: "bryan-log",
    title: "Bryan Log 個人品牌網站",
    summary:
      "以 Next.js 16 與 Supabase 打造的技術部落格與作品集，具備 RLS 權限控管、Tiptap 編輯器與 ISR 即時重新驗證。",
    categorySlug: "fullstack",
    techStack: ["Next.js", "React 19", "TypeScript", "Supabase", "Tiptap", "Tailwind CSS"],
    isFeatured: true,
    demoUrl: "https://example.com",
    repoUrl: "https://github.com/example/bryan-log",
    blocks: [
      {
        type: PARAGRAPH,
        text: "這個網站本身就是作品：從資料庫綱要、權限政策到前台渲染策略，都以正式產品的標準設計。",
      },
      { type: HEADING_2, text: "技術亮點" },
      {
        type: BULLET_LIST,
        items: [
          "文章雙存 `content_json` 與 `content_html`，兼顧編輯回填與 SSR 效能",
          "PostgreSQL RLS 確保匿名訪客只能讀取已發布內容",
          "`@tanstack/react-virtual` 虛擬滾動，大量卡片依然流暢",
        ],
      },
    ],
  },
  {
    slug: "taskflow-realtime-kanban",
    title: "TaskFlow 即時協作看板",
    summary:
      "支援多人同步拖曳的看板工具，透過 Supabase Realtime 廣播變更，並以樂觀更新維持操作手感。",
    categorySlug: "saas",
    techStack: ["Next.js", "Supabase Realtime", "dnd-kit", "Zustand", "Playwright"],
    isFeatured: true,
    demoUrl: "https://example.com/taskflow",
    repoUrl: "https://github.com/example/taskflow",
    blocks: [
      {
        type: PARAGRAPH,
        text: "團隊在遠端協作時，最怕看板狀態不同步。TaskFlow 讓每一次拖曳都在 200 毫秒內同步到所有成員畫面。",
      },
      { type: HEADING_2, text: "架構設計" },
      {
        type: BULLET_LIST,
        items: [
          "以分數排序（fractional indexing）避免重新排序時大量更新",
          "衝突時以伺服器版本為準並提示使用者",
          "Playwright 多分頁測試驗證同步行為",
        ],
      },
    ],
  },
  {
    slug: "taipei-bus-tracker",
    title: "臺北公車即時動態查詢 PWA",
    summary: "串接交通部 TDX 開放資料，提供到站預估、路線地圖與離線收藏站牌的漸進式網頁應用程式。",
    categorySlug: "fullstack",
    techStack: ["React", "TDX API", "Leaflet", "Service Worker", "Vite"],
    isFeatured: true,
    demoUrl: "https://example.com/bus",
    repoUrl: "https://github.com/example/taipei-bus",
    blocks: [
      {
        type: PARAGRAPH,
        text: "通勤時最需要的資訊只有一個：下一班車還有幾分鐘。這個 PWA 把查詢步驟縮短到一次點擊。",
      },
      { type: HEADING_2, text: "技術挑戰" },
      {
        type: BULLET_LIST,
        items: [
          "TDX API 有頻率限制，以邊緣快取合併相同請求",
          "Service Worker 快取收藏站牌，地下道也能查看最後一次資料",
          "地圖標記超過千個時改用 Canvas 圖層渲染",
        ],
      },
    ],
  },
  {
    slug: "zh-lint",
    title: "zh-lint 中文文案排版檢查工具",
    summary: "自動檢查中英文間距、全半形標點與常見錯字的開源工具，可整合進編輯器與 CI 流程。",
    categorySlug: "open-source",
    techStack: ["TypeScript", "unified", "remark", "Vitest"],
    isFeatured: false,
    demoUrl: null,
    repoUrl: "https://github.com/example/zh-lint",
    blocks: [
      {
        type: PARAGRAPH,
        text: "中文技術文件常見「中英文之間要不要空格」、「全形還是半形括號」等爭議。zh-lint 把團隊共識寫成可執行的規則。",
      },
      { type: CODE, language: "bash", code: `pnpm dlx zh-lint "docs/**/*.md" --fix` },
    ],
  },
  {
    slug: "shipit-cli",
    title: "shipit 一鍵部署命令列工具",
    summary: "將建置、映像檔推送與健康檢查整合為單一指令，支援自動回滾與 Slack 通知。",
    categorySlug: "cli",
    techStack: ["Node.js", "Commander", "Docker", "Zod"],
    isFeatured: false,
    demoUrl: null,
    repoUrl: "https://github.com/example/shipit",
    blocks: [
      {
        type: PARAGRAPH,
        text: "小團隊不一定需要完整的 Kubernetes。shipit 用一個設定檔描述部署目標，讓上線流程可重複、可追蹤。",
      },
      { type: HEADING_2, text: "主要功能" },
      {
        type: BULLET_LIST,
        items: [
          "部署前以 Zod 驗證設定檔，錯誤訊息直接指出欄位",
          "健康檢查失敗時自動回滾到上一個版本",
          "所有操作記錄寫入本機日誌，方便事後稽核",
        ],
      },
    ],
  },
]
