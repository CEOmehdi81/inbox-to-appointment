"use client";

export default function ConfirmSubmit({
  formId,
  label,
  message,
  className,
}: {
  formId: string;
  label: string;
  message: string;
  className?: string;
}) {
  return (
    <button
      className={className}
      onClick={(e) => {
        if (!confirm(message)) {
          e.preventDefault();
          return;
        }
        (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit();
      }}
    >
      {label}
    </button>
  );
}