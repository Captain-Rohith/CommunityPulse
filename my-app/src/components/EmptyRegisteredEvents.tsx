"use client";

import React from "react";
import { DotLottiePlayer } from "@dotlottie/react-player";

export const EmptyRegisteredEvents: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div className="w-32 h-32">
        <DotLottiePlayer
          src="https://lottie.host/2814cdb6-6811-4d6a-83a3-f86c4a9d42f5/S9GeCXYVzP.lottie"
          loop
          autoplay
        />
      </div>
      <p className="text-gray-500 text-sm mt-4">No registered events yet</p>
    </div>
  );
};
