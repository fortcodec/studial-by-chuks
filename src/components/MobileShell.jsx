import React from "react";
import { BottomNav } from "./BottomNav";

/**
 * MobileShell component wrapper for bottom tab bar navigation.
 * Uses soft glowing pill indicator (bg-indigo-500/20 text-indigo-400 rounded-full px-4 py-1)
 * for active route states.
 */
export function MobileShell(props) {
  return <BottomNav {...props} />;
}

export default MobileShell;
export { BottomNav };
