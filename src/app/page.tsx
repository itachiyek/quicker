"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  // The app is shut down — send everyone to the shutdown notice on /login,
  // regardless of any lingering session cookie.
  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return <main className="flex-1" />;
}
