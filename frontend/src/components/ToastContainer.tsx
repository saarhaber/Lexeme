import React from "react";
import SuccessToast, { Toast } from "./SuccessToast";

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 z-40 flex justify-center px-4"
      style={{ top: "calc(1rem + var(--safe-area-top))" }}
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      <div className="flex w-full max-w-md flex-col gap-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <SuccessToast toast={toast} onDismiss={onDismiss} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToastContainer;
