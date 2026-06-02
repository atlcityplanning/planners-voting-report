import { useAsyncRateLimitedCallback } from "@tanstack/react-pacer";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { requestVerificationCode, verifyCode } from "@/server/actions";

export function EmailVerification({
  onVerified,
}: {
  onVerified: (email: string, sessionToken: string) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const requestRateLimited = useAsyncRateLimitedCallback(
    async (emailToUse: string) => {
      const res = await requestVerificationCode({ data: { email: emailToUse } });
      if (res.success) {
        setOtpToken(res.otpToken);
        setStep(2);
        setCooldown(60);
        toast.success("Verification code sent to your email!");
      }
    },
    {
      limit: 3,
      window: 60 * 1000,
      onReject: (_args, limiter) => {
        toast.error(
          `Too many requests. Try again in ${Math.ceil(limiter.getMsUntilNextWindow() / 1000)}s`,
        );
      },
    },
  );

  const handleRequestCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.toLowerCase().endsWith("@atlantaga.gov")) {
      toast.error("Only @atlantaga.gov email addresses are allowed.");
      return;
    }

    setIsSubmitting(true);
    try {
      await requestRateLimited(email);
    } catch (error: any) {
      toast.error(error.message || "Failed to send verification code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error("Please enter the 6-digit code.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await verifyCode({
        data: { email, code, otpToken },
      });
      if (res.success) {
        toast.success("Email verified successfully!");
        onVerified(email, res.sessionToken);
      }
    } catch (error: any) {
      toast.error(error.message || "Invalid or expired verification code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 1) {
    return (
      <form
        onSubmit={handleRequestCode}
        className="space-y-4 max-w-md mx-auto p-6 bg-white rounded-lg shadow-sm border border-slate-100"
      >
        <div className="space-y-2">
          <Label htmlFor="verification-email">Enter your City of Atlanta Email</Label>
          <Input
            id="verification-email"
            type="email"
            placeholder="jdoe@atlantaga.gov"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            required
            className="w-full"
          />
        </div>
        <Button type="submit" disabled={isSubmitting || !email} className="w-full">
          {isSubmitting ? "Sending Code..." : "Send Verification Code"}
        </Button>
      </form>
    );
  }

  return (
    <form
      onSubmit={handleVerifyCode}
      className="space-y-4 max-w-md mx-auto p-6 bg-white rounded-lg shadow-sm border border-slate-100"
    >
      <div className="space-y-2">
        <Label htmlFor="verification-code">Enter Verification Code</Label>
        <p className="text-sm text-slate-500 mb-2">We sent a 6-digit code to {email}</p>
        <div className="flex justify-center py-4">
          <InputOTP maxLength={6} value={code} onChange={setCode} disabled={isSubmitting} autoFocus>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={isSubmitting || code.length !== 6} className="w-full">
          {isSubmitting ? "Verifying..." : "Verify Code"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting || cooldown > 0}
          onClick={() => handleRequestCode()}
          className="w-full text-sm"
        >
          {cooldown > 0 ? `Resend Code (${cooldown}s)` : "Resend Code"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={isSubmitting}
          onClick={() => {
            setStep(1);
            setCode("");
            setOtpToken("");
          }}
          className="w-full text-sm"
        >
          Use a different email
        </Button>
      </div>
    </form>
  );
}
