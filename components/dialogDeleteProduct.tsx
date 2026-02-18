import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { useProducts } from "@/lib/store/hookZustand";
import { toast } from "sonner";
import { broadcast, CHANNELS, EVENTS } from "@/lib/supabase/realtime";
import { useState } from "react";

export function DialogDeleteProduct({ id }: { id: string }) {
  const { deleteProduct } = useProducts();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteProduct(id);
      toast.success("Product deleted successfully");

      // Broadcast product deletion (non-blocking)
      broadcast(CHANNELS.PRODUCTS, EVENTS.PRODUCT_DELETED, {
        productId: id,
      }).catch((err) => {
        console.warn("[Realtime] broadcast failed:", err);
      });
    } catch (error) {
      console.error("Failed to delete product:", error);
      toast.error("Failed to delete product");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger className="hover:underline hover:cursor-pointer hover:scale-110 transition-transform duration-300 pr-4 ml-1">
        Delete
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your
            product and remove your data from our servers.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
