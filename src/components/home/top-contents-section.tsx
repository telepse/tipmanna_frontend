import TopContents from "./top-contents";
import {
  getAllFeaturedContentsAction,
  getExploreChannelMetricsBatchAction,
  type ExploreChannelMetrics,
  type ExploreChannelMetricsResponse,
} from "@/actions/contents";
import { normalizeListPayload } from "@/lib/list-response-normalizer";

type FeaturedContent = {
  id: string;
  metrics?: ExploreChannelMetrics;
  [key: string]: unknown;
};

function isPublicMetrics(
  raw: ExploreChannelMetricsResponse | undefined
): raw is ExploreChannelMetrics {
  return Boolean(raw && !("restricted" in raw));
}

async function withEngagementMetrics(
  contents: FeaturedContent[]
): Promise<FeaturedContent[]> {
  if (contents.length === 0 || contents.every(item => item.metrics)) {
    return contents;
  }

  const metricsRes = await getExploreChannelMetricsBatchAction(
    contents.map(item => item.id)
  );
  const metricsMap =
    metricsRes.success && metricsRes.data?.metrics
      ? metricsRes.data.metrics
      : {};

  return contents.map(item => {
    if (item.metrics) return item;
    const raw = metricsMap[item.id];
    if (!isPublicMetrics(raw)) return item;
    return { ...item, metrics: raw };
  });
}

export default async function TopContentsSection() {
  const { data } = await getAllFeaturedContentsAction();
  const contents = normalizeListPayload<FeaturedContent>(data);
  const withMetrics = await withEngagementMetrics(contents);

  return <TopContents contents={withMetrics} />;
}
