import { Control, useFormState, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import {
  InlineEditCard,
  InlineImageField,
  InlineTextField,
  InlineTextareaField,
} from "../../../../../components/common/inline-edit"
import { FileType } from "../../../../../components/common/file-upload"
import { StoreSettingsSchemaType } from "../../constants"

interface InlineStoreCardProps {
  control: Control<StoreSettingsSchemaType>
  /** Existing saved logo URL (seller.photo) for the logo preview fallback. */
  sellerPhoto?: string
  onLogoUploaded: (files: FileType[]) => void
  onCoverUploaded: (files: FileType[]) => void
  onCoverRemove: () => void
}

/**
 * Merchant "Store" card, edited inline. Replaces the old read-only
 * StoreGeneralSection + its edit drawer. Storefront-specific fields (logo,
 * cover, description, shipping/return policy) live here since only merchants
 * have a storefront.
 */
export const InlineStoreCard = ({
  control,
  sellerPhoto,
  onLogoUploaded,
  onCoverUploaded,
  onCoverRemove,
}: InlineStoreCardProps) => {
  const { t } = useTranslation()
  const media = useWatch({ control, name: "media" })
  const coverMedia = useWatch({ control, name: "cover_media" })
  const { errors } = useFormState({ control })

  return (
    <InlineEditCard title={t("store.domain")}>
      <InlineImageField
        control={control}
        name="media"
        label="Logo"
        currentImageUrl={sellerPhoto}
        previewUrl={media?.[0]?.url}
        onUploaded={onLogoUploaded}
        hasError={!!errors.media}
      />
      <InlineImageField
        control={control}
        name="cover_media"
        label="Cover photo"
        optional
        hint="Hero banner shown at the top of your storefront page. Wide aspect ratio works best (≥ 1200×400)."
        previewUrl={coverMedia?.[0]?.url}
        onUploaded={onCoverUploaded}
        onRemove={onCoverRemove}
        removeLabel="Remove cover photo"
        hasError={!!errors.cover_media}
      />
      <InlineTextField control={control} name="name" label="Name" />
      <InlineTextField control={control} name="email" label="Email" type="email" />
      <InlineTextField
        control={control}
        name="phone"
        label="Phone Number"
        type="tel"
      />
      <InlineTextareaField
        control={control}
        name="description"
        label="Description"
        optional
      />
      <InlineTextareaField
        control={control}
        name="refund_policy"
        label="Shipping & return policy"
        optional
        rows={6}
        hint="Plain text, shown on your storefront and product pages so buyers know your terms before they purchase. Include BOTH your shipping timeline (how long orders take to ship and arrive) and your return terms (whether you accept returns, the window, and any conditions). Line breaks preserved."
      />
    </InlineEditCard>
  )
}
