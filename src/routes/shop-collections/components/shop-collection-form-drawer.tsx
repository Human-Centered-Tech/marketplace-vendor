import {
  Button,
  Drawer,
  Heading,
  Input,
  Label,
  RadioGroup,
  Switch,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useRef, useState } from "react"
import { Combobox } from "../../../components/inputs/combobox"
import { fetchQuery, uploadFilesQuery } from "../../../lib/client"
import { useComboboxData } from "../../../hooks/use-combobox-data"
import {
  CreateVendorCollectionPayload,
  UpdateVendorCollectionPayload,
  VendorCollection,
  useCreateVendorCollection,
  useUpdateVendorCollection,
} from "../../../hooks/api/vendor-collections"

type Mode = "create" | "edit"

type Props = {
  mode: Mode
  open: boolean
  onClose: () => void
  collection?: VendorCollection
}

const slugify = (v: string) =>
  v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")

export const ShopCollectionFormDrawer = ({
  mode,
  open,
  onClose,
  collection,
}: Props) => {
  const [title, setTitle] = useState(collection?.title ?? "")
  const [slug, setSlug] = useState(collection?.slug ?? "")
  const [slugTouched, setSlugTouched] = useState(false)
  const [subtitle, setSubtitle] = useState(collection?.subtitle ?? "")
  const [description, setDescription] = useState(collection?.description ?? "")
  const [tagIds, setTagIds] = useState<string[]>(collection?.tag_ids ?? [])
  const [matchMode, setMatchMode] = useState<"any" | "all">(
    collection?.tag_match_mode ?? "any"
  )
  const [isVisible, setIsVisible] = useState(collection?.is_visible ?? true)
  const [hideWhenEmpty, setHideWhenEmpty] = useState(
    collection?.hide_when_empty ?? true
  )
  const [imageUrl, setImageUrl] = useState<string | null>(
    collection?.image_url ?? null
  )
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const tags = useComboboxData({
    queryKey: ["product_tags", "collection_form"],
    queryFn: (params) =>
      fetchQuery("/vendor/product-tags", {
        method: "GET",
        query: params as { [k: string]: string | number },
      }),
    getOptions: (data: any) =>
      data.product_tags.map((t: any) => ({
        label: t.label || t.value,
        value: t.id,
      })),
  })

  const { mutateAsync: createCollection, isPending: isCreating } =
    useCreateVendorCollection()
  const { mutateAsync: updateCollection, isPending: isUpdating } =
    useUpdateVendorCollection(collection?.id ?? "")

  const isPending = isCreating || isUpdating

  const effectiveSlug = slug || slugify(title)

  const handleTitleChange = (v: string) => {
    setTitle(v)
    if (!slugTouched) setSlug(slugify(v))
  }

  const handleImageSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const result: any = await uploadFilesQuery([{ file }])
      const raw = result?.files?.[0]?.url
      if (!raw) {
        throw new Error("Upload returned no URL")
      }
      // The local file backend returns URLs with the original filename
      // verbatim — spaces, commas, etc. The URL constructor normalizes the
      // path component without double-encoding existing %XX sequences.
      const url = new URL(raw).href
      setImageUrl(url)
    } catch (err: any) {
      toast.error(err?.message || "Image upload failed")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required")
      return
    }
    try {
      if (mode === "create") {
        const payload: CreateVendorCollectionPayload = {
          title: title.trim(),
          slug: effectiveSlug || undefined,
          subtitle: subtitle.trim() || undefined,
          description: description.trim() || undefined,
          image_url: imageUrl || undefined,
          tag_ids: tagIds,
          tag_match_mode: matchMode,
          is_visible: isVisible,
          hide_when_empty: hideWhenEmpty,
        }
        await createCollection(payload)
        toast.success("Collection created")
      } else if (collection) {
        const payload: UpdateVendorCollectionPayload = {
          title: title.trim(),
          slug: effectiveSlug,
          subtitle: subtitle.trim() || null,
          description: description.trim() || null,
          image_url: imageUrl,
          tag_ids: tagIds,
          tag_match_mode: matchMode,
          is_visible: isVisible,
          hide_when_empty: hideWhenEmpty,
        } as UpdateVendorCollectionPayload
        await updateCollection(payload)
        toast.success("Collection updated")
      }
      onClose()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title asChild>
            <Heading>
              {mode === "create" ? "New Collection" : "Edit Collection"}
            </Heading>
          </Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-y-5 overflow-y-auto">
          <Field label="Title" required>
            <Input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. Bestsellers"
            />
          </Field>
          <Field
            label="Slug"
            hint="Used in the URL: /sellers/your-shop/collections/<slug>"
          >
            <Input
              value={effectiveSlug}
              onChange={(e) => {
                setSlug(e.target.value)
                setSlugTouched(true)
              }}
              placeholder="bestsellers"
            />
          </Field>
          <Field label="Subtitle" hint="One-line tagline shown under the title">
            <Input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </Field>
          <Field
            label="Cover image"
            hint="Shown on the collection card on your shop page and at the top of the collection page"
          >
            <div className="flex items-start gap-4">
              {imageUrl ? (
                <div className="relative w-32 h-32 rounded-md overflow-hidden border bg-ui-bg-subtle shrink-0">
                  <img
                    src={imageUrl}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-md border border-dashed flex items-center justify-center text-ui-fg-muted text-xs shrink-0">
                  No image
                </div>
              )}
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelected}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                  isLoading={isUploading}
                >
                  {imageUrl ? "Replace image" : "Upload image"}
                </Button>
                {imageUrl && (
                  <Button
                    type="button"
                    variant="transparent"
                    size="small"
                    onClick={() => setImageUrl(null)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </Field>
          <Field
            label="Tags (rule)"
            hint="Products with these tags will appear in the collection"
          >
            <Combobox
              value={tagIds}
              onChange={(v) => setTagIds((v as string[]) ?? [])}
              multiple
              options={tags.options}
              searchValue={tags.searchValue}
              onSearchValueChange={tags.onSearchValueChange}
            />
          </Field>
          <Field
            label="Match mode"
            hint="'any' = product has at least one of these tags. 'all' = product has every one."
          >
            <RadioGroup
              value={matchMode}
              onValueChange={(v) => setMatchMode(v as "any" | "all")}
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroup.Item id="mm-any" value="any" />
                  <Label htmlFor="mm-any" className="text-sm">
                    Any tag
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroup.Item id="mm-all" value="all" />
                  <Label htmlFor="mm-all" className="text-sm">
                    All tags
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </Field>
          <Field label="Visibility">
            <div className="flex items-center gap-2">
              <Switch
                id="is-visible"
                checked={isVisible}
                onCheckedChange={setIsVisible}
              />
              <Label htmlFor="is-visible" className="text-sm">
                Visible on storefront
              </Label>
            </div>
          </Field>
          <Field label="Empty handling">
            <div className="flex items-center gap-2">
              <Switch
                id="hide-empty"
                checked={hideWhenEmpty}
                onCheckedChange={setHideWhenEmpty}
              />
              <Label htmlFor="hide-empty" className="text-sm">
                Hide from storefront when no products match
              </Label>
            </div>
          </Field>
        </Drawer.Body>
        <Drawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <Button variant="secondary" size="small" onClick={onClose}>
              Cancel
            </Button>
            <Button size="small" onClick={handleSubmit} isLoading={isPending}>
              {mode === "create" ? "Create" : "Save"}
            </Button>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

const Field = ({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) => (
  <div className="flex flex-col gap-1.5">
    <Label className="text-sm">
      {label}
      {required && <span className="text-ui-fg-error"> *</span>}
    </Label>
    {children}
    {hint && (
      <Text size="xsmall" className="text-ui-fg-subtle">
        {hint}
      </Text>
    )}
  </div>
)
