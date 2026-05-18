import { useTranslation } from "react-i18next"

import { Thumbnail } from "../../../../common/thumbnail"
import { HttpTypes } from "@medusajs/types"

type ProductCellProps = {
  product: Pick<HttpTypes.AdminProduct, "thumbnail" | "title" | "images">
}

export const ProductCell = ({ product }: ProductCellProps) => {
  // Fall back to the first uploaded image when no explicit thumbnail is set.
  // Medusa returns product.images ordered by rank, so [0] is the canonical
  // "first" image. Without this fallback, products that have images but no
  // designated thumbnail render the placeholder icon on the list.
  const src = product.thumbnail ?? product.images?.[0]?.url ?? null

  return (
    <div className="flex h-full w-full max-w-[250px] items-center gap-x-3 overflow-hidden">
      <div className="w-fit flex-shrink-0">
        <Thumbnail src={src} />
      </div>
      <span title={product.title} className="truncate">
        {product.title}
      </span>
    </div>
  )
}

export const ProductHeader = () => {
  const { t } = useTranslation()

  return (
    <div className="flex h-full w-full items-center">
      <span>{t("fields.product")}</span>
    </div>
  )
}
