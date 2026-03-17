"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

// Third-party imports
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector } from "react-redux";

// Local imports
import { Logo } from "./logo";
import { NavLink } from "./nav-link";
import { RootState } from "@/redux/store";
import { NAV_LINKS } from "@/constants";
import { CreateDialog } from "../home/create-dialog";

export default function NavbarClient() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  const isHomePage = pathname === "/";
  const isTipperPage = pathname.includes("tipper");

  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 100);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Memoized click handlers
  const handleAccountClick = useCallback(() => {
    if (!isAuthenticated || !user) {
      router.push("/sign-in");
      return;
    }

    // Use switch for better readability
    switch (user.role) {
      case "TIPPER":
        router.push(`/tipper/${user.username}`);
        break;
      case "HOST":
        router.push(`/host/${user.eventSlug}`);
        break;
      case "VISITOR":
      default:
        router.push("/sign-in");
        break;
    }
  }, [isAuthenticated, user, router]);

  const [openPopup, setOpenPopup] = useState(false);

  return (
    <header
      className={`sticky top-0 z-50 bg-white transition-shadow ${
        isScrolled ? "shadow" : ""
      }`}
      aria-label="Main navigation"
    >
      <div className="wrapper flex items-center justify-between p-4">
        {(isHomePage || isTipperPage) && <Logo />}

        {/* Desktop nav */}
        <nav
          className="hidden gap-6 lg:flex"
          aria-label="Main menu"
        >
          {/* {NAV_LINKS.map((item, index) => (
            <NavLink
              key={index}
              label={item.label}
              href={item.href}
            />
          ))} */}

          <Link
            href="/"
            className={`hover:text-primary open_sans ${pathname === "/" ? "text-primary" : ""}`}
          >
            Home
          </Link>
          <Link
            href="/tv"
            className={`hover:text-primary open_sans ${pathname === "/tv" ? "text-primary" : ""}`}
          >
            Live TV
          </Link>
          <button
            type="button"
            className={`hover:text-primary open_sans cursor-pointer`}
            onClick={() => setOpenPopup(true)}
          >
            Create
          </button>

          <Link
            href="/#faq"
            className={`hover:text-primary open_sans`}
          >
            FAQs
          </Link>
        </nav>

        <CreateDialog
          openPopup={openPopup}
          setOpenPopup={setOpenPopup}
        />

        {/* Desktop buttons */}
        <div className="hidden gap-4 lg:flex">
          <Link href="mailto:hello@tipmanna.live">
            <Button
              variant="outline"
              asChild
              aria-label="Request a demo via email"
            >
              Request Demo
            </Button>
          </Link>

          <Button
            onClick={() => {
              handleAccountClick();
              setIsOpen(false); // close menu
            }}
          >
            My Account
          </Button>
        </div>

        {/* Mobile menu toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls="mobile-menu"
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          {isOpen ? (
            <X
              className="size-8"
              aria-hidden="true"
            />
          ) : (
            <Menu
              className="size-8"
              aria-hidden="true"
            />
          )}
        </Button>
      </div>

      {/* AnimatePresence handles mounting/unmounting */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="mobile-menu"
            className="fixed inset-0 top-16 z-40 bg-black/20 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsOpen(false)} // close on backdrop click
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
          >
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ duration: 0.3 }}
              onClick={e => e.stopPropagation()} // prevent closing when clicking inside
            >
              <div className="flex flex-col gap-4 bg-white p-4 lg:hidden">
                {/* Mobile nav */}
                <nav
                  className="text-muted-foreground flex flex-col items-start gap-6"
                  aria-label="Mobile menu"
                >
                  {NAV_LINKS.map((item, index) => (
                    <NavLink
                      key={index}
                      label={item.label}
                      href={item.href}
                    />
                  ))}
                </nav>

                {/* Mobile buttons */}
                <div className="flex flex-col gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                  >
                    Request Demo
                  </Button>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => {
                      handleAccountClick();
                      setIsOpen(false); // close menu
                    }}
                  >
                    My Account
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
