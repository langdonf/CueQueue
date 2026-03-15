"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function UpgradeSuccessToast() {
  useEffect(() => {
    toast.success("Welcome to CueQueue Pro! 🎸");
  }, []);

  return null;
}
