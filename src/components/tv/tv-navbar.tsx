"use client";

import Link from "next/link";

// THird-party imports
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMediaQuery } from "react-responsive";
import {
  Bell,
  ChevronDown,
  CircleUserRound,
  Menu,
  Plus,
  Search,
  Tv,
  UserRound,
} from "lucide-react";
import {
  FacebookShareButton,
  FacebookIcon,
  TwitterShareButton,
  TwitterIcon,
  WhatsappShareButton,
  WhatsappIcon,
  LinkedinShareButton,
  LinkedinIcon,
} from "next-share";

// Local imports
import {
  SearchVideoFormData,
  searchVideoSchema,
} from "@/schemas/tv-search.schema";
import { useMemo, useState } from "react";
import { CreateDialog } from "../home/create-dialog";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { SITE_URL } from "@/lib/site-config";
import { getAccountNavHref } from "@/lib/account-nav-href";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface Props {
  active_users: number;
}

function TvSourceDropdown({
  communityId,
  options,
  onChange,
}: {
  communityId: string | null;
  options: { id: string; name: string }[];
  onChange: (id: string | null) => void;
}) {
  const label =
    communityId != null
      ? (options.find(c => c.id === communityId)?.name ?? "Community TV")
      : "Tipmanna TV";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-800 shadow-sm"
          aria-label="TV source"
        >
          <Tv className="size-3.5 shrink-0" />
          <span className="max-w-[120px] truncate">{label}</span>
          <ChevronDown className="size-3 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => onChange(null)}>
          Tipmanna TV (global)
        </DropdownMenuItem>
        {options.map(c => (
          <DropdownMenuItem
            key={c.id}
            onClick={() => onChange(c.id)}
          >
            {c.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const TVNavbar = ({ active_users }: Props) => {
  // 1. Define search form
  const searchForm = useForm<SearchVideoFormData>({
    resolver: zodResolver(searchVideoSchema),
    defaultValues: {
      searchTerm: "",
    },
  });

  const isMobile = useMediaQuery({
    query: "(max-width: 500px)",
  });

  // 2. Define search form submit handler
  const onSubmit = async (values: SearchVideoFormData) => {
    console.log(values);
  };

  const [showShare, setShowShare] = useState(false);

  const handleToggle = () => {
    console.log("showShare", showShare);
    setShowShare(prev => !prev);
  };

  const shareUrl = `${SITE_URL.replace(/\/$/, "")}/tv`;
  const shareTitle = "Join me on TipManna TV";

  const [openPopup, setOpenPopup] = useState(false);

  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  const accountHref = useMemo(
    () => getAccountNavHref(user, isAuthenticated),
    [user, isAuthenticated]
  );

  return (
    <div className="fixed top-0 right-0 left-0 z-10 flex w-full items-center justify-between border-b border-gray-200 bg-white p-4">
      {/* Menu icon and logo */}
      <div className="flex items-center gap-2">
        <Menu className="hidden lg:block" />
        <Link
          href="/partner"
          className="racing_sans_one text-sm sm:text-2xl"
        >
          tip<span className="text-primary">manna</span>
        </Link>
      </div>

      {/* Explore contents */}
      <div className="bg-gray hidden w-96 items-center gap-2 lg:flex">
        <Input
          className="bg-gray h-8 rounded-md border-none text-sm focus:outline-none"
          placeholder="Explore contents"
        />

        <Search />
      </div>

      {/* Live TV, create, notification, profile */}
      <div className="hidden items-center gap-4 lg:flex">
        <span className="text-sm">Live TV</span>
        <span className="text-sm">Create</span>
        <Bell className="size-5" />
        <CircleUserRound className="size-5" />
      </div>

      <div className="ml-auto flex items-center gap-2 lg:hidden">
        <span className="bg-moonstone-blue -mt-2 size-[14px] rounded-full sm:size-4"></span>{" "}
        <span className="-mt-2 text-xs font-medium sm:text-sm">
          {active_users || 0} online
        </span>
        <div className="relative inline-block">
          {/* <TvSourceDropdown
                    communityId={tvInlineSourceCommunityId}
                    options={tvInlineSourceOptions}
                    onChange={onTvInlineSourceChange}
                  /> */}

          <span
            className="-mt-2 block border-b-2 border-black text-xs sm:text-sm"
            onClick={handleToggle}
          >
            Share TV
          </span>

          {showShare && (
            <div className="absolute top-8 right-full z-[10000000000] mt-2 h-[50px] w-[150px] rounded-md border bg-white p-1 shadow-md">
              <WhatsappShareButton
                url={shareUrl}
                title={shareTitle}
              >
                <WhatsappIcon
                  size={32}
                  round
                />
              </WhatsappShareButton>
              <FacebookShareButton
                url={shareUrl}
                quote={shareTitle}
              >
                <FacebookIcon
                  size={32}
                  round
                />
              </FacebookShareButton>
              <TwitterShareButton
                url={shareUrl}
                title={shareTitle}
              >
                <TwitterIcon
                  size={32}
                  round
                />
              </TwitterShareButton>
              <LinkedinShareButton
                url={shareUrl}
                summary={shareTitle}
              >
                <LinkedinIcon size={32} />
              </LinkedinShareButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// <div
//   className={`flex w-full items-center justify-between border border-b bg-white px-4 py-2 lg:fixed lg:top-0 lg:z-[10] ${isMobile ? "fixed top-0 left-0" : ""}`}
// >
//   <div className="flex w-full items-center justify-between gap-2">
//     <div className="flex items-center gap-2">
//     <Menu />

//     <Link
//       href="/partner"
//       className="racing_sans_one text-sm sm:text-2xl"
//     >
//       <span className="text-primary">tip</span>manna
//     </Link>
//     </div>

//     {/* {isMobile ? (
//       <>
//         <div className="ml-auto flex items-center gap-1">
//           <span className="bg-moonstone-blue size-[14px] rounded-full sm:size-4"></span>{" "}
//           <span className="text-xs font-medium sm:text-sm">
//             {active_users || 0} online
//           </span>
//           <div className="relative inline-block">
//             <span
//               className="border-b-2 border-black text-xs sm:text-sm"
//               onClick={handleToggle}
//             >
//               Share TV
//             </span>

//             {showShare && (
//               <div className="absolute top-8 right-full z-[10000000000] mt-2 h-[50px] w-[150px] rounded-md border bg-white p-1 shadow-md">
//                 <WhatsappShareButton
//                   url={shareUrl}
//                   title={shareTitle}
//                 >
//                   <WhatsappIcon
//                     size={32}
//                     round
//                   />
//                 </WhatsappShareButton>
//                 <FacebookShareButton
//                   url={shareUrl}
//                   quote={shareTitle}
//                 >
//                   <FacebookIcon
//                     size={32}
//                     round
//                   />
//                 </FacebookShareButton>
//                 <TwitterShareButton
//                   url={shareUrl}
//                   title={shareTitle}
//                 >
//                   <TwitterIcon
//                     size={32}
//                     round
//                   />
//                 </TwitterShareButton>
//                 <LinkedinShareButton
//                   url={shareUrl}
//                   summary={shareTitle}
//                 >
//                   <LinkedinIcon size={32} />
//                 </LinkedinShareButton>
//               </div>
//             )}
//           </div>
//         </div>
//       </>
//     ) : (
//       <>
//         <div
//           className={`${isAuthenticated ? "-ml-115 gap-40" : "-ml-115 gap-16"} flex items-center justify-between`}
//         >
//           <Form {...searchForm}>
//             <form
//               onSubmit={searchForm.handleSubmit(onSubmit)}
//               className="bg-gray w-96"
//             >
//               <FormField
//                 control={searchForm.control}
//                 name="searchTerm"
//                 render={({ field }) => (
//                   <FormItem className="flex justify-between">
//                     <FormControl>
//                       <Input
//                         placeholder="Explore contents"
//                         autoComplete="off"
//                         className="h-8 p-2"
//                         {...field}
//                       />
//                     </FormControl>
//                   </FormItem>
//                 )}
//               />
//             </form>
//           </Form>

//           <div className="flex items-center gap-4">
//             <button
//               type="button"
//               className="bg-gray flex items-center gap-2 rounded-full p-2 text-sm"
//               onClick={() => setOpenPopup(true)}
//             >
//               <Plus className="size-4" /> Create
//             </button>
//             {user && (
//               <>
//                 <Link
//                   href={`/tipper/${user?.username}`}
//                   prefetch={true}
//                   target="_blank"
//                 >
//                   <UserRound className="size-5" />
//                 </Link>
//               </>
//             )}

//             {!user && (
//               <Button asChild>
//                 <Link
//                   href={accountHref}
//                   prefetch={true}
//                 >
//                   My Account
//                 </Link>
//               </Button>
//             )}
//           </div>
//         </div>

//         <div />
//       </>
//     )} */}

//     <CreateDialog
//       openPopup={openPopup}
//       setOpenPopup={setOpenPopup}
//     />
//   </div>
// </div>
