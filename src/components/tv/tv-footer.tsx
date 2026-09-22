// Third-party imports
import { Button } from "@/components/ui/button";
import { useCreateDialogHost } from "@/components/home/create-dialog-host";
import { Plus } from "lucide-react";
import { CiInstagram, CiLinkedin } from "react-icons/ci";
import { SocialIcon } from "../shared/social-icon";
import { FaXTwitter } from "react-icons/fa6";

export const TVFooter = () => {
  const { openCreate } = useCreateDialogHost();

  return (
    <div className="bg-primary fixed bottom-0 z-[5000000000] hidden w-full flex-col items-center justify-center px-4 py-2 lg:flex">
      {/* Social icons */}
      <div className="fixed bottom-4 left-80 mt-2 flex gap-2">
        <SocialIcon
          Icon={FaXTwitter}
          href="https://x.com/tipmanna"
          size={7}
        />
        <SocialIcon
          Icon={CiInstagram}
          href="https://instagram.com/tipmanna"
          size={7}
        />
        <SocialIcon
          Icon={CiLinkedin}
          href="https://linkedin.com/company/tipmanna"
          size={7}
        />
      </div>

      <div className="flex max-w-xl items-center gap-4">
        <div className="space-y-1">
          <h5 className="font-semibold">
            Join the Tipmanna creator&apos;s community!
          </h5>
          <p className="text-xs leading-normal text-gray-800">
            Create videos and livestreams, start receiving tips or donations.
          </p>
        </div>

        <Button
          className="bg-black hover:bg-black/80"
          onClick={() => openCreate()}
        >
          <Plus className="size-4" /> Create
        </Button>
      </div>
    </div>
  );
};
