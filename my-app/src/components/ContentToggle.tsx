"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface ContentToggleProps {
  activeContent: "events" | "issues";
}

export function ContentToggle({ activeContent }: ContentToggleProps) {
  const router = useRouter();

  return (
    <div className="flex justify-center mb-6 mt-6">
      <div className="relative bg-gray-100 dark:bg-gray-800 rounded-full p-1 shadow-inner">
        <motion.div
          className="absolute top-1 bottom-1 bg-white dark:bg-gray-700 rounded-full shadow-md"
          animate={{
            left: activeContent === "events" ? "4px" : "50%",
            width: "calc(50% - 4px)",
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
          }}
        />

        <div className="relative flex">
          <button
            onClick={() => router.push("/")}
            className={`
              relative z-10 px-6 py-2.5 rounded-full text-sm font-medium transition-colors duration-200 min-w-[120px]
              ${
                activeContent === "events"
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              }
            `}
          >
            Events
          </button>

          <button
            onClick={() => router.push("/issues")}
            className={`
              relative z-10 px-6 py-2.5 rounded-full text-sm font-medium transition-colors duration-200 min-w-[120px]
              ${
                activeContent === "issues"
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              }
            `}
          >
            Issues
          </button>
        </div>
      </div>
    </div>
  );
}
