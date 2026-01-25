export default function ConnectPortalsPage() {
    return (
      <div className="p-12 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Choose a portal to connect</h1>
  
        <div className="space-y-4">
          <button className="w-full p-4 bg-gray-900 rounded-xl text-left hover:bg-gray-800">
            PAP
          </button>
          <button className="w-full p-4 bg-gray-900 rounded-xl text-left hover:bg-gray-800">
            SeLoger
          </button>
          <button className="w-full p-4 bg-gray-900 rounded-xl text-left hover:bg-gray-800">
            Leboncoin
          </button>
          <button className="w-full p-4 bg-gray-900 rounded-xl text-left hover:bg-gray-800">
            Other portals
          </button>
        </div>
  
        <p className="text-gray-500 mt-6 text-sm">
          More portal integrations coming soon.
        </p>
      </div>
    );
  }