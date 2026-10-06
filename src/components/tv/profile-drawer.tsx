/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { PROFILE_DRAWER_Z_INDEX } from "@/lib/drawer-z-index";

import { TermsPrivacyLabel } from "@/components/auth/terms-privacy-label";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { persistAuthSession } from "@/lib/session-client";
import { dispatchAuthChanged } from "@/lib/auth-events";
import {
  getVisitorIdForAuthMerge,
  touchVisitorTimestamp,
} from "@/lib/visitor-session";
import OTPInput from "react-otp-input";
import { useMediaQuery } from "react-responsive";
import { Bookmark, Calendar, MoveLeft, UserRound, X } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

import { loginOrRegisterTipperAction, verifyCodeAction } from "@/actions/auth";
import { parseAuthResponse } from "@/lib/auth-response";
import { applyPrimaryAndHostSessions } from "@/lib/apply-auth-sessions";
import { buildSignupAttributionPayload } from "@/lib/signup-attribution";
import type { AppDispatch } from "@/redux/store";
import { ApiError } from "@/types/api-error.types";
import { Paragraph } from "@/components/shared/paragraph";
import { TipperProfileClient } from "../tipper/tipper-profile-client";
import { VisitorProfileClient } from "../tipper/visitor-profile-client";
import { NotificationsTab } from "@/components/notifications/notifications-tab";
import { ReminderBucketTab } from "@/components/notifications/reminder-bucket-tab";
import { SavedTab } from "@/components/notifications/saved-tab";
import { PushPermissionPrompt } from "@/components/notifications/push-permission-prompt";
import { NotificationBadge } from "@/components/notifications/notification-badge";
import { ProfileDrawerLoginGate } from "@/components/tv/profile-drawer-login-gate";
import { useProfileDrawerData } from "@/hooks/use-profile-drawer-data";
import { useHostCapability } from "@/hooks/use-host-capability";
import { buildCreatorProfileSharePath } from "@/lib/creator-profile-url";

export type ProfileDrawerTab =
  | "notifications"
  | "reminders"
  | "saved"
  | "profile";

interface Props {
  isProfileDrawerOpen: boolean;
  setIsProfileDrawerOpen: (value: boolean) => void;
  /** Optional overrides; hook fills data when drawer opens. */
  tipperEvents?: any[];
  iTipped?: number;
  causes?: any[];
  savedContents?: any[];
  tippedVideos?: any[];
  initialTab?: ProfileDrawerTab;
  initialAccountTab?: "tipper" | "host";
}

type ProfileStep = "signIn" | "verifyCode" | "tipperProfile";

const TAB_PANEL_CLASS = "mt-3 data-[state=inactive]:hidden";

export const ProfileDrawer = ({
  isProfileDrawerOpen,
  setIsProfileDrawerOpen,
  tipperEvents: tipperEventsProp,
  iTipped: iTippedProp,
  causes: causesProp,
  savedContents: savedContentsProp,
  tippedVideos: tippedVideosProp,
  initialTab = "notifications",
  initialAccountTab = "tipper",
}: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileDrawerTab>(initialTab);
  const [profileStep, setProfileStep] = useState<ProfileStep>("signIn");
  const [code, setCode] = useState("");
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState("");

  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );
  const requiresVerification = useSelector(
    (state: RootState) => state.auth.requiresVerification
  );
  const dispatch = useDispatch();

  const drawerData = useProfileDrawerData(isProfileDrawerOpen);
  const { capability } = useHostCapability();
  const viewerHostUsername = (() => {
    if (capability.status === "active" && capability.username?.trim()) {
      return capability.username.trim();
    }
    if (capability.status === "stale" && capability.username?.trim()) {
      return capability.username.trim();
    }
    return null;
  })();

  const tipperEvents = tipperEventsProp ?? drawerData.tipperEvents;
  const iTipped = iTippedProp ?? drawerData.iTipped;
  const causes = causesProp ?? drawerData.causes;
  const savedContents = savedContentsProp ?? drawerData.savedContents;
  const tippedVideos = tippedVideosProp ?? drawerData.tippedVideos;

  useEffect(() => {
    if (isProfileDrawerOpen && user?.role === "VISITOR") {
      touchVisitorTimestamp();
    }
  }, [isProfileDrawerOpen, user?.role]);

  useEffect(() => {
    if (isProfileDrawerOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isProfileDrawerOpen]);

  useEffect(() => {
    if (isAuthenticated && !requiresVerification) {
      setProfileStep("tipperProfile");
    }
  }, [isAuthenticated, requiresVerification]);

  const isMobile = useMediaQuery({ query: "(max-width: 500px)" });
  const inputStyle = {
    background: "#f7c87c80",
    width: isMobile ? "36px" : "44px",
    height: isMobile ? "36px" : "50px",
    margin: isMobile ? "0 4px" : "0 8px",
    borderRadius: isMobile ? "4px" : "8px",
    outline: "none",
    fontSize: isMobile ? "16px" : "20px",
  };

  const form = useForm<{
    fullName: string;
    email: string;
    acceptedTerms: false;
  }>({
    defaultValues: { fullName: "", email: "", acceptedTerms: false },
  });
  const email = form.watch("email");

  const handleLogin = async (values: { email: string }) => {
    try {
      setIsLoading(true);

      const res = await loginOrRegisterTipperAction({
        fullName: "",
        email: values.email,
        acceptedTerms: true,
        visitorId: getVisitorIdForAuthMerge(user),
        ...buildSignupAttributionPayload("tv_profile"),
      });

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      setPendingVerifyEmail(values.email.trim());
      setProfileStep("verifyCode");
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === "object" && err !== null && "error" in err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.error.message);
      } else {
        toast.error("Failed to sign in tipper");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setIsLoading(true);

      const verifyEmail =
        pendingVerifyEmail.trim() || email.trim() || user?.email?.trim() || "";
      if (!verifyEmail) return;

      const res = await verifyCodeAction(verifyEmail, code);

      if (!res.success) {
        toast.error(res.message ?? "Verification failed");
        return;
      }

      const parsed = parseAuthResponse(res.data);
      if (!parsed) {
        toast.error("Verification succeeded but session could not be restored");
        return;
      }

      await applyPrimaryAndHostSessions(parsed, dispatch as AppDispatch);

      toast.success("Email verified successfully!");
      dispatchAuthChanged();
      setProfileStep("tipperProfile");
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === "object" && err !== null && "error" in err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.error.message);
      } else {
        toast.error("Failed to verify tipper");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderProfileTab = () => {
    if (user?.role === "VISITOR") {
      return (
        <VisitorProfileClient
          viewMode="drawer"
          events={tipperEvents}
          iTipped={iTipped}
          tippedVideos={tippedVideos}
          profileSlug={user.username}
          profileId={user.id}
        />
      );
    }

    if (
      (isAuthenticated && !requiresVerification) ||
      profileStep === "tipperProfile"
    ) {
      return (
        <TipperProfileClient
          viewMode="drawer"
          events={tipperEvents}
          iTipped={iTipped}
          causes={causes}
          contents={savedContents || []}
          tippedVideos={tippedVideos}
          profileSlug={user?.username}
        />
      );
    }

    if (profileStep === "verifyCode") {
      return (
        <div className="relative flex flex-col items-center justify-center gap-6 px-4">
          <h2 className="mt-4 text-center text-2xl font-semibold">
            Verify your email
          </h2>
          <Paragraph
            align="center"
            size="sm"
            color="muted"
          >
            We&apos;ve sent a 6-digit code to <strong>{email}</strong>.
          </Paragraph>

          <div className="react-otp-input">
            <OTPInput
              value={code}
              onChange={setCode}
              numInputs={6}
              renderInput={props => <input {...props} />}
              inputStyle={inputStyle}
              shouldAutoFocus
            />
          </div>

          <Button
            type="button"
            size="lg"
            className="w-full bg-black"
            disabled={isLoading || code.length < 6}
            onClick={handleVerify}
          >
            {isLoading ? "Verifying email..." : "Verify email"}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="hover:bg-gray absolute top-0 left-0 border-none outline-none hover:text-black"
            onClick={() => setProfileStep("signIn")}
          >
            <MoveLeft /> Back
          </Button>
        </div>
      );
    }

    return (
      <div className="px-4">
        <DrawerTitle className="mt-2 text-center">
          Enter email to view profile
        </DrawerTitle>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleLogin)}
            className="mt-6 space-y-6"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter email address"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="acceptedTerms"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:border-black! data-[state=checked]:bg-black!"
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      <TermsPrivacyLabel />
                    </FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              size="lg"
              className="w-full bg-black"
              disabled={isLoading}
            >
              {isLoading ? "Sending code..." : "Continue"}
            </Button>
            <p className="text-muted-foreground text-center text-xs">
              No account yet? Continue and we will create a free tipper account
              when you verify.
            </p>
          </form>
        </Form>
      </div>
    );
  };

  return (
    <Drawer
      open={isProfileDrawerOpen}
      onOpenChange={setIsProfileDrawerOpen}
    >
      <DrawerContent
        className={`fixed inset-0 flex h-screen flex-col p-2`}
        style={{ zIndex: "1000037" }}
      >
        <button
          type="button"
          onClick={() => setIsProfileDrawerOpen(false)}
          className="absolute top-4 right-4 z-10 rounded-full p-2 text-black hover:bg-gray-200"
        >
          <X size={24} />
        </button>

        <Tabs
          value={activeTab}
          onValueChange={v => setActiveTab(v as ProfileDrawerTab)}
          className="flex min-h-0 flex-1 flex-col pt-10"
        >
          {viewerHostUsername ? (
            <p className="text-muted-foreground mb-2 shrink-0 px-1 text-center text-xs">
              Host:{" "}
              <a
                href={buildCreatorProfileSharePath(viewerHostUsername)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium underline underline-offset-2"
              >
                @{viewerHostUsername}
              </a>
            </p>
          ) : null}
          <TabsList className="grid w-full shrink-0 grid-cols-4">
            <TabsTrigger
              value="notifications"
              className="gap-1 text-xs"
            >
              <NotificationBadge iconClassName="size-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger
              value="reminders"
              className="gap-1 text-xs"
            >
              <Calendar className="size-4" />
              <span className="hidden sm:inline">Reminders</span>
            </TabsTrigger>
            <TabsTrigger
              value="saved"
              className="gap-1 text-xs"
            >
              <Bookmark className="size-4" />
              <span className="hidden sm:inline">Saved</span>
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="gap-1 text-xs"
            >
              <UserRound className="size-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <TabsContent
              value="notifications"
              forceMount
              className={TAB_PANEL_CLASS}
            >
              <PushPermissionPrompt />
              <NotificationsTab
                variant="drawer"
                initialAccountTab={initialAccountTab}
              />
            </TabsContent>

            <TabsContent
              value="reminders"
              forceMount
              className={TAB_PANEL_CLASS}
            >
              {isAuthenticated && !requiresVerification ? (
                <ReminderBucketTab
                  variant="drawer"
                  deferLoad
                />
              ) : (
                <ProfileDrawerLoginGate
                  message="Sign in to set and manage program reminders."
                  onOpenProfile={() => setActiveTab("profile")}
                />
              )}
            </TabsContent>

            <TabsContent
              value="saved"
              forceMount
              className={TAB_PANEL_CLASS}
            >
              {isAuthenticated && !requiresVerification ? (
                <SavedTab
                  savedContents={savedContents}
                  savedHosts={drawerData.savedHosts}
                  loadingSaved={drawerData.loading}
                  fetchOnMount={true}
                />
              ) : (
                <ProfileDrawerLoginGate
                  message="Sign in to view your saved videos and hosts."
                  onOpenProfile={() => setActiveTab("profile")}
                />
              )}
            </TabsContent>

            <TabsContent
              value="profile"
              forceMount
              className={TAB_PANEL_CLASS}
            >
              {renderProfileTab()}
            </TabsContent>
          </div>
        </Tabs>
      </DrawerContent>
    </Drawer>
  );
};
