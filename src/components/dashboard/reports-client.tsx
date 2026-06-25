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
    "events" | "transactions" | "reports" | "video"
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
    <section className="space-y-4 sm:space-y-6">
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
          setTabType(val as "events" | "transactions" | "reports" | "video")
        }
        className="space-y-4 sm:space-y-6"
      >
        <TabsList className="bg-secondary/20 flex !h-14 w-full">
          <TabsTrigger
            value="events"
            className="h-13! font-semibold"
          >
            Events
          </TabsTrigger>
          <TabsTrigger
            value="transaction"
            className="h-13! font-semibold"
          >
            Transaction
          </TabsTrigger>
          <TabsTrigger
            value="reports"
            className="h-13! font-semibold"
          >
            Reports
          </TabsTrigger>
          <TabsTrigger
            value="video"
            className="h-13! font-semibold"
          >
            Video analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <div className="bg-card space-y-4 rounded-md p-6">
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
          className="space-y-6"
        >
          <div className="bg-card space-y-4 rounded-md p-6">
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

        <TabsContent value="reports">
          <div
            className="bg-card space-y-4 rounded-md p-6"
            ref={reportRef}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2 font-medium">
                <h5 className="text-xl">Monthly Earnings</h5>
                <p className="text-muted-foreground text-sm">
                  Your earning reports
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-black"
                  onClick={() => setShowDateRange(!showDateRange)}
                >
                  <Calendar />{" "}
                  {showDateRange ? "Hide Date Range" : "Select Date Range"}
                </Button>
                .
                <Button
                  type="button"
                  variant="outline"
                  className="border-black"
                  onClick={exportReport}
                >
                  Export Report
                </Button>
                {showDateRange && (
                  <DateRange
                    editableDateInputs={true}
                    onChange={item => setDateRange([item.selection])}
                    moveRangeOnFirstSelection={false}
                    ranges={dateRange}
                    months={2}
                    direction="horizontal"
                    showMonthAndYearPickers={true}
                  />
                )}
              </div>
            </div>

            <div className="h-[350px] w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart data={filteredMonthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    tickFormatter={value => `£${value}`}
                    tick={{ fontSize: 12 }}
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

        <TabsContent value="video">
          <VideoAnalyticsPanel />
        </TabsContent>
      </Tabs>
    </section>
  );
};
