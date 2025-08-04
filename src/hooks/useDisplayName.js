import { useState } from "react";
export default function useDisplayName() {
  const [name, setName] = useState(() => localStorage.getItem("agentName") || "");
  const save = (val) => {
    setName(val);
    localStorage.setItem("agentName", val);
  };
  return [name, save];
}
