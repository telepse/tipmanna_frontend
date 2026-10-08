/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Third-party imports
import {
  ArrowLeft,
  ArrowLeftRight,
  LogOut,
  MessageCircle,
  MoveLeft,
  PencilLine,
  Settings,
  Share2,
  Trash2,
  User,
  Wallet,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useDispatch, useSelector } from "react-redux";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { EmbeddedSupportChat } from "@/components/support/embedded-support-chat";
import { ProfilePreferencesTab } from "@/components/tipper/profile-preferences-tab";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormField,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "react-toastify";

// Local imports
import { Paragraph } from "@/components/shared/paragraph";
import { Title } from "@/components/shared/title";
import { RootState, type AppDispatch } from "@/redux/store";
import { EditProfileFormData, editProfileSchema } from "@/schemas";
import {
  changeEmailAction,
  deleteTipperAction,
  updateTipperAction,
  verifyCodeAction,
} from "@/actions/auth";
import { getVisitorIdForAuthMerge } from "@/lib/visitor-session";
import Cookies from "js-cookie";
import OtpInput from "react-otp-input";
import { useMediaQuery } from "react-responsive";

// Local imports
import { ApiError } from "@/types";
import { performAuthLogout } from "@/lib/auth-logout";
import { HostUpgradeDialog } from "@/components/auth/host-upgrade-dialog";
import { useHostCapabilityWithAuth } from "@/hooks/use-host-capability-with-auth";
import { setCredentials, updateTipper } from "@/features/auth-slice";
import {
  composeTipperDisplayHandle,
  formatTipperDisplayLabel,
  slugDigits,
  splitTipperDisplayHandle,
} from "@/lib/tipper-display-handle";
import Image from "next/image";

interface Props {
  iTipped: number;
  variant?: "owner" | "public" | "drawer";
  profileSlug?: string;
  displayName?: string;
  isAnonymous?: boolean;
}

const PREFIX = "tipper";

export const TipperBanner = ({
  iTipped,
  variant = "owner",
  profileSlug,
  displayName,
  isAnonymous,
}: Props) => {
  const [openSettings, setOpenSettings] = useState(false);
  const [hostUpgradeOpen, setHostUpgradeOpen] = useState(false);
  const { canReadAsHost, requestHostAuth, HostAuthModal, capability } =
    useHostCapabilityWithAuth();
  const [openEditProfile, setOpenEditProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isEditable, setIsEditable] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [tawkLoaded, setTawkLoaded] = useState(false);

  // Safe Tawk API functions
  // const setTawkAttributes = (name: string, email: string): Promise<void> => {
  //   return new Promise((resolve, reject) => {
  //     if (!window.Tawk_API) {
  //       reject(new Error("Tawk API not available"));
  //       return;
  //     }

  //     window.Tawk_API.setAttributes(
  //       { name, email },
  //       (error: any) => {
  //         if (error) {
  //           console.error("❌ Failed to set visitor info:", error);
  //           reject(error);
  //         } else {
  //           console.log("✅ Visitor info sent to Tawk:", { name, email });
  //           resolve();
  //         }
  //       }
  //     );
  //   });
  // };

  const [openEmailModal, setOpenEmailModal] = useState(false);
  const [step, setStep] = useState<"signIn" | "verifyCode">("signIn");
  const [emailCode, setEmailCode] = useState("");
  const emailForm = useForm<{ email: string }>({
    defaultValues: { email: "" },
  });

  const user = useSelector((state: RootState) => state.auth.user);
  const user_name =
    displayName ??
    (user && "displayUsername" in user
      ? user.displayUsername || user.username
      : user?.username) ??
    "";
  const profile_slug = profileSlug ?? (user ? user.username : "");
  const displayLabel = formatTipperDisplayLabel(user_name, profile_slug);
  const full_name = user ? user?.fullName : "";
  const e_mail = user ? user?.email : "";
  const userId = user ? user.id : "";
  const isPublicView = variant === "public";
  const showOwnerControls = variant === "owner";
  const showAnonymousToggle =
    showOwnerControls || (variant === "drawer" && user?.role === "TIPPER");

  const token = useSelector((state: RootState) => state.auth.token);
  const isTipper = user?.role === "TIPPER";
  const [enabled, setEnabled] = useState<boolean>(
    isTipper ? (user?.anonymous ?? false) : false
  );

  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  // Tawk
  const [message, setMessage] = useState("");
  const [openChat, setOpenChat] = useState(false);
  const [directChatUrl, setDirectChatUrl] = useState("");

  // Safe Tawk API functions
  // const setTawkAttributes = (name: string, email: string): Promise<void> => {
  //   return new Promise((resolve, reject) => {
  //     if (!window.Tawk_API) {
  //       reject(new Error("Tawk API not available"));
  //       return;
  //     }

  //     window.Tawk_API.setAttributes(
  //       { name, email },
  //       (error: any) => {
  //         if (error) {
  //           console.error("❌ Failed to set visitor info:", error);
  //           reject(error);
  //         } else {
  //           console.log("✅ Visitor info sent to Tawk:", { name, email });
  //           resolve();
  //         }
  //       }
  //     );
  //   });
  // };

  // const handleOpenChat = async () => {
  //   if (!user) {
  //     toast.error("Please log in first");
  //     return;
  //   }

  //   const name = user.fullName || user.username;
  //   const email = user.email;

  //   try {
  //     // Try to set attributes if Tawk is loaded
  //     if (window.Tawk_API) {
  //       await setTawkAttributes(name, email);
  //     }

  //     // Open chat regardless of Tawk API availability
  //     openTawkChat(name, email);
  //   } catch (error) {
  //     console.error("Failed to set Tawk attributes, opening chat anyway:", error);
  //     openTawkChat(name, email);
  //   }
  // };

  // const openTawkChat = (name: string, email: string) => {
  //   const propertyId = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID!;
  //   const widgetId = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID!;
  //   const baseUrl = `https://tawk.to/chat/${propertyId}/${widgetId}`;

  //   const encodedName = encodeURIComponent(name);
  //   const encodedEmail = encodeURIComponent(email);
  //   const encodedText = encodeURIComponent(message.trim());

  //   const url = `${baseUrl}?name=${encodedName}&email=${encodedEmail}&message=${encodedText}`;

  //   setDirectChatUrl(url);
  //   setOpenChat(true);

  //   console.log("🔗 Tawk iframe URL created with:", { name: encodedName, email: encodedEmail });
  // };

  // // Initialize Tawk - runs once on component mount
  // useEffect(() => {
  //   // If script already exists, don't re-inject
  //   if (document.getElementById("tawk-script")) {
  //     setTawkLoaded(true);
  //     return;
  //   }

  //   // Define global objects BEFORE script runs
  //   window.Tawk_API = window.Tawk_API || {};
  //   window.Tawk_LoadStart = new Date();
  //   window.Tawk_API.embedded = true;

  //   // Configure Tawk to use visitor data
  //   if (user) {
  //     window.Tawk_API.visitor = {
  //       name: user.fullName || user.username,
  //       email: user.email,
  //     };
  //   }

  //   // Load script
  //   const script = document.createElement("script");
  //   script.id = "tawk-script";
  //   script.async = true;
  //   script.src = `https://embed.tawk.to/${process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID}/${process.env.NEXT_PUBLIC_TAWK_WIDGET_ID}`;
  //   script.charset = "UTF-8";
  //   script.setAttribute("crossorigin", "*");

  //   script.onload = () => {
  //     console.log("✅ Tawk loaded inline");
  //     setTawkLoaded(true);

  //     // Set attributes after script loads
  //     if (user && window.Tawk_API) {
  //       setTawkAttributes(user.fullName || user.username, user.email)
  //         .catch(error => console.error("Failed to set initial Tawk attributes:", error));
  //     }
  //   };

  //   script.onerror = () => {
  //     console.error("❌ Failed to load Tawk script");
  //     setTawkLoaded(false);
  //   };

  //   document.body.appendChild(script);
  // }, []); // Empty dependency array - runs once on mount

  // // Update Tawk when user data changes
  // useEffect(() => {
  //   if (tawkLoaded && user && window.Tawk_API) {
  //     setTawkAttributes(user.fullName || user.username, user.email)
  //       .catch(error => console.error("Failed to update Tawk attributes:", error));
  //   }
  // }, [user?.fullName, user?.email, user?.username, tawkLoaded]);

  // // Refresh chat when user data changes and chat is open
  // useEffect(() => {
  //   if (openChat && user) {
  //     const name = user.fullName || user.username;
  //     const email = user.email;
  //     openTawkChat(name, email);
  //   }
  // }, [user?.fullName, user?.email, user?.username, openChat]);

  const handleShare = async () => {
    const slug = profile_slug.trim();
    if (!slug) return;
    const url = `${window.location.origin}/tipper/${slug}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${user_name} on Tipmanna`,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied");
    } catch {
      toast.error("Could not share profile link");
    }
  };

  const handleToggleAnonymous = async (value: boolean) => {
    try {
      setEnabled(value);
      if (!token) {
        toast.error("Invalid or expired token");
        setEnabled(!value);
        return;
      }

      const res = await updateTipperAction(
        {
          fullName: full_name,
          username: user_name,
          email: e_mail,
          anonymous: value!,
        },
        token
      );

      if (!res.success) {
        setEnabled(!value);
        return toast.error(res.message || "Failed to update anonymous mode");
      }

      const { fullName, username, email, anonymous, displayUsername } = (
        res.data as {
          tipper: {
            fullName: string;
            username: string;
            displayUsername?: string;
            email: string;
            anonymous: boolean;
          };
        }
      ).tipper;

      dispatch(
        updateTipper({
          fullName,
          username,
          displayUsername: displayUsername ?? username,
          email,
          anonymous: value,
        })
      );

      const currentUserCookie = Cookies.get("user");
      if (currentUserCookie) {
        const currentUser = JSON.parse(currentUserCookie);

        Cookies.set(
          "user",
          JSON.stringify({
            ...currentUser,
            fullName,
            username,
            displayUsername: displayUsername ?? username,
            email,
            anonymous,
          }),
          {
            expires: 7,
          }
        );
      }

      toast.success(
        value ? "Anonymous mode enabled" : "Anonymous mode disabled"
      );
    } catch (err: unknown) {
      console.error(err);
      setEnabled(!value);
      toast.error("Failed to update anonymous mode");
    }
  };

  const handleBack = () => {
    router.push(from || "/explore");
  };

  const form = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      username: profile_slug
        ? splitTipperDisplayHandle(
            (user && "displayUsername" in user
              ? user.displayUsername || user.username
              : user?.username) ?? "",
            profile_slug
          ).middle
        : "",
      fullName: user?.fullName || "",
      email: user?.email || "",
    },
  });

  const resetEditFormFromUser = () => {
    if (!profile_slug) return;
    const source =
      (user && "displayUsername" in user
        ? user.displayUsername || user.username
        : user?.username) ?? "";
    form.reset({
      username: splitTipperDisplayHandle(source, profile_slug).middle,
      fullName: user?.fullName || "",
      email: user?.email || "",
    });
  };

  const handleSwitchAccount = () => {
    if (!user) return;

    if (user.role === "TIPPER") {
      if (canReadAsHost) {
        requestHostAuth(() => {
          const slug =
            capability.status === "active" ? capability.eventSlug : null;
          if (slug) router.push(`/host/${slug}`);
        });
      } else {
        setHostUpgradeOpen(true);
      }
    }
  };

  const handleOpenEditProfile = () => {
    resetEditFormFromUser();
    setOpenEditProfile(true);
  };

  const onSubmit = async (values: EditProfileFormData) => {
    try {
      setIsLoading(true);

      if (!token) {
        toast.error("Invalid or expired token");
        return;
      }

      if (!profile_slug) {
        toast.error("Profile slug missing");
        return;
      }

      let composedUsername: string;
      try {
        composedUsername = composeTipperDisplayHandle(
          values.username,
          profile_slug
        );
      } catch {
        toast.error("Enter a valid display name");
        return;
      }

      const res = await updateTipperAction(
        {
          username: composedUsername,
          fullName: values.fullName,
          email: values.email,
        },
        token
      );

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      const { fullName, username, email, displayUsername } = (
        res.data as {
          tipper: {
            fullName: string;
            username: string;
            displayUsername?: string;
            email: string;
          };
        }
      ).tipper;

      // update redux store (username slug unchanged; displayUsername is public name)
      dispatch(
        updateTipper({
          fullName,
          username,
          displayUsername: displayUsername ?? composedUsername,
          email,
        })
      );

      const currentUserCookie = Cookies.get("user");
      if (currentUserCookie) {
        const currentUser = JSON.parse(currentUserCookie);

        Cookies.set(
          "user",
          JSON.stringify({
            ...currentUser,
            fullName,
            username,
            displayUsername: displayUsername ?? composedUsername,
            email,
          }),
          {
            expires: 7,
          }
        );
      }

      toast.success("Profile updated successfully");
      setOpenEditProfile(false);
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === "object" && err !== null && "error" in err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.error.message);
      } else {
        toast.error("Failed to update user");
      }
    } finally {
      setIsLoading(false); // reset loading state
    }
  };

  const handleLogout = async () => {
    await performAuthLogout(dispatch);
    toast.success("TIPPER account logged out");
    router.push("/sign-in");
  };

  const handleDeleteAccount = async () => {
    if (!token) {
      toast.error("Invalid or expired token");
      return;
    }

    try {
      setIsDeleting(true);

      const res = await deleteTipperAction(token);

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      toast.success("Your account has been deleted successfully.");

      // Clear Redux state & cookies
      await performAuthLogout(dispatch);

      // Redirect to sign-in
      router.push("/sign-in");
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to delete account. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const isMobile = useMediaQuery({
    query: "(max-width: 500px)",
  });

  const inputStyle = {
    background: "#f7c87c80",
    width: isMobile ? "36px" : "54px",
    height: isMobile ? "36px" : "60px",
    margin: isMobile ? "0 4px" : "0 8px",
    borderRadius: isMobile ? "4px" : "8px",
    outline: "none",
    fontSize: isMobile ? "16px" : "20px",
  };

  const containerRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      style={{
        backgroundImage: `linear-gradient(to bottom, #F57D11, #E5740E, #B65B09)`,
      }}
      className="relative w-full"
    >
      {from ? (
        <Button
          onClick={handleBack}
          className="absolute top-4 left-4 flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white sm:text-base lg:top-8 lg:left-8"
        >
          <ArrowLeft className="size-5" /> <span>Back to event</span>
        </Button>
      ) : null}

      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* === Mobile Layout === */}
        <div className="flex flex-col items-center gap-4 text-white sm:hidden">
          {/* Avatar */}
          <div className="relative flex items-center justify-center">
            <div className="flex size-24 items-center justify-center rounded-full bg-white">
              <Image
                src="/icons/diamond.png"
                alt="Diamond"
                width={40}
                height={40}
                className="size-5 sm:size-10"
              />
            </div>

            {/* Pencil (Edit) */}
            {showOwnerControls ? (
              <div className="absolute top-1 right-[-12px] cursor-pointer bg-transparent">
                <Button
                  size="icon"
                  onClick={handleOpenEditProfile}
                >
                  <PencilLine className="size-4 text-white/90" />
                </Button>
              </div>
            ) : null}

            {/* Settings (Inside circle like mockup) */}
            {showOwnerControls ? (
              <div className="absolute right-[-12px] bottom-0 flex size-6 items-center justify-center rounded-md border border-white bg-white/20">
                <Button
                  size="icon"
                  className="!bg-primary/80 border border-white"
                  onClick={() => setOpenSettings(true)}
                >
                  <Settings className="text-white/80" />
                </Button>
              </div>
            ) : null}
          </div>

          {/* Username */}
          <Paragraph
            weight="bold"
            color="white"
            className="text-lg"
          >
            {displayLabel}
          </Paragraph>

          {/* Anonymous toggle */}
          {showAnonymousToggle ? (
            <div className="flex items-center justify-center gap-2">
              <Paragraph
                size="sm"
                color="white"
              >
                Anonymous Tipping
              </Paragraph>
              <Switch
                id="anonymous-mode"
                checked={enabled}
                onCheckedChange={handleToggleAnonymous}
                className="cursor-pointer"
                disabled={isPublicView}
              />
            </div>
          ) : isAnonymous ? (
            <Paragraph
              size="sm"
              color="white"
            >
              Anonymous tipper
            </Paragraph>
          ) : null}

          {/* Total tipped */}
          <div className="flex items-center justify-center gap-4">
            <span className="rounded-md border border-white px-3 py-1 text-sm">
              Total Tipped
            </span>
            <Paragraph
              weight="bold"
              color="white"
              className="text-lg"
            >
              &pound;{Number(iTipped).toFixed(2)}
            </Paragraph>
            <Button
              size="icon"
              className="bg-transparent hover:bg-white/10"
              onClick={handleShare}
              type="button"
            >
              <Share2 className="text-white/80" />
            </Button>
          </div>

          {/* Logo bottom right */}
          <div className="mt-4 ml-auto text-sm font-semibold text-white/80 italic">
            <span className="text-secondary/80">tip</span>
            <span className="text-white">manna</span>
          </div>
        </div>

        {/* === Desktop Layout (unchanged) === */}
        <div className="hidden justify-between sm:flex">
          <div className="flex gap-4">
            <div className="flex size-10 items-center justify-center rounded-md bg-white sm:size-14">
              <Image
                src="/icons/diamond.png"
                alt="Diamond"
                width={40}
                height={40}
                className="size-6 sm:size-12"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <Paragraph
                  weight="bold"
                  color="white"
                >
                  {displayLabel}
                </Paragraph>
                {showOwnerControls ? (
                  <Button
                    size="icon"
                    onClick={handleOpenEditProfile}
                  >
                    <PencilLine className="size-4 text-white/90" />
                  </Button>
                ) : null}
              </div>

              {showAnonymousToggle ? (
                <div className="flex items-center gap-4">
                  <Paragraph
                    size="sm"
                    color="white"
                  >
                    Anonymous Tipping
                  </Paragraph>
                  <Switch
                    id="anonymous-mode"
                    checked={enabled}
                    onCheckedChange={handleToggleAnonymous}
                    className="cursor-pointer"
                  />
                </div>
              ) : isAnonymous ? (
                <Paragraph
                  size="sm"
                  color="white"
                >
                  Anonymous tipper
                </Paragraph>
              ) : null}

              <div className="flex items-center gap-4">
                <span className="bg-primary rounded-md border border-white px-3 py-1 text-sm text-white">
                  Total Tipped
                </span>
                <Paragraph
                  weight="bold"
                  color="white"
                >
                  &pound;{Number(iTipped).toFixed(2)}
                </Paragraph>
                <Button
                  size="icon"
                  className="bg-transparent"
                  onClick={handleShare}
                  type="button"
                >
                  <Share2 className="text-white/80" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end">
            {showOwnerControls ? (
              <Button
                size="icon"
                className="!bg-primary/80 border border-white"
                onClick={() => setOpenSettings(true)}
              >
                <Settings className="text-white/80" />
              </Button>
            ) : null}

            <Title size="sm">
              <span className="text-secondary/80">tip</span>
              <span className="text-white">manna</span>
            </Title>
          </div>
        </div>
      </div>

      {showOwnerControls ? (
        <Dialog
          open={openSettings}
          onOpenChange={setOpenSettings}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader className="open_sans">
              <DialogTitle>Settings</DialogTitle>
              <DialogDescription>
                Manage your account settings and preferences
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              {/* Raise a Dispute */}
              <div className="space-y-4 rounded-lg border p-4">
                <h2 className="flex items-center gap-2 font-medium">
                  <MessageCircle className="text-muted-foreground" /> Help &
                  support
                </h2>
                <Button
                  className="w-full bg-black hover:bg-black/80"
                  onClick={() => setOpenChat(true)}
                >
                  Start live chat
                </Button>
                <EmbeddedSupportChat
                  open={openChat}
                  onOpenChange={setOpenChat}
                  source="tipper_settings"
                />
              </div>

              <div className="rounded-lg border p-4">
                <ProfilePreferencesTab />
              </div>

              {/* Switch to Host */}
              <Button
                variant="outline"
                className="hover:border-border-gray-300 h-14 w-full justify-start border-gray-300 font-medium hover:bg-white hover:text-black"
                onClick={handleSwitchAccount}
              >
                <ArrowLeftRight /> Continue as Host
              </Button>
              <Button
                variant="outline"
                className="hover:border-border-gray-300 h-14 w-full justify-start border-gray-300 font-medium hover:bg-white hover:text-black"
                onClick={handleLogout}
              >
                <LogOut /> Logout
              </Button>

              {/* Delete Account */}
              <Button
                variant="destructive"
                size="lg"
                className="h-14 w-full justify-start bg-black text-white hover:bg-black/80"
                onClick={() => setOpenDeleteModal(true)}
              >
                <Trash2 className="size-6" /> Delete Account
              </Button>

              <Dialog
                open={openDeleteModal}
                onOpenChange={setOpenDeleteModal}
              >
                <DialogContent className="max-w-sm space-y-4">
                  <DialogHeader>
                    <DialogTitle>Delete Account</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete your account? This action
                      cannot be undone.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="mt-4 flex justify-end gap-4">
                    <Button
                      variant="outline"
                      onClick={() => setOpenDeleteModal(false)}
                    >
                      Go Back
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        setOpenDeleteModal(false); // close modal
                        await handleDeleteAccount();
                      }}
                    >
                      Continue
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {showOwnerControls ? (
        <Dialog
          open={openEditProfile}
          onOpenChange={setOpenEditProfile}
        >
          <DialogContent className="w-[90%] max-w-sm rounded-2xl p-4 sm:w-full sm:p-6">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="mt-2 space-y-6"
              >
                {/* Display name */}
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display name</FormLabel>
                      <div className="flex items-center rounded-md">
                        <span className="bg-muted flex h-13 flex-col items-center justify-center rounded-tl-md rounded-bl-md p-2 text-sm">
                          {PREFIX}
                        </span>
                        <FormControl>
                          <Input
                            placeholder="Enter display name"
                            autoComplete="off"
                            className="w-[200px] outline-none sm:w-[370px]"
                            {...field}
                          />
                        </FormControl>
                        <span className="bg-muted flex h-13 flex-col items-center justify-center rounded-tr-md rounded-br-md px-4 py-2 text-sm text-black">
                          {profile_slug ? slugDigits(profile_slug) : ""}
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Full Name */}
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter full name"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Email address{" "}
                        <span
                          className="text-primary cursor-pointer"
                          // onClick={() => setIsEditable(true)}
                          onClick={() => {
                            setOpenEmailModal(true);
                            setStep("signIn");
                          }}
                        >
                          Change email
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter email"
                          autoComplete="off"
                          disabled={!isEditable}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-[#F57D11] font-semibold text-white hover:bg-[#E5740E]"
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </Form>

            <Dialog
              open={openEmailModal}
              onOpenChange={setOpenEmailModal}
            >
              <DialogContent className="sm:max-w-md">
                <DialogHeader className="open_sans">
                  {step === "signIn" ? (
                    <>
                      <DialogTitle className="mt-6 text-center text-3xl font-semibold">
                        Enter new email
                      </DialogTitle>

                      <Form {...emailForm}>
                        <form
                          onSubmit={emailForm.handleSubmit(async values => {
                            try {
                              if (!token) return toast.error("Invalid token");

                              setIsLoading(true);
                              // send verification code to new emai
                              const res = await changeEmailAction({
                                userId,
                                newEmail: values.email,
                              });
                              if (!res.success) {
                                toast.error(res.message);
                                return;
                              }

                              dispatch(
                                updateTipper({
                                  email: e_mail,
                                })
                              );

                              const currentUserCookie = Cookies.get("user");
                              if (currentUserCookie) {
                                const currentUser =
                                  JSON.parse(currentUserCookie);

                                Cookies.set(
                                  "user",
                                  JSON.stringify({
                                    ...currentUser,
                                    email: e_mail,
                                  }),
                                  {
                                    expires: 7,
                                  }
                                );
                              }

                              setStep("verifyCode");
                              toast.success(
                                "Verification code sent to your email"
                              );
                            } catch (err: unknown) {
                              if (err instanceof Error) {
                                toast.error(err.message);
                              } else if (
                                typeof err === "object" &&
                                err !== null &&
                                "error" in err
                              ) {
                                const apiErr = err as ApiError;
                                toast.error(apiErr.error.message);
                              } else {
                                toast.error("Failed to send verification code");
                              }
                            } finally {
                              setIsLoading(false);
                            }
                          })}
                          className="mt-12 space-y-6"
                        >
                          <FormField
                            control={emailForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>New Email</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter email"
                                    autoComplete="off"
                                    {...field}
                                  />
                                </FormControl>
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
                            {isLoading ? "Sending code..." : "Send Code"}
                          </Button>
                        </form>
                      </Form>
                    </>
                  ) : (
                    <div className="relative flex flex-col items-center justify-center gap-4 py-12">
                      <h2 className="text-3xl font-semibold sm:text-4xl">
                        Verify your email
                      </h2>
                      <p className="text-muted-foreground text-center text-sm">
                        We&apos;ve sent a 6-digit code to{" "}
                        <strong>{emailForm.watch("email")}</strong>. Enter it
                        below to verify your account.
                      </p>

                      <div className="react-otp-input">
                        <OtpInput
                          value={emailCode}
                          onChange={setEmailCode}
                          numInputs={6}
                          renderInput={props => <input {...props} />}
                          inputStyle={inputStyle}
                          shouldAutoFocus
                        />
                      </div>

                      <Button
                        type="button"
                        size="lg"
                        className="mt-4 w-full"
                        disabled={emailCode.length < 6 || isLoading}
                        onClick={async () => {
                          try {
                            setIsLoading(true);

                            // Verify the code
                            await verifyCodeAction(
                              emailForm.watch("email"),
                              emailCode,
                              "TIPPER",
                              getVisitorIdForAuthMerge(user)
                            );

                            // Update email in redux
                            dispatch(
                              setCredentials({
                                user: {
                                  ...user!,
                                  email: emailForm.watch("email"),
                                },
                                token: token!,
                              })
                            );

                            toast.success("Email verified successfully!");

                            setOpenEmailModal(false);
                            setOpenEditProfile(false);
                            router.refresh();
                          } catch (err: unknown) {
                            console.error(err);
                            toast.error("Failed to verify email");
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                      >
                        {isLoading ? "Verifying..." : "Verify Email"}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="absolute -top-4 left-0 mt-4 border border-gray-300 outline-none hover:bg-gray-200"
                        onClick={() => setStep("signIn")}
                      >
                        <MoveLeft /> Back
                      </Button>
                    </div>
                  )}
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </DialogContent>
        </Dialog>
      ) : null}
      {showOwnerControls ? HostAuthModal : null}
      {user?.email ? (
        <HostUpgradeDialog
          open={hostUpgradeOpen}
          onOpenChange={setHostUpgradeOpen}
          email={user.email}
        />
      ) : null}
    </div>
  );
};
