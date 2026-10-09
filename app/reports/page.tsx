
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../lib/firebase";

type EventItem = {
  id: string;
  eventName?: string;
  weddingName?: string;
  clientName?: string;
  weddingDate?: string;
  totalAmount?: number | string;
  advancePaid?: number | string;
  status?: string;
};

type Payment = {
  id: string;
  amount?: number | string;
  paymentAmount?: number | string;
  paymentDate?: string;
  date?: string;
};

type Expense = {
  id: string;
  title?: string;
  category?: string;
  amount?: number | string;
  date?: string;
  note?: string;
};

const money = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const toAmount = (value: number | string | undefined) =>
  Number(value || 0);

const parseDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getMonthKey = (value?: string) => {
  const date = parseDate(value);
  if (!date) return "";

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
};

const getMonthLabel = (key: string) => {
  const [year, month] = key.split("-");
  return new Date(
    Number(year),
    Number(month) - 1,
    1
  ).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
};

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  padding: 20,
  borderRadius: 14,
  boxShadow: "0 3px 15px #0000000a",
  minWidth: 0,
};

const cellStyle: React.CSSProperties = {
  padding: "12px 10px",
  borderBottom: "1px solid #e5e7eb",
  textAlign: "left",
  fontSize: 13,
};

export default function ReportsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;

    async function loadReports() {
      setLoading(true);
      setError("");

      if (!userId) {
        setEvents([]);
        setPayments([]);
        setExpenses([]);
        setError("રિપોર્ટ જોવા માટે પહેલાં લૉગિન કરો.");
        setLoading(false);
        return;
      }

      try {
        const eventQuery = query(
          collection(db, "weddings"),
          where("studioId", "==", userId)
        );

        const paymentQuery = query(
          collection(db, "payments"),
          where("studioId", "==", userId)
        );

        const expenseQuery = query(
          collection(db, "expenses"),
          where("studioId", "==", userId)
        );

        const [eventSnap, paymentSnap, expenseSnap] =
          await Promise.all([
            getDocs(eventQuery),
            getDocs(paymentQuery),
            getDocs(expenseQuery),
          ]);

        if (cancelled) return;

        setEvents(
          eventSnap.docs.map((item) => ({
            ...item.data(),
            id: item.id,
          })) as EventItem[]
        );

        setPayments(
          paymentSnap.docs.map((item) => ({
            ...item.data(),
            id: item.id,
          })) as Payment[]
        );

        setExpenses(
          expenseSnap.docs.map((item) => ({
            ...item.data(),
            id: item.id,
          })) as Expense[]
        );
      } catch (err) {
        console.error("Reports loading error:", err);

        if (!cancelled) {
          setError(
            "રિપોર્ટ લોડ થયો નથી. Firestore Rules અને Console Error તપાસો."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadReports();

    return () => {
      cancelled = true;
    };
  }, [authReady, userId]);

  const totalRevenue = useMemo(
    () =>
      events.reduce(
        (sum, event) => sum + toAmount(event.totalAmount),
        0
      ),
    [events]
  );

  const totalAdvance = useMemo(
    () =>
      events.reduce(
        (sum, event) => sum + toAmount(event.advancePaid),
        0
      ),
    [events]
  );

  const totalPaymentRecords = useMemo(
    () =>
      payments.reduce(
        (sum, payment) =>
          sum +
          toAmount(payment.amount ?? payment.paymentAmount),
        0
      ),
    [payments]
  );

  const totalPaid = Math.max(
    totalAdvance,
    totalPaymentRecords
  );

  const pendingAmount = Math.max(
    0,
    totalRevenue - totalPaid
  );

  const totalExpenses = useMemo(
    () =>
      expenses.reduce(
        (sum, expense) => sum + toAmount(expense.amount),
        0
      ),
    [expenses]
  );

  const netProfit = totalRevenue - totalExpenses;

  const statusCounts = {
    Pending: events.filter(
      (event) => event.status?.toLowerCase() === "pending"
    ).length,
    Confirmed: events.filter(
      (event) => event.status?.toLowerCase() === "confirmed"
    ).length,
    "In Progress": events.filter(
      (event) => event.status?.toLowerCase() === "in progress"
    ).length,
    Completed: events.filter(
      (event) => event.status?.toLowerCase() === "completed"
    ).length,
  };

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};

    expenses.forEach((expense) => {
      const category = expense.category || "Other";
      totals[category] =
        (totals[category] || 0) + toAmount(expense.amount);
    });

    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const monthlyReport = useMemo(() => {
    const totals: Record<
      string,
      { income: number; expense: number }
    > = {};

    payments.forEach((payment) => {
      const key = getMonthKey(
        payment.paymentDate || payment.date
      );
      if (!key) return;

      if (!totals[key]) {
        totals[key] = { income: 0, expense: 0 };
      }

      totals[key].income += toAmount(
        payment.amount ?? payment.paymentAmount
      );
    });

    expenses.forEach((expense) => {
      const key = getMonthKey(expense.date);
      if (!key) return;

      if (!totals[key]) {
        totals[key] = { income: 0, expense: 0 };
      }

      totals[key].expense += toAmount(expense.amount);
    });

    return Object.entries(totals)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({
        key,
        label: getMonthLabel(key),
        income: value.income,
        expense: value.expense,
        profit: value.income - value.expense,
      }));
  }, [payments, expenses]);

  const recentExpenses = useMemo(
    () =>
      [...expenses]
        .sort((a, b) => {
          const dateA = parseDate(a.date)?.getTime() || 0;
          const dateB = parseDate(b.date)?.getTime() || 0;
          return dateB - dateA;
        })
        .slice(0, 10),
    [expenses]
  );

  const formatDate = (value?: string) => {
    const date = parseDate(value);
    return date
      ? date.toLocaleDateString("en-IN")
      : value || "—";
  };

  if (!authReady || loading) {
    return (
      <main style={{ padding: 40, fontFamily: "Arial" }}>
        <h2>WedFlow Reports</h2>
        <p>ડેટા લોડ થઈ રહ્યો છે...</p>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        color: "#111827",
        padding: 20,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
          main {
            padding: 0 !important;
          }
          section {
            break-inside: avoid;
          }
          @page {
            size: A4;
            margin: 12mm;
          }
        }
      `}</style>

      <header
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          background: "#111827",
          color: "white",
          padding: 20,
          borderRadius: 14,
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>WedFlow</h1>
          <p style={{ margin: "5px 0 0" }}>
            Reports & Financial Summary
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a
            href="/"
            style={{
              color: "white",
              background: "#374151",
              padding: "10px 14px",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            ← Dashboard
          </a>

          <button
            onClick={() => window.location.reload()}
            style={{
              border: 0,
              padding: "10px 14px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            ↻ Refresh
          </button>

          <button
            onClick={() => window.print()}
            style={{
              border: 0,
              padding: "10px 14px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Print / Save PDF
          </button>
        </div>
      </header>

      {error && (
        <section
          style={{
            ...cardStyle,
            marginBottom: 20,
            border: "1px solid #fca5a5",
            color: "#b91c1c",
          }}
        >
          <strong>ડેટા લોડ કરવામાં સમસ્યા</strong>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            ફરી પ્રયાસ કરો
          </button>
        </section>
      )}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 16,
          marginBottom: 22,
        }}
      >
        {[
          ["Total Revenue", totalRevenue, "💰"],
          ["Total Paid", totalPaid, "💳"],
          ["Pending Amount", pendingAmount, "⏳"],
          ["Total Expenses", totalExpenses, "💸"],
          ["Net Profit", netProfit, "📈"],
        ].map(([title, value, icon]) => (
          <div key={String(title)} style={cardStyle}>
            <div style={{ fontSize: 25 }}>{icon}</div>
            <p style={{ color: "#6b7280", marginBottom: 6 }}>
              {title}
            </p>
            <strong style={{ fontSize: 24 }}>
              {money(Number(value))}
            </strong>
          </div>
        ))}
      </section>

      <section style={{ ...cardStyle, marginBottom: 22 }}>
        <h2>💍 Event Summary</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 12,
          }}
        >
          {[
            ["Total Events", events.length],
            ["Pending", statusCounts.Pending],
            ["Confirmed", statusCounts.Confirmed],
            ["In Progress", statusCounts["In Progress"]],
            ["Completed", statusCounts.Completed],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              style={{
                background: "#f9fafb",
                padding: 16,
                borderRadius: 10,
              }}
            >
              <div style={{ color: "#6b7280", fontSize: 13 }}>
                {label}
              </div>
              <strong style={{ fontSize: 24 }}>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...cardStyle, marginBottom: 22 }}>
        <h2>📊 Month-wise Financial Report</h2>

        {monthlyReport.length === 0 ? (
          <p style={{ color: "#6b7280" }}>
            Monthly payment or expense data મળ્યો નથી.
          </p>
        ) : (
          monthlyReport.map((item) => (
            <div
              key={item.key}
              style={{
                padding: "14px 0",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <strong>{item.label}</strong>

              {[
                ["Income", item.income, "#2563eb"],
                ["Expense", item.expense, "#dc2626"],
                ["Profit", item.profit, "#16a34a"],
              ].map(([label, value, color]) => (
                <div
                  key={String(label)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "85px 1fr 115px",
                    gap: 10,
                    alignItems: "center",
                    marginTop: 10,
                  }}
                >
                  <span style={{ color: String(color), fontSize: 13 }}>
                    {label}
                  </span>
                  <div
                    style={{
                      height: 9,
                      background: "#e5e7eb",
                      borderRadius: 20,
                      overflow: "hidden",
                    }}
                  >
                                        <div
                      style={{
                        height: "100%",
                        width: `${
                          Math.min(
                            100,
                            (Math.abs(Number(value)) /
                              Math.max(
                                1,
                                ...monthlyReport.flatMap((row) => [
                                  row.income,
                                  row.expense,
                                  Math.abs(row.profit),
                                ])
                              )) *
                              100
                          )
                        }%`,
                        background: String(color),
                      }}
                    />
                  </div>
                  <strong style={{ textAlign: "right", fontSize: 12 }}>
                    {money(Number(value))}
                  </strong>
                </div>
              ))}
            </div>
          ))
        )}
      </section>

      <section style={{ ...cardStyle, marginBottom: 22 }}>
        <h2>💸 Expense by Category</h2>

        {categoryTotals.length === 0 ? (
          <p>આ સ્ટુડિયોમાં કોઈ Expense મળ્યો નથી.</p>
        ) : (
          categoryTotals.map(([category, value]) => (
            <div
              key={category}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                padding: "12px 0",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <span>{category}</span>
              <strong>{money(value)}</strong>
            </div>
          ))
        )}
      </section>

      <section style={{ ...cardStyle, marginBottom: 22 }}>
        <h2>📋 Event Financial Report</h2>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 700,
            }}
          >
            <thead>
              <tr>
                {[
                  "Event",
                  "Client",
                  "Date",
                  "Status",
                  "Total",
                  "Advance",
                  "Pending",
                ].map((heading) => (
                  <th key={heading} style={cellStyle}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={7} style={cellStyle}>
                    આ સ્ટુડિયોમાં કોઈ Event મળ્યો નથી.
                  </td>
                </tr>
              ) : (
                events.map((event) => {
                  const total = toAmount(event.totalAmount);
                  const paid = toAmount(event.advancePaid);
                  const pending = Math.max(0, total - paid);

                  return (
                    <tr key={event.id}>
                      <td style={cellStyle}>
                        {event.eventName || event.weddingName || "—"}
                      </td>
                      <td style={cellStyle}>{event.clientName || "—"}</td>
                      <td style={cellStyle}>{formatDate(event.weddingDate)}</td>
                      <td style={cellStyle}>{event.status || "—"}</td>
                      <td style={cellStyle}>{money(total)}</td>
                      <td style={cellStyle}>{money(paid)}</td>
                      <td style={cellStyle}>{money(pending)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ ...cardStyle, marginBottom: 22 }}>
        <h2>🧾 Recent Expenses</h2>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 600,
            }}
          >
            <thead>
              <tr>
                {["Date", "Title", "Category", "Note", "Amount"].map(
                  (heading) => (
                    <th key={heading} style={cellStyle}>
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {recentExpenses.length === 0 ? (
                <tr>
                  <td colSpan={5} style={cellStyle}>
                    આ સ્ટુડિયોમાં કોઈ Expense મળ્યો નથી.
                  </td>
                </tr>
              ) : (
                recentExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td style={cellStyle}>{formatDate(expense.date)}</td>
                    <td style={cellStyle}>{expense.title || "—"}</td>
                    <td style={cellStyle}>{expense.category || "Other"}</td>
                    <td style={cellStyle}>{expense.note || "—"}</td>
                    <td style={cellStyle}>
                      {money(toAmount(expense.amount))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section
        style={{
          ...cardStyle,
          background: "#111827",
          color: "white",
        }}
      >
        <p style={{ opacity: 0.75 }}>Overall Net Profit</p>
        <h1 style={{ fontSize: 34 }}>{money(netProfit)}</h1>
        <p style={{ opacity: 0.8 }}>
          Revenue minus total expenses
        </p>
        <p>Revenue: {money(totalRevenue)}</p>
        <p>Paid: {money(totalPaid)}</p>
        <p>Pending: {money(pendingAmount)}</p>
        <p>Expenses: {money(totalExpenses)}</p>
      </section>

      <footer
        style={{
          textAlign: "center",
          color: "#6b7280",
          padding: 22,
          fontSize: 12,
        }}
      >
        WedFlow • Wedding Studio Management
      </footer>
    </main>
  );
}