import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Phone, Shield, Check } from "lucide-react";

interface PhoneVerificationDialogProps {
  open: boolean;
  onVerified: () => void;
  initialPhoneNumber?: string;
}

export function PhoneVerificationDialog({ open, onVerified, initialPhoneNumber = "" }: PhoneVerificationDialogProps) {
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Update phone number when initialPhoneNumber prop changes
  useEffect(() => {
    if (initialPhoneNumber) {
      setPhoneNumber(formatPhoneNumber(initialPhoneNumber));
    }
  }, [initialPhoneNumber]);

  // Countdown timer effect
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const formatPhoneNumber = (input: string): string => {
    // Remove all non-numeric characters (including +, -, spaces, etc.)
    let cleaned = input.replace(/\D/g, '');
    
    // Handle different formats:
    // +8801712345678 -> 8801712345678 -> 1712345678
    // 8801712345678 -> 1712345678
    // 01712345678 -> 1712345678
    // 1712345678 -> 1712345678
    
    // Remove country code if present
    if (cleaned.startsWith('880')) {
      cleaned = cleaned.substring(3);
    }
    
    // Remove leading zero if present (01712345678 -> 1712345678)
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      cleaned = cleaned.substring(1);
    }
    
    return cleaned;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const isValidPhoneNumber = (phone: string): boolean => {
    const cleaned = formatPhoneNumber(phone);
    return cleaned.length === 10 || cleaned.length === 11;
  };

  const handleSendOtp = async () => {
    const cleanedPhone = formatPhoneNumber(phoneNumber);
    
    if (!cleanedPhone || cleanedPhone.length < 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 11-digit phone number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      // Prepend country code
      const fullPhoneNumber = `880${cleanedPhone}`;

      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { phoneNumber: fullPhoneNumber },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setOtpSent(true);
      setResendCountdown(60); // Start 60-second countdown
      toast({
        title: "OTP Sent",
        description: "Please check your phone for the verification code",
      });
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      toast({
        title: "Failed to Send OTP",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 4) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the 4-digit code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { otp },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Phone Verified",
        description: "Your phone number has been verified successfully",
      });

      onVerified();
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid or expired OTP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Verify Your Phone Number</DialogTitle>
          <DialogDescription className="text-center">
            {otpSent
              ? "Enter the 4-digit code sent to your phone"
              : "Enter your phone number to receive a verification code"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {!otpSent ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    +880
                  </span>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="1XXXXXXXXX"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    disabled={loading}
                    className="pl-14 pr-10"
                  />
                  {phoneNumber && isValidPhoneNumber(phoneNumber) && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Check className="w-5 h-5 text-green-500" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter your 11-digit phone number (e.g., 1712345678)
                </p>
              </div>
              <Button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Send Verification Code
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={4}
                    value={otp}
                    onChange={setOtp}
                    disabled={loading}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
              <div className="space-y-2">
                <Button
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.length !== 4}
                  className="w-full"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Verify Code
                </Button>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSendOtp}
                    variant="outline"
                    disabled={loading || resendCountdown > 0}
                    className="flex-1"
                  >
                    {resendCountdown > 0 
                      ? `Resend in ${resendCountdown}s` 
                      : "Resend OTP"}
                  </Button>
                  <Button
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                      setResendCountdown(0);
                    }}
                    variant="ghost"
                    disabled={loading}
                    className="flex-1"
                  >
                    Change Number
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
