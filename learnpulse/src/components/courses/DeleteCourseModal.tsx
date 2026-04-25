"use client";

type DeleteCourseModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isDeleting?: boolean;
};

export function DeleteCourseModal({ open, onClose, onConfirm, isDeleting }: DeleteCourseModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-course-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 id="delete-course-title" className="text-lg font-bold text-gray-900">
          Delete Course?
        </h2>
        <p className="mt-3 text-sm text-gray-600">
          Are you sure you want to delete this course history? This action cannot be undone.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => void onConfirm()}
            className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-white transition hover:scale-105 hover:shadow-lg hover:shadow-red-500/50 disabled:pointer-events-none disabled:opacity-60"
          >
            Yes, Delete
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="flex-1 rounded-lg bg-green-500 px-4 py-2 text-white transition hover:scale-105 hover:shadow-lg hover:shadow-green-500/50 disabled:pointer-events-none disabled:opacity-60"
          >
            No, Keep It
          </button>
        </div>
      </div>
    </div>
  );
}
