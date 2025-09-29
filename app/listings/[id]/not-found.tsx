// app/listings/[id]/not-found.tsx
export default function NotFound() {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="text-xl font-semibold">Listing not found</h1>
        <p className="text-gray-600 mt-2">
          This listing may have been removed or the link is invalid.
        </p>
      </div>
    );
  }