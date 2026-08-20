import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import type { BranchId } from "@/types";

type ContentMap = Record<string, Record<string, string>>;

const SiteContentContext = createContext<ContentMap>({});

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ContentMap>({});

  useEffect(() => {
    api
      .get<{ content: ContentMap }>("/content")
      .then((res) => setContent(res.content ?? {}))
      .catch(() => {
        // Public site keeps working off static defaults if the API is unreachable.
      });
  }, []);

  return <SiteContentContext.Provider value={content}>{children}</SiteContentContext.Provider>;
}

/**
 * Reads an admin-editable content override, falling back to `fallback` when
 * nothing has been set. Branch-scoped values win over site-wide ones.
 */
export function useContentValue(key: string, branchId: BranchId | undefined, fallback: string): string {
  const content = useContext(SiteContentContext);
  const scope = branchId?.toUpperCase();
  if (scope && content[scope]?.[key]) return content[scope][key];
  if (content.GLOBAL?.[key]) return content.GLOBAL[key];
  return fallback;
}
