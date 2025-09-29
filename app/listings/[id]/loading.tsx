// app/listings/[id]/loading.tsx
export default function Loading() {
    return (
      <div className="mx-auto max-w-5xl p-6 space-y-6">
        <div className="h-7 w-80 bg-gray-100 animate-pulse rounded" />
        <div className="h-64 bg-gray-100 animate-pulse rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }