type ListingDetailProps = {
  params: { id: string };
};

export default async function ListingDetail({ params }: ListingDetailProps) {
  const { id } = params;

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Listing detail (v0 placeholder)</h1>
        <p className="text-sm text-gray-500 mt-1">
          You clicked on listing ID:
          <span className="ml-1 font-mono text-gray-200">{id}</span>
        </p>
      </header>

      <p className="text-sm text-gray-400">
        In this v0, HOMI doesn&apos;t yet load the full property record here.
        The main value is in the three analytics screens:
        <strong className="ml-1">Listings</strong> (health),
        <strong className="ml-1">Market</strong> (portal ROI) and
        <strong className="ml-1">Customers</strong> (attribution).
      </p>

      <p className="text-sm text-gray-400">
        Later, this page can be wired to the actual <code>Listing</code> model
        in Prisma (photos, price, instructions, actions, etc.) based on this ID.
      </p>
    </div>
  );
}