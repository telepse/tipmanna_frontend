import Image from "next/image";

// Local imports
import { Paragraph } from "@/components/shared/paragraph";

interface Props {
  title: string;
}

export const AddEventBanner = ({ title }: Props) => {
  return (
    <div
      className="bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url(/assets/auth-banner.png)`,
      }}
    >
      <div className="mini-wrapper grid grid-cols-1 items-center gap-8 px-4 pt-6 lg:grid-cols-12">
        <div className="col-span-1 space-y-2 lg:col-span-7">
          <h2 className="open_sans text-3xl font-semibold text-white sm:text-5xl">
            {" "}
            {title}{" "}
          </h2>
          <Paragraph color="white">
            Complete the form & <br className="hidden sm:block" />
            submit for approval.
          </Paragraph>
        </div>

        <div className="col-span-1 flex justify-center lg:col-span-5 lg:justify-end">
          <Image
            src="/assets/event-story.png"
            alt="Auth story"
            width={500}
            height={500}
            className="h-auto w-52 object-contain sm:w-64 md:w-80 lg:w-full"
            priority
          />
        </div>
      </div>
    </div>
  );
};
