import TopContents from "./top-contents";
import { getAllFeaturedContentsAction } from "@/actions/contents";
import { Content } from "@/types/content.types";

export default async function TopContentsSection() {
  const { data: contents } = await getAllFeaturedContentsAction();

  return <TopContents contents={contents as Content[]} />;
}
