"use client";

import { useState, useMemo } from "react";

// Third-party imports
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

// Local imports
import { TopTipperCard } from "./top-tipper-card";
import { truncateText } from "@/lib/utils";
import { DashboardHeading } from "./dashboard-heading";
import { useTopTippers } from "@/hooks/useTopTippers";
import { TopTipperCardSkeleton } from "./top-tipper-card-skeleton";

interface Tipper {
  id: string;
  position: number;
  name: string;
  username: string;
  contributedAmount: number;
  eventsSupported: number;
  eventNames: string[];
}

const ITEMS_PER_PAGE = 10;

export const TopTippersClient = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const { tippers } = useTopTippers();

  // Compute filtered tippers based on search + event filter
  const filteredTippers = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();

    return tippers.filter(tipper => {
      // 1️⃣ Event filter
      const matchesEventFilter =
        selectedEvent === "all" ||
        tipper.eventNames.some((name: string) => name === selectedEvent);

      if (!matchesEventFilter) return false;

      // 2️⃣ Search filter
      if (!searchTerm.trim()) return true;

      const matchesUsername = tipper.username
        .toLowerCase()
        .includes(lowerSearch);

      const matchesEventName = tipper.eventNames.some((eventName: string) =>
        eventName.toLowerCase().includes(lowerSearch)
      );

      return matchesUsername || matchesEventName;
    });
  }, [tippers, searchTerm, selectedEvent]);

  // Pagination logic
  const totalPages = Math.ceil(filteredTippers.length / ITEMS_PER_PAGE);

  const paginatedTippers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredTippers.slice(startIndex, endIndex);
  }, [filteredTippers, currentPage]);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  return (
    <section className="space-y-4 sm:space-y-6">
      <DashboardHeading
        title="Top Tippers"
        subtitle="View and manage your top contributors"
      />

      {/* Search Bar + Dropdown Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
        <div className="relative w-full sm:flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 transform" />
          <Input
            type="text"
            placeholder="Search by tipper name or event..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white pl-10"
          />
        </div>
        <Select
          value={selectedEvent}
          onValueChange={value => setSelectedEvent(value)}
        >
          <SelectTrigger className="w-full bg-white sm:w-auto">
            <SelectValue placeholder="Filter by event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <Calendar className="mr-2 inline h-4 w-4" /> All Events
            </SelectItem>
            {[...new Set(tippers.flatMap(t => t.eventNames))].map(eventName => (
              <SelectItem
                key={eventName}
                value={eventName}
              >
                {truncateText(eventName)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results Count */}
      <p className="text-muted-foreground text-sm">
        Showing {filteredTippers.length} of {tippers.length} tippers
        {searchTerm && <span> for &quot;{searchTerm}&quot;</span>}
      </p>

      {/* Tippers List */}
      {!tippers.length
        ? Array.from({ length: 5 }).map((_, idx) => (
            <TopTipperCardSkeleton key={idx} />
          ))
        : paginatedTippers.map((tipper: Tipper) => (
            <TopTipperCard
              key={tipper.id}
              id={tipper.id}
              position={tipper.position}
              username={tipper.username}
              contributedAmount={tipper.contributedAmount}
              eventsSupported={tipper.eventsSupported}
            />
          ))}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={handlePrevPage}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </section>
  );
};
