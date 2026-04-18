import { Link } from "react-router-dom";
import { Product } from "../api";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={product.image_url}
          alt={product.name}
          className="h-full w-full object-cover transition group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://placehold.co/600x600/16a34a/fbbf24?text=Brasil+2026";
          }}
        />
        {product.featured === 1 && (
          <span className="absolute left-3 top-3 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-green-900">
            DESTAQUE
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-green-700">
          {product.category}
        </span>
        <h3 className="mt-1 line-clamp-2 text-sm font-bold text-gray-900">{product.name}</h3>
        <div className="mt-auto pt-3">
          <div className="text-lg font-extrabold text-green-700">
            R$ {product.price.toFixed(2).replace(".", ",")}
          </div>
          <div className="text-xs text-gray-500">
            ou 10x de R$ {(product.price / 10).toFixed(2).replace(".", ",")} sem juros
          </div>
        </div>
      </div>
    </Link>
  );
}
