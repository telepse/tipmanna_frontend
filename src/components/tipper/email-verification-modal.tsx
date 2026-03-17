import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Modal for email verification
export const EmailVerificationModal = ({
  open,
  onClose,
  onVerify,
  email,
}: {
  open: boolean;
  onClose: () => void;
  onVerify: (code: string) => void;
  email: string;
}) => {
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      onVerify(code);
    } catch (err) {
      toast.error("Invalid verification code");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onClose}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Email Verification</DialogTitle>
          <DialogDescription>
            Enter the 6-digit verification code sent to <b>{email}</b>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <Input
            placeholder="Enter 6-digit code"
            value={code}
            onChange={e => setCode(e.target.value)}
            maxLength={6}
          />
          <Button
            onClick={handleVerify}
            disabled={isVerifying || code.length !== 6}
          >
            {isVerifying ? "Verifying..." : "Verify Email"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
