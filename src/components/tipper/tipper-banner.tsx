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
import { RootState } from "@/redux/store";
import { EditProfileFormData, editProfileSchema } from "@/schemas";
import {
  changeEmailAction,
  deleteTipperAction,
  updateTipperAction,
  verifyCodeAction,
} from "@/actions/auth";
import Cookies from "js-cookie";
import OtpInput from "react-otp-input";
import { useMediaQuery } from "react-responsive";

// Local imports
import { ApiError } from "@/types";
import {
  clearCredentials,
  setCredentials,
  updateTipper,
} from "@/features/auth-slice";

interface Props {
  iTipped: number;
}

export const TipperBanner = ({ iTipped }: Props) => {
  const [openSettings, setOpenSettings] = useState(false);
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
  const user_name = user ? user.username : "";
  const full_name = user ? user?.fullName : "";
  const e_mail = user ? user?.email : "";
  const userId = user ? user.id : "";

  const token = useSelector((state: RootState) => state.auth.token);
  const isTipper = user?.role === "TIPPER";
  const [enabled, setEnabled] = useState<boolean>(
    isTipper ? (user?.anonymous ?? false) : false
  );

  const router = useRouter();
  const dispatch = useDispatch();
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

  const handleToggleAnonymous = async (value: boolean) => {
    try {
      setEnabled(value);
      if (!token) {
        toast.error("Invalid or expired token");
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

      const { fullName, username, email, anonymous } = res.data.tipper;

      if (!res.success) {
        setEnabled(!value);
        return toast.error(res.message || "Failed to update anonymous mode");
      }

      dispatch(
        updateTipper({
          fullName,
          username,
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
    router.push(from || "/");
  };

  const form = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      username: user_name || "",
      fullName: user?.fullName || "",
      email: user?.email || "",
    },
  });

  const handleSwitchAccount = () => {
    if (!user) return;

    if (user.role === "HOST") {
      router.push(`/sign-in?email=${encodeURIComponent(user.email)}`);
    } else if (user.role === "TIPPER") {
      router.push(`/create-account?email=${encodeURIComponent(user.email)}`);
    }
  };

  const onSubmit = async (values: EditProfileFormData) => {
    try {
      setIsLoading(true);

      if (!token) {
        toast.error("Invalid or expired token");
        return;
      }

      const res = await updateTipperAction(
        {
          username: values.username,
          fullName: values.fullName,
          email: values.email,
        },
        token
      );

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      const { fullName, username, email } = res.data.tipper;

      // update redux store
      dispatch(
        updateTipper({
          fullName,
          username,
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
            email,
          }),
          {
            expires: 7,
          }
        );
      }

      router.replace(`/tipper/${username}`);

      toast.success("Profile updated successfully");
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

  const handleLogout = () => {
    // Clear Redux state
    dispatch(clearCredentials());

    // Optionally clear cookies/localStorage if used
    localStorage.removeItem("persist:root"); // or whatever you use to persist Redux state

    Cookies.remove("user");
    Cookies.remove("token");

    // Show feedback
    toast.success("TIPPER account logged out");

    // Redirect to sign-in
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
      dispatch(clearCredentials());
      localStorage.removeItem("persist:root");
      Cookies.remove("user");
      Cookies.remove("token");

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
              <User className="text-primary size-10" />
            </div>

            {/* Pencil (Edit) */}
            <div className="absolute top-1 right-[-12px] cursor-pointer bg-transparent">
              <Button
                size="icon"
                onClick={() => setOpenEditProfile(true)}
              >
                <PencilLine className="size-4 text-white/90" />
              </Button>
            </div>

            {/* Settings (Inside circle like mockup) */}
            <div className="absolute right-[-12px] bottom-0 flex size-6 items-center justify-center rounded-md border border-white bg-white/20">
              <Button
                size="icon"
                className="!bg-primary/80 border border-white"
                onClick={() => setOpenSettings(true)}
              >
                <Settings className="text-white/80" />
              </Button>
            </div>
          </div>

          {/* Username */}
          <Paragraph
            weight="bold"
            color="white"
            className="text-lg"
          >
            {user_name}
          </Paragraph>

          {/* Anonymous toggle */}
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
            />
          </div>

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
              &pound;{iTipped}
            </Paragraph>
            <Button
              size="icon"
              className="bg-transparent hover:bg-white/10"
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
            <div className="flex size-10 items-center justify-center rounded-full bg-white">
              <User className="text-primary" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <Paragraph
                  weight="bold"
                  color="white"
                >
                  {user_name}
                </Paragraph>
                <Button
                  size="icon"
                  onClick={() => setOpenEditProfile(true)}
                >
                  <PencilLine className="size-4 text-white/90" />
                </Button>
              </div>

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

              <div className="flex items-center gap-4">
                <span className="bg-primary rounded-md border border-white px-3 py-1 text-sm text-white">
                  Total Tipped
                </span>
                <Paragraph
                  weight="bold"
                  color="white"
                >
                  &pound;{iTipped}
                </Paragraph>
                <Button
                  size="icon"
                  className="bg-transparent"
                >
                  <Share2 className="text-white/80" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <Button
              size="icon"
              className="!bg-primary/80 border border-white"
              onClick={() => setOpenSettings(true)}
            >
              <Settings className="text-white/80" />
            </Button>

            <Title size="sm">
              <span className="text-secondary/80">tip</span>
              <span className="text-white">manna</span>
            </Title>
          </div>
        </div>
      </div>

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
            {/* Delete Payment Card */}
            <Button
              variant="outline"
              className="hover:border-border-gray-300 h-14 w-full justify-start border-gray-300 font-medium hover:bg-white hover:text-black"
            >
              <Wallet className="text-muted-foreground size-6" /> Delete Payment
              Card
            </Button>

            {/* Raise a Dispute */}
            <div className="space-y-4 rounded-lg border p-4">
              <h2 className="flex items-center gap-2 font-medium">
                <MessageCircle className="text-muted-foreground" /> Raise a
                Dispute
              </h2>

              {!openChat ? (
                <>
                  <Textarea
                    placeholder="Enter Message"
                    className="w-full resize-none rounded-md border-none p-2 focus-visible:border-none"
                    rows={4}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                  />

                  <Button
                    className="bg-black hover:bg-black/80"
                    disabled={!message.trim()}
                    // onClick={handleOpenChat}
                  >
                    Send
                  </Button>
                </>
              ) : (
                <>
                  <iframe
                    key={directChatUrl} // This forces re-render when URL changes
                    src={directChatUrl}
                    className="h-[350px] w-full overflow-hidden rounded-md border bg-white"
                    title="Support Chat"
                  />
                </>
              )}
            </div>

            {/* Switch to Host */}
            <Button
              variant="outline"
              className="hover:border-border-gray-300 h-14 w-full justify-start border-gray-300 font-medium hover:bg-white hover:text-black"
              onClick={handleSwitchAccount}
            >
              <ArrowLeftRight /> Switch to Host account to add an event
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
              {/* Username */}
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter username"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
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
                              const currentUser = JSON.parse(currentUserCookie);

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
                            emailCode
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

                          window.location.reload();

                          setOpenEmailModal(false);
                          setOpenEditProfile(false);
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
    </div>
  );
};
