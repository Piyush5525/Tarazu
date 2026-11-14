"use client";
import dynamic from "next/dynamic";
import Image from "next/image";

const Fallback = ({ h = "h-[420px]" }: { h?: string }) => (
  <div className={`relative w-full ${h}`}>
    <Image src="/assets/hero-balance-static.png" alt="A golden balance settling level" fill className="object-contain opacity-80" sizes="(max-width: 768px) 100vw, 50vw" />
  </div>
);

// WebGL only runs in the browser; until it loads (or if it cannot), the provided still image stands in.
export const Balance3D = dynamic(() => import("./Balance3D"), { ssr: false, loading: () => <Fallback /> });
export const GoldField = dynamic(() => import("./GoldField"), { ssr: false });
export const Chain3D = dynamic(() => import("./Chain3D"), { ssr: false, loading: () => <div className="h-[150px]" /> });
