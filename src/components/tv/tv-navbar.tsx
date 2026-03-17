"use client";

import Link from "next/link";

// THird-party imports
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bookmark, Search, Share2, Youtube } from "lucide-react";
import { useSelector } from "react-redux";
import { useMediaQuery } from "react-responsive";

// Local imports
import { Logo } from "@/components/shared/logo";
import {
  SearchVideoFormData,
  searchVideoSchema,
} from "@/schemas/tv-search.schema";
import { RootState } from "@/redux/store";

interface Props {
  active_users: number;
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

  return (
    <div className="flex items-center justify-between border border-b px-4 py-2">
      <div className="flex items-center justify-between gap-2">
        <Link href="/">
          <Logo />
        </Link>

        {isMobile ? (
          <>
            <div className="flex items-center gap-1">
              <span className="bg-moonstone-blue size-[14px] rounded-full sm:size-4"></span>{" "}
              <span className="text-xs font-medium sm:text-sm">
                {active_users || 0} online
              </span>
            </div>
          </>
        ) : (
          <Form {...searchForm}>
            <form
              onSubmit={searchForm.handleSubmit(onSubmit)}
              className="bg-gray w-96"
            >
              <FormField
                control={searchForm.control}
                name="searchTerm"
                render={({ field }) => (
                  <FormItem className="flex justify-between">
                    <FormControl>
                      <Input
                        placeholder="Search contents"
                        autoComplete="off"
                        className="h-8 p-2"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        )}

        {/* {!isMobile && (
          <Link
            href="/create"
            className="flex items-center gap-1"
          >
            <Youtube className="hover:text-primary" />{" "}
            <span className="text-sm">Create</span>
          </Link>
        )} */}
      </div>

      {/* {!isMobile && (
        <Link
          href="/sign-in"
          className="text-sm"
        >
          <Button className="bg-black hover:bg-black/80">Sign in</Button>
        </Link>
      )} */}

      <div></div>
    </div>
  );
};
