import { Button, Container, Heading, Badge, toast } from "@medusajs/ui"
import { PencilSquare, Trash, Plus } from "@medusajs/icons"
import { useState } from "react"
import {
  useVendorCollections,
  useDeleteVendorCollection,
  VendorCollection,
} from "../../../hooks/api/vendor-collections"
import { ShopCollectionFormDrawer } from "../components/shop-collection-form-drawer"

export const ShopCollectionList = () => {
  const { collections = [], isPending, isError, error } = useVendorCollections({
    limit: 100,
  })
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<VendorCollection | null>(null)

  if (isError) throw error

  return (
    <Container className="flex flex-col gap-4 px-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading>Shop Collections</Heading>
          <p className="text-ui-fg-subtle text-sm mt-1">
            Group your products into shopper-facing sections on your
            storefront. Each collection pulls products from the tags you pick.
          </p>
        </div>
        <Button
          variant="secondary"
          size="small"
          onClick={() => setCreateOpen(true)}
        >
          <Plus />
          New Collection
        </Button>
      </div>

      {isPending && (
        <p className="text-ui-fg-subtle text-sm">Loading…</p>
      )}

      {!isPending && collections.length === 0 && (
        <div className="border border-dashed rounded-md p-8 text-center">
          <p className="text-ui-fg-subtle">
            No collections yet. Create one to group your products into a
            browsable section on your shop page.
          </p>
        </div>
      )}

      {collections.length > 0 && (
        <div className="flex flex-col divide-y border rounded-md">
          {collections.map((c) => (
            <ShopCollectionRow
              key={c.id}
              collection={c}
              onEdit={() => setEditing(c)}
            />
          ))}
        </div>
      )}

      {createOpen && (
        <ShopCollectionFormDrawer
          mode="create"
          open={createOpen}
          onClose={() => setCreateOpen(false)}
        />
      )}
      {editing && (
        <ShopCollectionFormDrawer
          mode="edit"
          collection={editing}
          open={!!editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Container>
  )
}

const ShopCollectionRow = ({
  collection,
  onEdit,
}: {
  collection: VendorCollection
  onEdit: () => void
}) => {
  const { mutateAsync: deleteCollection, isPending: isDeleting } =
    useDeleteVendorCollection(collection.id)

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Delete the collection "${collection.title}"? Products in it stay; only the grouping goes away.`
      )
    ) {
      return
    }
    try {
      await deleteCollection()
      toast.success("Collection deleted")
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{collection.title}</span>
          {!collection.is_visible && (
            <Badge size="2xsmall" color="grey">
              Hidden
            </Badge>
          )}
          <Badge size="2xsmall" color="grey">
            match: {collection.tag_match_mode}
          </Badge>
        </div>
        <span className="text-ui-fg-subtle text-xs truncate">
          /{collection.slug} · {collection.tag_ids.length} tag
          {collection.tag_ids.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="transparent" size="small" onClick={onEdit}>
          <PencilSquare />
          Edit
        </Button>
        <Button
          variant="transparent"
          size="small"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          <Trash />
        </Button>
      </div>
    </div>
  )
}
