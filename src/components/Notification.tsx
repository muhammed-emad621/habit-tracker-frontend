import { useEffect, useRef } from "react";

type NotificationProps = {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
};

export default function Notification({ message, type, onClose, onConfirm, onCancel, confirmText = "Yes", cancelText = "No" }: NotificationProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!onConfirm) {
      const timer = setTimeout(() => onCloseRef.current(), 3000); // Auto-close after 3 seconds for non-confirmation notifications
      return () => clearTimeout(timer);
    }
  }, [onConfirm]);

  const bgColor = type === "success" ? "bg-green-500" : type === "error" ? "bg-red-500" : "bg-blue-500";

  if (onConfirm) {
    // Modal style for confirmations
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <div className={`p-6 rounded-lg text-white shadow-lg ${bgColor} max-w-sm w-full mx-4`}>
          <div className="flex flex-col items-center">
            <span className="text-center mb-6 text-lg font-semibold">{message}</span>
            <div className="flex gap-3">
              <button onClick={onConfirm} className="px-6 py-2 bg-white text-gray-800 rounded hover:bg-gray-100 font-medium">
                {confirmText}
              </button>
              <button onClick={onCancel || onClose} className="px-6 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 font-medium">
                {cancelText}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular notification style
  return (
    <div className={`p-4 rounded-lg text-white shadow-lg ${bgColor} max-w-sm w-full mb-2`}>
      <div className="text-center">
        <span>{message}</span>
      </div>
    </div>
  );
}