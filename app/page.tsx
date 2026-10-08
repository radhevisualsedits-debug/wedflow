"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  getDocFromServer,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
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
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDate(dateString?: string) {
  if (!dateString) return "-";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDateValue(value: any) {
  if (!value) return 0;

  if (typeof value?.toDate === "function") {
    return value.toDate().getTime();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  const date = new Date(value).getTime();

  return Number.isNaN(date) ? 0 : date;
}

export default function DashboardPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  const [studioName, setStudioName] = useState(
    "Studio Name Not Found"
  );

  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [weddings, setWeddings] = useState<Wedding[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          setStudioName("Please Login");
          setClients([]);
          setPayments([]);
          setTasks([]);
          setWeddings([]);
          setLoading(false);
          return;
        }

        try {
          setLoading(true);
          setErrorMessage("");

          const userId = user.uid;

          console.log("=================================");
          console.log("DASHBOARD USER UID:", userId);
          console.log("DASHBOARD USER EMAIL:", user.email);
          console.log("=================================");

          // =========================
          // LOAD STUDIO DATA
          // =========================

          const studioRef = doc(
            db,
            "studios",
            userId
          );

          const studioSnapshot =
            await getDocFromServer(studioRef);

          console.log(
            "Studio document exists:",
            studioSnapshot.exists()
          );

          if (studioSnapshot.exists()) {
            const studioData =
              studioSnapshot.data();

            console.log(
              "Studio document data:",
              studioData
            );

            const name =
              studioData?.studioName;

            console.log(
              "Studio Name from Firebase:",
              name
            );

            if (
              typeof name === "string" &&
              name.trim() !== ""
            ) {
              setStudioName(name.trim());
            } else {
              setStudioName(
                "Studio Name Not Found"
              );
            }
          } else {
            console.log(
              "Studio document NOT FOUND for UID:",
              userId
            );

            setStudioName(
              "Studio Profile Not Found"
            );
          }

          // =========================
          // LOAD CLIENTS
          // =========================

          const clientsQuery = query(
            collection(db, "clients"),
            where(
              "studioId",
              "==",
              userId
            )
          );

          // =========================
          // LOAD PAYMENTS
          // =========================

          const paymentsQuery = query(
            collection(db, "payments"),
            where(
              "studioId",
              "==",
              userId
            )
          );

          // =========================
          // LOAD TASKS
          // =========================

          const tasksQuery = query(
            collection(db, "tasks"),
            where(
              "studioId",
              "==",
              userId
            )
          );

          // =========================
          // LOAD EVENTS
          // =========================

          const weddingsQuery = query(
            collection(db, "weddings"),
            where(
              "studioId",
              "==",
              userId
            )
          );

          const [
            clientsSnapshot,
            paymentsSnapshot,
            tasksSnapshot,
            weddingsSnapshot,
          ] = await Promise.all([
            getDocs(clientsQuery),
            getDocs(paymentsQuery),
            getDocs(tasksQuery),
            getDocs(weddingsQuery),
          ]);

          // =========================
          // CLIENT DATA
          // =========================

          const clientsData: Client[] =
            clientsSnapshot.docs.map(
              (item) => ({
                id: item.id,
                ...item.data(),
              })
            );

          // =========================
          // PAYMENT DATA
          // =========================

          const paymentsData: Payment[] =
            paymentsSnapshot.docs.map(
              (item) => ({
                id: item.id,
                ...item.data(),
              })
            );

          // =========================
          // TASK DATA
          // =========================

          const tasksData: Task[] =
            tasksSnapshot.docs.map(
              (item) => ({
                id: item.id,
                ...item.data(),
              })
            );

          // =========================
          // EVENT DATA
          // =========================

          const weddingsData: Wedding[] =
            weddingsSnapshot.docs.map(
              (item) => ({
                id: item.id,
                ...item.data(),
              })
            );

          console.log(
            "Dashboard Data:",
            {
              clients:
                clientsData.length,
              payments:
                paymentsData.length,
              tasks:
                tasksData.length,
              weddings:
                weddingsData.length,
            }
          );

          setClients(clientsData);
          setPayments(paymentsData);
          setTasks(tasksData);
          setWeddings(weddingsData);
        } catch (error: any) {
          console.error(
            "Dashboard Firebase Error:",
            error
          );

          setErrorMessage(
            error?.message ||
              "Dashboard data load કરવામાં problem આવી."
          );
        } finally {
          setLoading(false);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // =========================
  // STATS
  // =========================

  const totalClients =
    clients.length;

  const totalRevenue =
    clients.reduce(
      (sum, client) =>
        sum +
        Number(
          client.totalAmount || 0
        ),
      0
    );

  const totalPaid =
    payments.reduce(
      (sum, payment) =>
        sum +
        Number(
          payment.amount || 0
        ),
      0
    );

  const pendingPayment =
    Math.max(
      0,
      totalRevenue - totalPaid
    );

  const pendingTasks =
    tasks.filter((task) => {
      if (
        task.completed === true
      ) {
        return false;
      }

      const status =
        String(
          task.status || ""
        ).toLowerCase();

      return (
        status !== "completed" &&
        status !== "complete" &&
        status !== "done"
      );
    }).length;

  const recentPayments =
    [...payments]
      .sort((a, b) => {
        const dateA =
          getDateValue(
            a.paymentDate ||
              a.createdAt
          );

        const dateB =
          getDateValue(
            b.paymentDate ||
              b.createdAt
          );

        return dateB - dateA;
      })
      .slice(0, 5);

  const upcomingEvents =
    [...weddings]
      .filter((wedding) => {
        const date =
          wedding.eventStartDate ||
          wedding.weddingDate;

        return Boolean(date);
      })
      .sort((a, b) => {
        const dateA =
          getDateValue(
            a.eventStartDate ||
              a.weddingDate
          );

        const dateB =
          getDateValue(
            b.eventStartDate ||
              b.weddingDate
          );

        return dateA - dateB;
      })
      .slice(0, 5);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">

      {/* TOP BAR */}

      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">

          <button
            onClick={() =>
              setMenuOpen(
                (value) => !value
              )
            }
            className="flex h-11 w-11 items-center justify-center rounded-xl border bg-white text-xl shadow-sm hover:bg-slate-50"
          >
            ☰
          </button>

          <div className="text-center">

            <h1 className="text-xl font-bold">
              WedFlow
            </h1>

            <p className="text-xs text-slate-500">
              Wedding Studio Management
            </p>

          </div>

          <div className="w-11" />

        </div>

      </header>

      {/* SIDEBAR */}

      {menuOpen && (
        <>
          <div
            onClick={() =>
              setMenuOpen(false)
            }
            className="fixed inset-0 z-40 bg-black/30"
          />

          <aside className="fixed left-0 top-0 z-50 h-full w-72 bg-white p-5 shadow-2xl">

            <div className="flex items-center justify-between border-b pb-5">

              <div>

                <h2 className="text-xl font-bold">
                  WedFlow
                </h2>

                <p className="text-xs text-slate-500">
                  Wedding Studio Management
                </p>

              </div>

              <button
                onClick={() =>
                  setMenuOpen(false)
                }
                className="rounded-lg px-3 py-2 text-xl hover:bg-slate-100"
              >
                ×
              </button>

            </div>

            <nav className="mt-5 space-y-2">

              <Link
                href="/"
                onClick={() =>
                  setMenuOpen(false)
                }
                className="flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white"
              >
                🏠 Dashboard
              </Link>

              <Link
                href="/clients"
                onClick={() =>
                  setMenuOpen(false)
                }
                className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold hover:bg-slate-100"
              >
                👤 Clients
              </Link>

              <Link
                href="/weddings"
                onClick={() =>
                  setMenuOpen(false)
                }
                className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold hover:bg-slate-100"
              >
                📅 Events
              </Link>

              <Link
                href="/payments"
                onClick={() =>
                  setMenuOpen(false)
                }
                className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold hover:bg-slate-100"
              >
                💰 Payments
              </Link>

              <Link
                href="/tasks"
                onClick={() =>
                  setMenuOpen(false)
                }
                className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold hover:bg-slate-100"
              >
                ✓ Tasks
              </Link>

              <button
                onClick={() => {
                  setMenuOpen(false);

                  alert(
                    "Logout functionality can be connected here."
                  );
                }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-semibold text-red-600 hover:bg-red-50"
              >
                🚪 Logout
              </button>

            </nav>

          </aside>
        </>
      )}

      <div className="mx-auto max-w-7xl px-4 py-6">

        {/* WELCOME */}

        <section className="mb-6">

          <h2 className="text-2xl font-bold">
            {studioName}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage your wedding studio from one place.
          </p>

        </section>

        {/* ERROR */}

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">

            <p className="font-bold text-red-700">
              Dashboard Firebase Error
            </p>

            <p className="mt-1 text-sm text-red-600">
              {errorMessage}
            </p>

          </div>
        )}

        {/* STATS */}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* TOTAL CLIENTS */}

          <div className="rounded-2xl border bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  Total Clients
                </p>

                <h3 className="mt-2 text-3xl font-bold">
                  {loading
                    ? "..."
                    : totalClients}
                </h3>

              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-2xl">
                👤
              </div>

            </div>

          </div>

          {/* TOTAL REVENUE */}

          <div className="rounded-2xl border bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  Total Revenue
                </p>

                <h3 className="mt-2 text-3xl font-bold">
                  {loading
                    ? "..."
                    : formatMoney(
                        totalRevenue
                      )}
                </h3>

              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-2xl">
                ₹
              </div>

            </div>

          </div>

          {/* PENDING PAYMENT */}

          <div className="rounded-2xl border bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  Pending Payment
                </p>

                <h3 className="mt-2 text-3xl font-bold text-red-600">
                  {loading
                    ? "..."
                    : formatMoney(
                        pendingPayment
                      )}
                </h3>

              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-2xl">
                💰
              </div>

            </div>

          </div>

          {/* PENDING TASKS */}

          <div className="rounded-2xl border bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  Pending Tasks
                </p>

                <h3 className="mt-2 text-3xl font-bold">
                  {loading
                    ? "..."
                    : pendingTasks}
                </h3>

              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-2xl">
                ✓
              </div>

            </div>

          </div>

        </section>

        {/* QUICK ACTIONS */}

        <section className="mt-6">

          <div className="mb-3">

            <h2 className="text-xl font-bold">
              Quick Actions
            </h2>

            <p className="text-sm text-slate-500">
              Quickly access common actions
            </p>

          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <Link
              href="/clients"
              className="rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="text-3xl">
                👤
              </div>

              <h3 className="mt-3 font-bold">
                Add Client
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Create a new client
              </p>
            </Link>

            <Link
              href="/weddings"
              className="rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="text-3xl">
                📅
              </div>

              <h3 className="mt-3 font-bold">
                Add Event
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Create a new event
              </p>
            </Link>

            <Link
              href="/payments"
              className="rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="text-3xl">
                💰
              </div>

              <h3 className="mt-3 font-bold">
                Add Payment
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Record a payment
              </p>
            </Link>

            <Link
              href="/tasks"
              className="rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="text-3xl">
                ✓
              </div>

              <h3 className="mt-3 font-bold">
                Add Task
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Create a new task
              </p>
            </Link>

          </div>

        </section>

        {/* UPCOMING EVENTS */}

        <section className="mt-6">

          <div className="mb-3 flex items-center justify-between">

            <div>

              <h2 className="text-xl font-bold">
                Upcoming Events
              </h2>

              <p className="text-sm text-slate-500">
                Your upcoming events
              </p>

            </div>

            <Link
              href="/weddings"
              className="text-sm font-semibold text-slate-700 hover:underline"
            >
              View All →
            </Link>

          </div>

          <div className="rounded-2xl border bg-white shadow-sm">

            {upcomingEvents.length === 0 ? (

              <div className="p-8 text-center">

                <div className="text-4xl">
                  📅
                </div>

                <p className="mt-3 font-semibold">
                  No upcoming events
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Add an event to see it here.
                </p>

              </div>

            ) : (

              <div className="divide-y">

                {upcomingEvents.map(
                  (event) => {

                    const eventDate =
                      event.eventStartDate ||
                      event.weddingDate ||
                      "";

                    return (
                      <Link
                        key={event.id}
                        href={`/wedding-details?id=${event.id}`}
                        className="flex items-center justify-between gap-4 p-5 hover:bg-slate-50"
                      >

                        <div className="min-w-0">

                          <p className="truncate font-bold">
                            {event.eventName ||
                              "Unnamed Event"}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {event.clientName ||
                              "No client name"}

                            {event.venue
                              ? ` • ${event.venue}`
                              : ""}
                          </p>

                        </div>

                        <div className="shrink-0 text-right">

                          <p className="text-sm font-semibold">
                            {formatDate(
                              eventDate
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            📅 Event
                          </p>

                        </div>

                      </Link>
                    );
                  }
                )}

              </div>

            )}

          </div>

        </section>

        {/* RECENT PAYMENTS */}

        <section className="mt-6 pb-10">

          <div className="mb-3 flex items-center justify-between">

            <div>

              <h2 className="text-xl font-bold">
                Recent Payments
              </h2>

              <p className="text-sm text-slate-500">
                Latest payment activity
              </p>

            </div>

            <Link
              href="/payments"
              className="text-sm font-semibold text-slate-700 hover:underline"
            >
              View All →
            </Link>

          </div>

          <div className="rounded-2xl border bg-white shadow-sm">

            {recentPayments.length === 0 ? (

              <div className="p-8 text-center">

                <div className="text-4xl">
                  💰
                </div>

                <p className="mt-3 font-semibold">
                  No payments yet
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Add a payment to see it here.
                </p>

              </div>

            ) : (

              <div className="divide-y">

                {recentPayments.map(
                  (payment) => (

                    <div
                      key={payment.id}
                      className="flex items-center justify-between gap-4 p-5"
                    >

                      <div>

                        <p className="font-semibold">
                          {payment.clientName ||
                            "Unknown Client"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(
                            payment.paymentDate
                          )}
                        </p>

                      </div>

                      <p className="font-bold text-green-600">
                        +{" "}
                        {formatMoney(
                          Number(
                            payment.amount || 0
                          )
                        )}
                      </p>

                    </div>

                  )
                )}

              </div>

            )}

          </div>

        </section>

      </div>

    </main>
  );
}