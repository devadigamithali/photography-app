import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";

const CARDS = [
  {
    href: "/admin/inquiries",
    title: "Inquiries",
    description: "Kanban board of incoming leads, from new to booked.",
  },
  {
    href: "/admin/calendar",
    title: "Calendar",
    description: "See bookings at a glance and check for conflicts.",
  },
  {
    href: "/admin/portfolio",
    title: "Portfolio",
    description: "Manage albums and photos on your public site.",
  },
  {
    href: "/admin/galleries",
    title: "Galleries",
    description: "Create private client galleries and view their picks.",
  },
];

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Dashboard
      </h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CARDS.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardBody>
                <h2 className="mb-1 font-medium text-zinc-900 dark:text-zinc-100">
                  {card.title}
                </h2>
                <p className="text-sm text-zinc-500">{card.description}</p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
