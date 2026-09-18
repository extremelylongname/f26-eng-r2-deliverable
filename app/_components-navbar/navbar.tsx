import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCurrentUser } from "@/lib/server-utils";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import Link from "next/link";

const homeLink = { href: "/", label: "Home" };
const signedInLinks = [
  { href: "/species", label: "Species" },
  { href: "/species-speed", label: "Species Speed" },
  { href: "/users", label: "Users" },
  { href: "/species-chatbot", label: "Species Chatbot" },
];

export default async function Navbar({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const links = (await getCurrentUser()) ? [homeLink, ...signedInLinks] : [homeLink];

  return (
    <nav className={cn("flex items-center", className)} {...props}>
      {/* Inline links from the md breakpoint up; below it a menu button, so the links never overflow the header */}
      <div className="hidden items-center space-x-4 md:flex lg:space-x-6">
        {links.map(({ href, label }) => (
          <Link key={href} href={href} className="text-sm font-medium transition-colors hover:text-primary">
            {label}
          </Link>
        ))}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 px-0 md:hidden" aria-label="Open navigation menu">
            <Menu className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {links.map(({ href, label }) => (
            <DropdownMenuItem key={href} asChild>
              <Link href={href}>{label}</Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
