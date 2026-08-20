import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Check, Heading, MessageSquareText, AlignLeft, Clock, Phone, MapPin, Megaphone } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { CONTENT_KEYS, CONTENT_LABELS, type ContentKey } from "@/types/admin";
import { useToast } from "@/context/ToastContext";
import { Skeleton } from "@/components/ui/Skeleton";

type Scope = "GLOBAL" | "LUSAKA" | "KITWE";
type ContentMap = Record<Scope, Partial<Record<ContentKey, string>>>;

const CONTENT_ICONS: Record<ContentKey, typeof Heading> = {
  heroHeading: Heading,
  heroSubheading: MessageSquareText,
  aboutText: AlignLeft,
  hoursText: Clock,
  phoneOverride: Phone,
  addressOverride: MapPin,
  announcementBanner: Megaphone,
};

const SCOPES: { id: Scope; label: string }[] = [
  { id: "GLOBAL", label: "Site-wide" },
  { id: "LUSAKA", label: "Lusaka" },
  { id: "KITWE", label: "Kitwe" },
];

export function AdminContentTab() {
  const { toast } = useToast();
  const [scope, setScope] = useState<Scope>("GLOBAL");
  const [content, setContent] = useState<ContentMap>({ GLOBAL: {}, LUSAKA: {}, KITWE: {} });
  const [drafts, setDrafts] = useState<Partial<Record<ContentKey, string>>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<ContentKey | null>(null);
  const [savedKey, setSavedKey] = useState<ContentKey | null>(null);

  useEffect(() => {
    api
      .get<{ content: ContentMap }>("/admin/content")
      .then((res) => setContent({ ...{ GLOBAL: {}, LUSAKA: {}, KITWE: {} }, ...res.content }))
      .catch(() => toast({ title: "Couldn't load content", description: "Please try again.", variant: "error" }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setDrafts(content[scope] ?? {});
  }, [scope, content]);

  async function save(key: ContentKey) {
    setSavingKey(key);
    try {
      await api.put("/admin/content", {
        key,
        branch: scope === "GLOBAL" ? null : scope,
        value: drafts[key] ?? "",
      });
      setContent((c) => ({ ...c, [scope]: { ...c[scope], [key]: drafts[key] ?? "" } }));
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 1600);
    } catch (err) {
      toast({
        title: "Couldn't save",
        description: err instanceof ApiRequestError ? err.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div>
      <div className="card-warm mb-6 p-5">
        <p className="mb-3 text-sm text-muted-foreground">
          Editing scope — leave on <strong className="text-foreground">Site-wide</strong> for copy
          shared everywhere, or pick a branch to override just that page.
        </p>
        <div className="flex gap-1 rounded-full border border-border bg-background/50 p-1" style={{ width: "fit-content" }}>
          {SCOPES.map((s) => (
            <button
              key={s.id}
              onClick={() => setScope(s.id)}
              className={`relative rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                scope === s.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {scope === s.id && (
                <motion.span
                  layoutId="content-scope-pill"
                  className="absolute inset-0 rounded-full bg-gradient-ember"
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
              <span className="relative z-10">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {CONTENT_KEYS.map((key) => (
            <div key={key} className="card-warm p-5">
              <Skeleton className="mb-3 h-3 w-40" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {CONTENT_KEYS.map((key, i) => {
            const Icon = CONTENT_ICONS[key];
            return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -2 }}
              className="card-warm p-5 transition-shadow hover:shadow-warm"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {CONTENT_LABELS[key]}
                </span>
                <button
                  onClick={() => save(key)}
                  disabled={savingKey === key}
                  className="relative flex min-w-[92px] items-center justify-center gap-1.5 overflow-hidden rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {savedKey === key ? (
                      <motion.span
                        key="saved"
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ type: "spring", stiffness: 300, damping: 18 }}
                        className="flex items-center gap-1.5 text-emerald-400"
                      >
                        <Check className="h-3.5 w-3.5" /> Saved
                      </motion.span>
                    ) : (
                      <motion.span key="save" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                        <Save className="h-3.5 w-3.5" /> {savingKey === key ? "Saving..." : "Save"}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
              {key === "aboutText" || key === "announcementBanner" ? (
                <textarea
                  value={drafts[key] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                  rows={3}
                  className="field resize-none"
                  placeholder={`Leave blank to use the default ${CONTENT_LABELS[key].toLowerCase()}`}
                />
              ) : (
                <input
                  value={drafts[key] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                  className="field"
                  placeholder={`Leave blank to use the default ${CONTENT_LABELS[key].toLowerCase()}`}
                />
              )}
            </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
