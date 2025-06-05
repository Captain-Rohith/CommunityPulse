"use client";

import React from "react";
import { DotLottiePlayer } from "@dotlottie/react-player";

interface LoadingAnimationProps {
  className?: string;
}

export const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  className,
}) => {
  return (
    <div className={`flex justify-center items-center ${className || ""}`}>
      <div className="w-32 h-32">
        <DotLottiePlayer
          src="https://lottie.host/92a9d69c-f939-417b-ad72-6a04abf0a5ec/DxmSko5ApC.lottie"
          loop
          autoplay
        />
      </div>
    </div>
  );
};
