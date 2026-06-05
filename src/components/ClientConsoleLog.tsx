"use client";

import { useEffect, useRef } from "react";

export function ClientConsoleLog() {
  const logged = useRef(false);

  useEffect(() => {
    if (!logged.current) {
      const linkedin =
        process.env.NEXT_PUBLIC_CANDIDATE_LINKEDIN ??
        process.env.NEXT_PUBLIC_CANDIDATE_LINKEDIN_URL ??
        "https://www.linkedin.com/in/your-profile";
      console.log(`[NextFlow] Candidate LinkedIn: ${linkedin}`);
      logged.current = true;
    }
  }, []);

  return null;
}
