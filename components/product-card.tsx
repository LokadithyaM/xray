import type { Product } from "@/lib/data"
import { Star } from "lucide-react"

export function ProductCard({ product }: { product: Product }) {
  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10">
      <div className="aspect-square overflow-hidden rounded-lg bg-zinc-900">
        <img
          src={"/next.svg"}
          alt={product.name}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
            {product.sport} • {product.brand}
          </span>
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            <span className="text-xs font-semibold text-white">{product.rating}.0</span>
          </div>
        </div>
        <h3 className="text-base font-semibold text-white line-clamp-1">{product.name}</h3>
        <p className="text-lg font-bold text-white">${product.price}</p>
        <p className="text-xs text-white/40">{product.reviews} reviews</p>
      </div>
    </div>
  )
}
