"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { LaasLogo } from "@/components/icons/laas-logo";
import { AUTH_IMAGES, TAGLINE } from "@/config/constants";
import { cn } from "@/lib/utils";

export function LeftPanel() {
  const [imagePath, setImagePath] = useState(AUTH_IMAGES[0]);

  useEffect(() => {
    setImagePath(AUTH_IMAGES[Math.floor(Math.random() * AUTH_IMAGES.length)]);
  }, []);

  return (
    <div
      className={cn(
        "relative hidden h-full w-1/2 overflow-hidden bg-black md:block"
      )}
    >
      <Image
        src={imagePath}
        alt=""
        fill
        className="object-cover object-[55%_50%] opacity-90"
        sizes="50vw"
        priority
        unoptimized
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
        aria-hidden
      />
      <Link
        href="/"
        className="absolute left-6 top-6 z-10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent rounded"
      >
        <LaasLogo className="text-white" />
      </Link>
      <div
        className={cn(
          "absolute bottom-6 left-0 right-0 z-10 px-8 pb-8 text-white"
        )}
      >
        <p className="text-2xl font-bold leading-tight md:text-3xl">
          {TAGLINE.headline}
        </p>
        <p className="mt-3 text-sm opacity-90 md:text-lg">
          {TAGLINE.subtitle}
        </p>
      </div>
    </div>
  );
}
