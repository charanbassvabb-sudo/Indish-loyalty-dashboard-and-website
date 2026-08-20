import { useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Copy, Check, Upload, Loader2, Phone, Smartphone } from "lucide-react";
import { PAYMENT_PROVIDERS_BY_BRANCH } from "@/data/reservation";
import type { PaymentProvider, PaymentProviderOption } from "@/data/reservation";
import type { BranchId } from "@/types";
import { api, ApiRequestError } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { PaymentVerificationResult } from "./PaymentVerificationResult";

export interface PaymentUploadResult {
  attemptId: number;
  internalPaymentId: string;
  status: "AUTO_VERIFIED" | "REQUIRES_REVIEW" | "PAYMENT_FAILED" | "DUPLICATE" | "PROCESSING";
  reservationStatus: "PENDING_PAYMENT" | "CONFIRMED";
  expected: { amount: number; recipient: string };
  extracted: {
    amount: number | null;
    transactionId: string | null;
    sender: string | null;
    recipient: string | null;
    date: string | null;
    time: string | null;
    status: string;
  };
  matches: {
    amount: boolean | null;
    recipient: boolean | null;
    status: boolean | null;
    recency: boolean | null;
    notDuplicate: boolean | null;
  };
  confidenceScore: number;
}

interface Props {
  branchId: BranchId;
  reference: string;
  depositAmount: number;
  onVerified: (result: PaymentUploadResult) => void;
}

/** "0979771033" -> "097 977 1033" — easier to read and double-check than a solid digit string. */
function formatPhone(number: string) {
  return number.replace(/^(\d{3})(\d{3})(\d{4})$/, "$1 $2 $3");
}

function instructionSteps(p: PaymentProviderOption, amount: number) {
  const appName = p.label.split(" ")[0];
  // This number is registered as a mobile-money AGENT till, not a regular
  // wallet — on the real menu that's paid via "Get Cash" / "Withdraw Cash",
  // never "Send Money" (selecting Send Money for an agent till either fails
  // or sends to the wrong place). See PaymentProviderOption.isAgentNumber.
  const menuLabel = p.isAgentNumber ? "Get Cash / Withdraw Cash" : "Send Money";
  const numberLabel = p.isAgentNumber ? "the Agent Number" : "the recipient number";
  return {
    ussd: [
      <>
        Dial <strong className="text-foreground">{p.ussdCode}</strong>
      </>,
      <>
        Select <strong className="text-foreground">{menuLabel}</strong>
      </>,
      <>
        Enter {numberLabel}: <strong className="text-foreground">{formatPhone(p.number)}</strong>
      </>,
      <>
        Enter <strong className="text-foreground">ZMW {amount}</strong>
      </>,
      "Confirm with your Airtel Money/MoMo PIN",
    ],
    app: [
      <>
        Open the <strong className="text-foreground">{appName} app</strong>
      </>,
      <>
        Select <strong className="text-foreground">{menuLabel}</strong>
      </>,
      <>
        Enter {numberLabel}: <strong className="text-foreground">{formatPhone(p.number)}</strong>
      </>,
      <>
        Enter <strong className="text-foreground">ZMW {amount}</strong>
      </>,
      "Confirm the payment with your PIN",
    ],
  };
}

function InstructionCard({
  icon: Icon,
  title,
  steps,
}: {
  icon: typeof Phone;
  title: string;
  steps: React.ReactNode[];
}) {
  return (
    <div className="card-warm flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <ol className="flex flex-col gap-2 text-xs text-muted-foreground">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-2">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-secondary text-[0.65rem] font-bold text-secondary-foreground">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ReservationPaymentStep({ branchId, reference, depositAmount, onVerified }: Props) {
  const { toast } = useToast();
  const providers = PAYMENT_PROVIDERS_BY_BRANCH[branchId];
  const [provider, setProvider] = useState<PaymentProvider>(providers[0]!.id);
  const selected = providers.find((p) => p.id === provider)!;
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<PaymentUploadResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const steps = instructionSteps(selected, depositAmount);

  function copyNumber() {
    navigator.clipboard.writeText(selected.number).then(() => {
      setCopied(true);
      toast({ title: "Number copied", description: formatPhone(selected.number), variant: "success" });
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function reset() {
    setResult(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function selectProvider(id: PaymentProvider) {
    setProvider(id);
    reset();
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Not an image", description: "Please upload a screenshot (JPEG, PNG, or WEBP).", variant: "error" });
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("provider", provider);
    formData.append("screenshot", file);

    try {
      const res = await api.upload<PaymentUploadResult>(`/reservations/${reference}/payment-screenshot`, formData);
      setResult(res);
      // AUTO_VERIFIED and REQUIRES_REVIEW both mean "nothing more for the
      // customer to do right now" (one confirms immediately, the other
      // waits on a staff check) — either way there's no reason to keep
      // them on this screen. PAYMENT_FAILED/DUPLICATE are the two outcomes
      // that are actually actionable by the customer (wrong/reused
      // screenshot), so those stay here with a retry option instead.
      if (res.status === "AUTO_VERIFIED" || res.status === "REQUIRES_REVIEW") {
        onVerified(res);
      }
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof ApiRequestError ? err.message : "Please check your connection and try again.",
        variant: "error",
      });
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  }

  const canRetry = result && (result.status === "PAYMENT_FAILED" || result.status === "DUPLICATE");

  return (
    <div className="flex flex-col gap-6">
      <div className="card-warm flex items-center justify-between p-5">
        <span className="text-sm text-muted-foreground">Amount to pay</span>
        <span className="font-display text-2xl text-primary">ZMW {depositAmount}</span>
      </div>

      {providers.length > 1 && (
        <div className="grid grid-cols-2 gap-3">
          {providers.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => selectProvider(p.id)}
              className={`rounded-xl border px-3 py-3 text-center text-sm font-semibold transition-colors ${
                provider === p.id
                  ? "border-primary bg-secondary text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="card-warm flex flex-col items-center gap-1 p-5 text-center">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {selected.isAgentNumber ? `Get Cash — pay ZMW ${depositAmount} to Agent` : `Send ZMW ${depositAmount} to`}
        </span>
        <div className="flex items-center gap-3">
          <span className="font-display text-3xl text-foreground">{formatPhone(selected.number)}</span>
          <button
            type="button"
            onClick={copyNumber}
            className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <span className="text-xs text-muted-foreground">
          {selected.label} — {selected.ussdCode}
          {selected.isAgentNumber && " · Agent number, not a personal wallet"}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <InstructionCard icon={Phone} title="Option 1 — Using USSD" steps={steps.ussd} />
        <InstructionCard icon={Smartphone} title={`Option 2 — Using the ${selected.label.split(" ")[0]} App`} steps={steps.app} />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">
          After paying, upload a screenshot of your payment confirmation
        </p>
        <label
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
            uploading ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/50 hover:bg-secondary/40"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          {previewUrl ? (
            <img src={previewUrl} alt="Uploaded payment screenshot" className="max-h-40 rounded-lg object-contain" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          {uploading ? (
            <span className="flex items-center gap-2 text-sm font-medium text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing your screenshot...
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">
              {previewUrl ? "Tap to upload a different screenshot" : "Tap to select a screenshot from your gallery"}
            </span>
          )}
        </label>
      </div>

      <AnimatePresence mode="wait">
        {result && (
          <PaymentVerificationResult key={result.attemptId} result={result} internalPaymentId={result.internalPaymentId} />
        )}
      </AnimatePresence>

      {canRetry && (
        <button
          type="button"
          onClick={reset}
          className="btn-shine bg-gradient-ember shadow-warm self-start rounded-full px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
        >
          Upload a different screenshot
        </button>
      )}
    </div>
  );
}
