import Image from "next/image";
import Link from "next/link";

// Third-party imports
import { MoveLeft } from "lucide-react";

interface Props {
  title: string;
}

export const AuthBanner = ({ title }: Props) => {
  return (
    <div
      style={{
        backgroundImage: `url(/assets/auth-banner.png)`,
        backgroundSize: "100% 100%",
      }}
      className="bg-no-repeat"
    >
      <div className="mini-wrapper grid grid-cols-12 items-center px-4 pt-6 lg:pt-0">
        {/* Content */}
        <div className="col-span-full space-y-2 lg:col-span-7">
          <Link
            href="/"
            className="flex w-fit gap-2 rounded-full px-4 py-2 text-base text-white hover:bg-black/50 sm:text-lg"
          >
            <MoveLeft /> Home
          </Link>

          <h1 className="racing_sans_one text-3xl text-white sm:text-5xl">
            {title}
          </h1>
        </div>

        {/* Image */}
        <div className="col-span-full lg:col-span-5">
          <Image
            src="/assets/auth-story.png"
            alt="Auth story"
            width={500}
            height={500}
            className="-mt-12 h-48 w-full object-cover sm:h-60 lg:mt-0"
          />
        </div>
      </div>
    </div>
  );
};
