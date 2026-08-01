// import TopContents from "./top-contents";
// import { getAllFeaturedContentsAction } from "@/actions/contents";
// import { Content } from "@/types/content.types";

// export default async function TopContentsSection() {
//   const { data: contents } = await getAllFeaturedContentsAction();

//   return <TopContents contents={contents as Content[]} />;
// }

"use client";

import { useState, useEffect } from "react";

import TopContents from "./top-contents";
import { Content } from "@/types/content.types";

export default function TopContentsSection() {
  const [contents, setContents] = useState<Content[]>([]);

  useEffect(() => {
    const fetchContents = async () => {
      const res = await fetch("/api/v1/contents/featured");
      const data = await res.json();
      setContents(data as Content[]);
    };
    fetchContents();
  }, []);

  return <TopContents contents={contents as Content[]} />;
}
