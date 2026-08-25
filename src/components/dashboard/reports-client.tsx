"use client";

import { useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

// Third-party imports
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, TrendingUp, Wallet } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { eachMonthOfInterval, format } from "date-fns";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "react-date-range/dist/styles.css"; // main style
import "react-date-range/dist/theme/default.css"; // theme style
import { DateRange, Range } from "react-date-range";
import { Button } from "@/components/ui/button";

// Local imports
import { calculateEarnings } from "@/lib/utils";
import { StatCard } from "./stat-card";
import { eventColumns } from "./event-columns";
import { transactionColumns } from "./transaction-columns";
import { DashboardHeading } from "./dashboard-heading";
import { useReportsAndAnalytics } from "@/hooks/useReportsAndAnalytics";
import { useHostPayoutSummary } from "@/hooks/useHostPayoutSummary";
import { VideoAnalyticsPanel } from "@/components/dashboard/video-analytics-panel";
import { formatGbpMinor } from "@/lib/host-plan-capabilities";

function formatDate(isoString: string) {
  const date = new Date(isoString);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export const ReportsClient = () => {
  const params = useParams();
  const hostSlug = typeof params?.slug === "string" ? params.slug : "";
  const [tabType, setTabType] = useState<
    "events" | "transaction" | "reports" | "video"
  >("events");

  const { events, transactions } = useReportsAndAnalytics();
  const { summary: payoutSummary } = useHostPayoutSummary();

  const {
    totalEarnings,
    thisMonthEarnings,
    percentChangeFromLastMonth,
    lastPayment,
  } = calculateEarnings(transactions || []);

  const lastPaymentPurchaseTime = formatDate(lastPayment?.purchaseTime ?? 0);

  const [showDateRange, setShowDateRange] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const [dateRange, setDateRange] = useState<Range[]>([
    {
      startDate: new Date(new Date().getFullYear(), 7, 1), // default August 1
      endDate: new Date(), // default today
      key: "selection",
    },
  ]);

  // 🧮 Build monthly totals (always Jan → Dec)
  const monthlyData = useMemo(() => {
    if (!transactions?.length) return [];

    const currentYear = new Date().getFullYear();

    // If we're past July, start this cycle in August this year → July next year
    const start = new Date(currentYear, 7, 1); // August (month is 0-indexed)
    const end = new Date(currentYear + 1, 6, 31); // July next year

    const monthsOfYear = eachMonthOfInterval({ start, end });

    const totalsMap = new Map<string, number>();
    transactions.forEach(tx => {
      const date = new Date(tx.purchaseTime);
      const label = format(date, "MMM yyyy");
      const current = totalsMap.get(label) ?? 0;
      totalsMap.set(label, current + tx.amount);
    });

    return monthsOfYear.map(monthDate => {
      const label = format(monthDate, "MMM yyyy");
      return {
        month: label,
        total: totalsMap.get(label) ?? 0,
      };
    });
  }, [transactions]);

  const filteredMonthlyData = useMemo(() => {
    if (!monthlyData.length) return [];

    const { startDate, endDate } = dateRange?.[0];

    // If either is undefined, fallback to full range
    if (!startDate || !endDate) return monthlyData;

    return monthlyData.filter(item => {
      const itemDate = new Date(item.month + " 01"); // "MMM yyyy" → first of the month
      return itemDate >= startDate && itemDate <= endDate;
    });
  }, [monthlyData, dateRange]);

  const exportReport = async () => {
    console.log("Export report");
  };

  return (
    <section className="w-full max-w-full min-w-0 space-y-4 overflow-x-clip sm:space-y-6">
      <DashboardHeading
        title="Reports & Insights"
        subtitle="Track your earnings, manage payouts, and generate reports"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Earnings"
          value={totalEarnings}
          icon={Wallet}
          subLabel="Lifetime earnings"
          isMoney
          hasColor
        />
        <StatCard
          label="This Month's Earnings"
          value={thisMonthEarnings}
          icon={TrendingUp}
          subLabel={`+${percentChangeFromLastMonth.toFixed(2)}% from last month `}
          isMoney
          hasColor
        />
        <StatCard
          label="Pending payouts"
          value={(payoutSummary?.pendingMinor ?? 0) / 100}
          icon={Wallet}
          subLabel={`Event tips ${formatGbpMinor(payoutSummary?.pendingByBranch.eventTipsMinor ?? 0)} · Community ${formatGbpMinor(payoutSummary?.pendingByBranch.communitySubscriptionMinor ?? 0)}`}
          isMoney
          hasColor
        />
        <StatCard
          label="Last payment"
          value={lastPayment?.amount ?? 0}
          icon={Wallet}
          subLabel={lastPaymentPurchaseTime}
          isMoney
          hasColor
        />
      </div>

      {hostSlug ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            Confirm payouts and view obligation history on Revenue &amp;
            Payouts.
          </span>
          <Link
            href={`/host/${hostSlug}/revenue`}
            className="text-primary font-medium underline"
          >
            Open Revenue &amp; Payouts
          </Link>
        </div>
      ) : null}

      <Tabs
        value={tabType}
        onValueChange={val =>
          setTabType(val as "events" | "transaction" | "reports" | "video")
        }
        className="w-full max-w-full min-w-0 space-y-4 overflow-x-clip sm:space-y-6"
      >
        <TabsList className="flex h-14! w-full min-w-0 gap-1 overflow-hidden">
          <TabsTrigger
            value="events"
            className="data-[state=active]:bg-primary h-13! min-w-0 flex-1 rounded-none bg-white px-2 text-xs font-semibold data-[state=active]:border-b-2 data-[state=active]:text-white sm:text-sm"
          >
            Events
          </TabsTrigger>

          <TabsTrigger
            value="transaction"
            className="data-[state=active]:bg-primary h-13! min-w-0 flex-1 rounded-none bg-white px-2 text-xs font-semibold data-[state=active]:border-b-2 data-[state=active]:text-white sm:text-sm"
          >
            Transaction
          </TabsTrigger>

          <TabsTrigger
            value="reports"
            className="data-[state=active]:bg-primary h-13! min-w-0 flex-1 rounded-none bg-white px-2 text-xs font-semibold data-[state=active]:border-b-2 data-[state=active]:text-white sm:text-sm"
          >
            Reports
          </TabsTrigger>

          <TabsTrigger
            value="video"
            className="data-[state=active]:bg-primary h-13! min-w-0 flex-1 rounded-none bg-white px-2 text-xs font-semibold data-[state=active]:border-b-2 data-[state=active]:text-white sm:text-sm"
          >
            <span className="truncate">Video analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="events"
          className="w-full max-w-full min-w-0"
        >
          <div className="bg-card max-w-full min-w-0 space-y-4 rounded-md p-3 sm:p-6">
            <div className="space-y-2 font-medium">
              <h5 className="text-xl">Event Payment Breakdown</h5>
              <p className="text-muted-foreground text-sm">
                Payment details for each hosted event
              </p>
            </div>

            <DataTable
              columns={eventColumns}
              data={events}
            />
          </div>
        </TabsContent>

        <TabsContent
          value="transaction"
          className="w-full max-w-full min-w-0 space-y-6"
        >
          <div className="bg-card max-w-full min-w-0 space-y-4 rounded-md p-3 sm:p-6">
            <div className="space-y-2 font-medium">
              <h5 className="text-xl">Transaction History</h5>
              <p className="text-muted-foreground text-sm">
                Detailed view of all tips received
              </p>
            </div>

            <DataTable
              columns={transactionColumns}
              data={transactions}
            />
          </div>
        </TabsContent>

        <TabsContent
          value="reports"
          className="w-full max-w-full min-w-0"
        >
          <div
            className="bg-card max-w-full min-w-0 space-y-4 rounded-md p-3 sm:p-6"
            ref={reportRef}
          >
            {/* Header */}
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Title */}
              <div className="min-w-0 space-y-1 font-medium">
                <h5 className="text-xl">Monthly Earnings</h5>

                <p className="text-muted-foreground text-sm">
                  Your earning reports
                </p>
              </div>

              {/* Actions */}
              <div className="relative flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                {/* Buttons */}
                <div className="flex w-full gap-2 sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-w-0 flex-1 border-black px-2 text-xs sm:flex-none sm:px-4 sm:text-sm"
                    onClick={() => setShowDateRange(!showDateRange)}
                  >
                    <Calendar className="size-4 shrink-0" />

                    <span className="truncate">
                      {showDateRange ? "Hide Date Range" : "Select Date Range"}
                    </span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="min-w-0 flex-1 border-black px-2 text-xs sm:flex-none sm:px-4 sm:text-sm"
                    onClick={exportReport}
                  >
                    <span className="truncate">Export Report</span>
                  </Button>
                </div>

                {/* Date picker */}
                {showDateRange && (
                  <div className="w-full max-w-full overflow-x-auto sm:absolute sm:top-full sm:right-0 sm:z-20 sm:mt-2 sm:w-auto">
                    <DateRange
                      editableDateInputs={true}
                      onChange={item => setDateRange([item.selection])}
                      moveRangeOnFirstSelection={false}
                      ranges={dateRange}
                      months={1}
                      direction="horizontal"
                      showMonthAndYearPickers={true}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Chart */}
            <div className="h-[280px] w-full min-w-0 sm:h-[350px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={filteredMonthlyData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: 0,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10 }}
                    tickMargin={8}
                    interval="preserveStartEnd"
                  />

                  <YAxis
                    tickFormatter={value => `£${value}`}
                    tick={{ fontSize: 10 }}
                    width={45}
                  />

                  <Tooltip
                    labelStyle={{ fontWeight: 600 }}
                    formatter={(value: number) => [
                      `£${value.toLocaleString()}`,
                      "Total",
                    ]}
                  />

                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#f57d11"
                    strokeWidth={3}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="video"
          className="w-full max-w-full min-w-0"
        >
          <VideoAnalyticsPanel variant="reports" />
        </TabsContent>
      </Tabs>
    </section>
  );
};
