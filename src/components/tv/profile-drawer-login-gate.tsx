"use client";

export function ProfileDrawerLoginGate({
  message,
  onOpenProfile,
}: {
  message: string;
  onOpenProfile?: () => void;
}) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-muted-foreground text-sm">{message}</p>
      {onOpenProfile ? (
        <button
          type="button"
          className="text-primary mt-3 text-sm font-medium underline"
          onClick={onOpenProfile}
        >
          Open Profile tab to sign in
        </button>
      ) : (
        <p className="text-muted-foreground mt-2 text-xs">
          Open the Profile tab to sign in.
        </p>
      )}
    </div>
  );
}
