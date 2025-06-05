"use client";

export function TestEnv() {
  return (
    <div>
      <p>
        Google Maps API Key:{" "}
        {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "Not found"}
      </p>
    </div>
  );
}
