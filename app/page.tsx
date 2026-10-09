
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDocFromServer,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../lib/firebase";

type Client = {
  id: string;
  studioId?: string;
  clientName?: string;
  totalAmount?: number;
};

type Payment = {
  id: string;
  studioId?: string;
  clientName?: string;
  amount?: number;
  paymentDate?: string;
  createdAt?: any;
};

type Task = {
  id: string;
  studioId?: string;
  title?: string;
  name?: string;
  status?: string;
  completed?: boolean;
};

type Wedding = {
  id: string;
  studioId?: string;
  eventName?: string;
  clientName?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  weddingDate?: string;
  venue?: string;
  status?: string;
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatDate(value: any) {
  if (!value) return "Date not set";

  let date: Date;

  if (typeof value?.toDate === "function") {
    date = value.toDate();
  } else if (value instanceof Date) {
    date = value;
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) return "Date not set";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDateValue(value: any): number {
  if (!value) return 0;

  if (typeof value?.toDate === "function") {
    return value.toDate().getTime();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getPaymentDate(payment: Payment) {
  return getDateValue(payment.paymentDate || payment.createdAt);
}

export default function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [studioName, setStudioName] = useState("Loading studio...");
  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;

      if (!user) {
        setStudioName("Please Login");
        setClients([]);
        setPayments([]);
        setTasks([]);
        setWeddings([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage("");

      try {
        const userId = user.uid;

        const studioSnap = await getDocFromServer(
          doc(db, "studios", userId)
        );

        if (!active) return;

        if (studioSnap.exists()) {
          const studioData = studioSnap.data();
          setStudioName(
            studioData.studioName ||
              studioData.name ||
              "My Studio"
          );
        } else {
          setStudioName("Studio Profile Not Found");
        }

        const [clientSnap, paymentSnap, taskSnap, weddingSnap] =
          await Promise.all([
            getDocs(
              query(
                collection(db, "clients"),
                where("studioId", "==", userId)
              )
            ),
            getDocs(
              query(
                collection(db, "payments"),
                where("studioId", "==", userId)
              )
            ),
            getDocs(
              query(
                collection(db, "tasks"),
                where("studioId", "==", userId)
              )
            ),
            getDocs(
              query(
                collection(db, "weddings"),
                where("studioId", "==", userId)
              )
            ),
          ]);

        if (!active) return;

        setClients(
          clientSnap.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })) as Client[]
        );

        setPayments(
          paymentSnap.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })) as Payment[]
        );

        setTasks(
          taskSnap.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })) as Task[]
        );

        setWeddings(
          weddingSnap.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })) as Wedding[]
        );
      } catch (error: any) {
        console.error("Dashboard loading error:", error);

        if (active) {
          setErrorMessage(
            error?.message ||
              "Dashboard load થયું નથી. Internet અને Firebase permissions તપાસો."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  async function handleLogout() {
    const confirmed = window.confirm("શું તમે Logout કરવા માંગો છો?");
    if (!confirmed) return;

    try {
      setLoggingOut(true);
      await signOut(auth);
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      alert("Logout થયું નથી. ફરી પ્રયત્ન કરો.");
      setLoggingOut(false);
    }
  }

  const totalClients = clients.length;

  const totalRevenue = clients.reduce(
    (sum, client) => sum + Number(client.totalAmount || 0),
    0
  );

  const totalPaid = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );

  const pendingPayment = Math.max(0, totalRevenue - totalPaid);

  const pendingTasks = tasks.filter((task) => {
    const status = String(task.status || "").toLowerCase();

    return (
      task.completed !== true &&
      !["completed", "complete", "done"].includes(status)
    );
  }).length;

  const recentPayments = [...payments]
    .sort((a, b) => getPaymentDate(b) - getPaymentDate(a))
    .slice(0, 5);

  const upcomingEvents = [...weddings]
    .sort(
      (a, b) =>
        getDateValue(a.eventStartDate || a.weddingDate) -
        getDateValue(b.eventStartDate || b.weddingDate)
    )
    .slice(0, 5);

  const navItems = [
    { label: "Dashboard", href: "/", icon: "🏠" },
    { label: "Clients", href: "/clients", icon: "👥" },
    { label: "Events", href: "/weddings", icon: "💍" },
    { label: "Payments", href: "/payments", icon: "💰" },
    { label: "Tasks", href: "/tasks", icon: "✅" },
    { label: "Calendar", href: "/calendar", icon: "📅" },
    { label: "Expenses", href: "/expenses", icon: "🧾" },
    { label: "Reports", href: "/reports", icon: "📊" },
  ];

  const stats = [
    {
      label: "Total Clients",
      value: totalClients.toString(),
      icon: "👥",
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "Total Revenue",
      value: formatMoney(totalRevenue),
      icon: "💵",
      color: "bg-green-50 text-green-700",
    },
    {
      label: "Pending Payment",
      value: formatMoney(pendingPayment),
      icon: "💰",
      color: "bg-orange-50 text-orange-700",
    },
    {
      label: "Pending Tasks",
      value: pendingTasks.toString(),
      icon: "✅",
      color: "bg-purple-50 text-purple-700",
    },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-3 sm:px-5">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-xl hover:bg-slate-100"
          >
            ☰
          </button>

          <Link href="/" className="min-w-0 text-center">
            <span className="block truncate text-xl font-extrabold tracking-tight text-indigo-700 sm:text-2xl">
              WedFlow
            </span>
            <span className="hidden text-[10px] text-slate-500 min-[360px]:block">
              Wedding Studio Management
            </span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="shrink-0 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 sm:px-4 sm:text-sm"
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close menu overlay"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-black/50"
          />

          <aside className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-4">
              <div className="min-w-0">
                <p className="text-xl font-extrabold text-indigo-700">
                  WedFlow
                </p>
                <p className="truncate text-xs text-slate-500">
                  {studioName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-2xl hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                    item.href === "/"
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="border-t p-3">
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full rounded-xl bg-red-50 px-4 py-3 text-left text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                {loggingOut ? "Logging out..." : "🚪 Logout"}
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-3 py-5 sm:px-5 sm:py-7 lg:px-8">
        <section className="mb-6 rounded-2xl bg-gradient-to-r from-indigo-700 to-violet-600 p-5 text-white shadow-md sm:mb-8 sm:p-7">
          <p className="mb-2 text-sm text-indigo-100">Welcome to WedFlow</p>
          <h1 className="break-words text-2xl font-bold sm:text-3xl">
            {studioName}
          </h1>
          <p className="mt-2 text-sm text-indigo-100">
            Manage your studio, clients, payments and events in one place.
          </p>
        </section>

        {errorMessage && (
          <div className="mb-5 break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">Dashboard Error</p>
            <p className="mt-1">{errorMessage}</p>
          </div>
        )}

        {loading && (
          <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Dashboard data loading...
          </div>
        )}

        {!auth.currentUser && !loading ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-lg font-bold">Please Login</p>
            <p className="mt-2 text-sm text-slate-600">
              Manage your wedding studio from one place.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Go to Login
            </Link>
          </section>
        ) : (
          <>
            <section className="mb-8">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold sm:text-xl">
                  Studio Overview
                </h2>
                <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-500 shadow-sm">
                  Live data
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5"
                  >
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <p className="text-sm text-slate-500">{stat.label}</p>
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${stat.color}`}
                      >
                        {stat.icon}
                      </span>
                    </div>
                    <p className="break-words text-2xl font-extrabold tracking-tight sm:text-3xl">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-lg font-bold sm:text-xl">
                Quick Actions
              </h2>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  {
                    label: "Add Client",
                    href: "/clients",
                    icon: "👤",
                  },
                  {
                    label: "Add Event",
                    href: "/weddings",
                    icon: "💍",
                  },
                  {
                    label: "Add Payment",
                    href: "/payments",
                    icon: "💵",
                  },
                  {
                    label: "View Tasks",
                    href: "/tasks",
                    icon: "✅",
                  },
                ].map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex min-h-28 min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    <span className="text-2xl">{action.icon}</span>
                    <span className="break-words text-sm font-semibold">
                      {action.label}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
                  <h2 className="text-base font-bold sm:text-lg">
                    Upcoming Events
                  </h2>
                  <Link
                    href="/weddings"
                    className="shrink-0 text-xs font-semibold text-indigo-700 hover:underline sm:text-sm"
                  >
                    View All
                  </Link>
                </div>

                {upcomingEvents.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-500">
                    No events found.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {upcomingEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex min-w-0 items-start gap-3 p-4 sm:p-5"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-xl">
                          💍
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold">
                            {event.eventName ||
                              event.clientName ||
                              "Wedding Event"}
                          </p>
                          {event.clientName && event.eventName && (
                            <p className="mt-1 break-words text-xs text-slate-500">
                              Client: {event.clientName}
                            </p>
                          )}
                          <p className="mt-1 break-words text-xs text-slate-500">
                            📅{" "}
                            {formatDate(
                              event.eventStartDate || event.weddingDate
                            )}
                          </p>
                          {event.venue && (
                            <p className="mt-1 break-words text-xs text-slate-500">
                              📍 {event.venue}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
                  <h2 className="text-base font-bold sm:text-lg">
                    Recent Payments
                  </h2>
                  <Link
                    href="/payments"
                    className="shrink-0 text-xs font-semibold text-indigo-700 hover:underline sm:text-sm"
                  >
                    View All
                  </Link>
                </div>

                {recentPayments.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-500">
                    No payments found.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {recentPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex min-w-0 items-center gap-3 p-4 sm:p-5"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-xl">
                          💰
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold">
                            {payment.clientName || "Client Payment"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(
                              payment.paymentDate || payment.createdAt
                            )}
                          </p>
                        </div>
                        <p className="shrink-0 break-words text-right text-sm font-bold text-green-700">
                          {formatMoney(Number(payment.amount || 0))}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <footer className="py-8 text-center text-xs text-slate-400">
              WedFlow · Wedding Studio Management
            </footer>
          </>
        )}
      </div>
    </main>
  );
}