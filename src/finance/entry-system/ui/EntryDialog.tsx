// Dialog composition follows the project's shadcn/ui + Radix primitives (MIT).
import * as Dialog from "@radix-ui/react-dialog";
import { useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
export function EntryDialog({
  title,
  description,
  children,
  onClose,
  dirty = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  dirty?: boolean;
}) {
  const opener = useRef(document.activeElement as HTMLElement | null);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const requestClose = () => {
    if (!dirtyRef.current || confirm("Descartar as alterações não salvas?"))
      onClose();
  };
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) requestClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="entry-overlay" />
        <Dialog.Content
          className="entry-dialog"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            opener.current?.focus({ preventScroll: true });
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            requestClose();
          }}
          onPointerDownOutside={(e) => {
            e.preventDefault();
            requestClose();
          }}
        >
          <header className="entry-dialog-header">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>
                {description || "Organize sua movimentação com clareza."}
              </Dialog.Description>
            </div>
            <Button
              variant="ghost"
              aria-label="Fechar lançamento"
              onClick={requestClose}
            >
              <X aria-hidden="true" />
            </Button>
          </header>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
