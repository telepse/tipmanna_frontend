import TopContents from "./top-contents";
import { getAllFeaturedContentsAction } from "@/actions/contents";

export default async function TopContentsSection() {
  const { data: contents } = await getAllFeaturedContentsAction();

  return <TopContents contents={contents} />;
}
