import Image from "next/image"

type CoverImageProps = {
  src: string
  alt: string
}

// 封面位於首屏，以 preload 提早載入（Next.js 16 起取代已棄用的 priority）
export function CoverImage({ src, alt }: CoverImageProps) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl border bg-muted">
      <Image
        src={src}
        alt={alt}
        fill
        preload
        sizes="(min-width: 768px) 720px, 100vw"
        className="object-cover"
      />
    </div>
  )
}
