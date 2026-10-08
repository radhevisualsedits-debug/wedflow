"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";

type EventItem = {
  id: string;
  eventName?: string;
  weddingName?: string;
  clientName?: string;
  weddingDate?: string;
  totalAmount?: number;
  advancePaid?: number;
  status?: string;
};

type Payment = {
  id: string;
  amount?: number;
  paymentAmount?: number;
  paymentDate?: string;
  date?: string;
};

type Expense = {
  id: string;
  title?: string;
  category?: string;
  amount?: number;
  date?: string;
  note?: string;
};

const money = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const getMonthKey = (dateString?: string) => {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
};

const getMonthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split("-");

  const date = new Date(
    Number(year),
    Number(month) - 1,
    1
  );

  return date.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
};

export default function ReportsPage() {
  const reportRef = useRef<HTMLDivElement>(null);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    try {
      setLoading(true);

      const [eventsSnap, paymentsSnap, expensesSnap] =
        await Promise.all([
          getDocs(collection(db, "weddings")),
          getDocs(collection(db, "payments")),
          getDocs(collection(db, "expenses")),
        ]);

      setEvents(
        eventsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as EventItem[]
      );

      setPayments(
        paymentsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Payment[]
      );

      setExpenses(
        expensesSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Expense[]
      );
    } catch (error) {
      console.error("Reports loading error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const totalRevenue = useMemo(() => {
    return events.reduce(
      (total, event) =>
        total + Number(event.totalAmount || 0),
      0
    );
  }, [events]);

  const totalAdvance = useMemo(() => {
    return events.reduce(
      (total, event) =>
        total + Number(event.advancePaid || 0),
      0
    );
  }, [events]);

  const totalPaymentRecords = useMemo(() => {
    return payments.reduce(
      (total, payment) =>
        total +
        Number(
          payment.amount ??
            payment.paymentAmount ??
            0
        ),
      0
    );
  }, [payments]);

  const totalPaid = Math.max(
    totalAdvance,
    totalPaymentRecords
  );

  const pendingAmount = Math.max(
    0,
    totalRevenue - totalPaid
  );

  const totalExpenses = useMemo(() => {
    return expenses.reduce(
      (total, expense) =>
        total + Number(expense.amount || 0),
      0
    );
  }, [expenses]);

  const netProfit = totalRevenue - totalExpenses;

  const statusCounts = {
    Pending: events.filter(
      (event) => event.status === "Pending"
    ).length,

    Confirmed: events.filter(
      (event) => event.status === "Confirmed"
    ).length,

    "In Progress": events.filter(
      (event) => event.status === "In Progress"
    ).length,

    Completed: events.filter(
      (event) => event.status === "Completed"
    ).length,
  };

  const expenseByCategory = useMemo(() => {
    const result: Record<string, number> = {};

    expenses.forEach((expense) => {
      const category = expense.category || "Other";

      result[category] =
        (result[category] || 0) +
        Number(expense.amount || 0);
    });

    return Object.entries(result).sort(
      (a, b) => b[1] - a[1]
    );
  }, [expenses]);

  const monthlyReport = useMemo(() => {
    const months: Record<
      string,
      {
        income: number;
        expense: number;
      }
    > = {};

    payments.forEach((payment) => {
      const date =
        payment.paymentDate ||
        payment.date;

      const month = getMonthKey(date);

      if (!month) return;

      if (!months[month]) {
        months[month] = {
          income: 0,
          expense: 0,
        };
      }

      months[month].income += Number(
        payment.amount ??
          payment.paymentAmount ??
          0
      );
    });

    expenses.forEach((expense) => {
      const month = getMonthKey(
        expense.date
      );

      if (!month) return;

      if (!months[month]) {
        months[month] = {
          income: 0,
          expense: 0,
        };
      }

      months[month].expense += Number(
        expense.amount || 0
      );
    });

    return Object.entries(months)
      .sort(([a], [b]) =>
        a.localeCompare(b)
      )
      .map(([month, values]) => ({
        month,
        label: getMonthLabel(month),
        income: values.income,
        expense: values.expense,
        profit:
          values.income - values.expense,
      }));
  }, [payments, expenses]);

  const maxMonthlyValue = useMemo(() => {
    let max = 0;

    monthlyReport.forEach((item) => {
      max = Math.max(
        max,
        item.income,
        item.expense,
        Math.abs(item.profit)
      );
    });

    return max || 1;
  }, [monthlyReport]);

  const recentExpenses = [...expenses]
    .sort((a, b) => {
      const dateA = a.date
        ? new Date(a.date).getTime()
        : 0;

      const dateB = b.date
        ? new Date(b.date).getTime()
        : 0;

      return dateB - dateA;
    })
    .slice(0, 10);

  const formatDate = (date?: string) => {
    if (!date) return "—";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return parsed.toLocaleDateString(
      "en-IN"
    );
  };

  const printReport = () => {
    window.print();
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .print-area {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 10px !important;
          }

          .print-card {
            box-shadow: none !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          @page {
            size: A4;
            margin: 12mm;
          }
        }
      `}</style>

      <main
        style={{
          minHeight: "100vh",
          background: "#f5f6fa",
          fontFamily: "Arial, sans-serif",
          color: "#111827",
        }}
      >
        {/* HEADER */}

        <header
          className="no-print"
          style={{
            background: "#111827",
            color: "white",
            padding: "18px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 15,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 25,
                fontWeight: 800,
              }}
            >
              WedFlow
            </div>

            <div
              style={{
                fontSize: 13,
                opacity: 0.75,
                marginTop: 3,
              }}
            >
              Reports & Financial Summary
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <a
              href="/"
              style={{
                textDecoration: "none",
                color: "white",
                background: "#374151",
                padding: "10px 15px",
                borderRadius: 9,
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              ← Dashboard
            </a>

            <button
              onClick={loadReports}
              style={{
                border: "none",
                color: "white",
                background: "#2563eb",
                padding: "10px 15px",
                borderRadius: 9,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ↻ Refresh
            </button>

            <button
              onClick={printReport}
              style={{
                border: "none",
                color: "white",
                background: "#16a34a",
                padding: "10px 15px",
                borderRadius: 9,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              🖨️ Print / Save PDF
            </button>
          </div>
        </header>

        {/* PRINT TITLE */}

        <div
          className="print-only"
          style={{
            display: "none",
          }}
        >
          <h1>WedFlow</h1>
          <p>Reports & Financial Summary</p>
        </div>

        <div
          ref={reportRef}
          className="print-area"
          style={{
            maxWidth: 1450,
            margin: "0 auto",
            padding: 24,
          }}
        >
          {loading ? (
            <div
              className="print-card"
              style={{
                background: "white",
                borderRadius: 14,
                padding: 40,
                textAlign: "center",
                boxShadow:
                  "0 4px 18px rgba(0,0,0,0.06)",
              }}
            >
              <h2>Loading Reports...</h2>

              <p
                style={{
                  color: "#6b7280",
                }}
              >
                Please wait.
              </p>
            </div>
          ) : (
            <>
              {/* REPORT TITLE */}

              <section
                className="print-card"
                style={{
                  background: "white",
                  borderRadius: 16,
                  padding: 22,
                  marginBottom: 20,
                  boxShadow:
                    "0 4px 18px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    gap: 15,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h1
                      style={{
                        margin: 0,
                        fontSize: 28,
                      }}
                    >
                      WedFlow
                    </h1>

                    <p
                      style={{
                        margin:
                          "5px 0 0",
                        color: "#6b7280",
                      }}
                    >
                      Reports & Financial Summary
                    </p>
                  </div>

                  <div
                    style={{
                      color: "#6b7280",
                      fontSize: 13,
                    }}
                  >
                    Generated:{" "}
                    {new Date().toLocaleDateString(
                      "en-IN"
                    )}
                  </div>
                </div>
              </section>

              {/* FINANCIAL CARDS */}

              <section
                className="print-card"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(210px, 1fr))",
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                <ReportCard
                  title="Total Revenue"
                  value={money(totalRevenue)}
                  icon="💰"
                  background="#ecfdf5"
                />

                <ReportCard
                  title="Total Paid"
                  value={money(totalPaid)}
                  icon="💳"
                  background="#eff6ff"
                />

                <ReportCard
                  title="Pending Amount"
                  value={money(pendingAmount)}
                  icon="⏳"
                  background="#fff7ed"
                />

                <ReportCard
                  title="Total Expenses"
                  value={money(totalExpenses)}
                  icon="💸"
                  background="#fef2f2"
                />

                <ReportCard
                  title="Net Profit"
                  value={money(netProfit)}
                  icon="📈"
                  background="#f5f3ff"
                />
              </section>

              {/* MONTHLY REPORT */}

              <section
                className="print-card"
                style={{
                  background: "white",
                  borderRadius: 16,
                  padding: 22,
                  boxShadow:
                    "0 4px 18px rgba(0,0,0,0.06)",
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 21,
                      }}
                    >
                      📊 Month-wise Financial Report
                    </h2>

                    <p
                      style={{
                        margin:
                          "6px 0 0",
                        color: "#6b7280",
                        fontSize: 13,
                      }}
                    >
                      Monthly Income, Expense & Profit
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 15,
                      flexWrap: "wrap",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    <span>🟦 Income</span>
                    <span>🟥 Expense</span>
                    <span>🟩 Profit</span>
                  </div>
                </div>

                {monthlyReport.length ===
                0 ? (
                  <div
                    style={{
                      padding: 35,
                      textAlign: "center",
                      background: "#f9fafb",
                      borderRadius: 12,
                      color: "#6b7280",
                    }}
                  >
                    No monthly payment or
                    expense data available yet.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection:
                        "column",
                      gap: 22,
                    }}
                  >
                    {monthlyReport.map(
                      (item) => {
                        const incomeWidth =
                          Math.max(
                            4,
                            (item.income /
                              maxMonthlyValue) *
                              100
                          );

                        const expenseWidth =
                          Math.max(
                            4,
                            (item.expense /
                              maxMonthlyValue) *
                              100
                          );

                        const profitWidth =
                          Math.max(
                            4,
                            (Math.abs(
                              item.profit
                            ) /
                              maxMonthlyValue) *
                              100
                          );

                        return (
                          <div
                            key={item.month}
                            style={{
                              borderBottom:
                                "1px solid #f0f0f0",
                              paddingBottom: 18,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent:
                                  "space-between",
                                alignItems:
                                  "center",
                                marginBottom: 10,
                                gap: 10,
                              }}
                            >
                              <strong>
                                {item.label}
                              </strong>

                              <strong
                                style={{
                                  color:
                                    item.profit >=
                                    0
                                      ? "#15803d"
                                      : "#dc2626",
                                }}
                              >
                                Profit:{" "}
                                {money(
                                  item.profit
                                )}
                              </strong>
                            </div>

                            <MonthlyBar
                              label="Income"
                              value={
                                item.income
                              }
                              width={
                                incomeWidth
                              }
                              color="#2563eb"
                            />

                            <MonthlyBar
                              label="Expense"
                              value={
                                item.expense
                              }
                              width={
                                expenseWidth
                              }
                              color="#dc2626"
                            />

                            <MonthlyBar
                              label="Profit"
                              value={
                                item.profit
                              }
                              width={
                                profitWidth
                              }
                              color={
                                item.profit >=
                                0
                                  ? "#16a34a"
                                  : "#dc2626"
                              }
                            />
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </section>

              {/* EVENT SUMMARY */}

              <section
                className="print-card"
                style={{
                  background: "white",
                  borderRadius: 16,
                  padding: 22,
                  boxShadow:
                    "0 4px 18px rgba(0,0,0,0.06)",
                  marginBottom: 24,
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                    marginBottom: 18,
                    fontSize: 21,
                  }}
                >
                  💍 Event Summary
                </h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: 14,
                  }}
                >
                  <SummaryBox
                    title="Total Events"
                    value={events.length}
                    icon="💍"
                  />

                  <SummaryBox
                    title="Pending"
                    value={
                      statusCounts.Pending
                    }
                    icon="⏳"
                  />

                  <SummaryBox
                    title="Confirmed"
                    value={
                      statusCounts.Confirmed
                    }
                    icon="✅"
                  />

                  <SummaryBox
                    title="In Progress"
                    value={
                      statusCounts["In Progress"]
                    }
                    icon="🔄"
                  />

                  <SummaryBox
                    title="Completed"
                    value={
                      statusCounts.Completed
                    }
                    icon="🏆"
                  />
                </div>
              </section>

              {/* EXPENSE CATEGORY */}

              <section
                className="print-card"
                style={{
                  background: "white",
                  borderRadius: 16,
                  padding: 22,
                  boxShadow:
                    "0 4px 18px rgba(0,0,0,0.06)",
                  marginBottom: 24,
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                    marginBottom: 20,
                    fontSize: 21,
                  }}
                >
                  💸 Expense by Category
                </h2>

                {expenseByCategory.length ===
                0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: 30,
                      color: "#6b7280",
                      background: "#f9fafb",
                      borderRadius: 12,
                    }}
                  >
                    No expenses added yet.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection:
                        "column",
                      gap: 16,
                    }}
                  >
                    {expenseByCategory.map(
                      ([category, amount]) => {
                        const percentage =
                          totalExpenses > 0
                            ? (amount /
                                totalExpenses) *
                              100
                            : 0;

                        return (
                          <div
                            key={category}
                          >
                            <div
                              style={{
                                display:
                                  "flex",
                                justifyContent:
                                  "space-between",
                                marginBottom: 7,
                              }}
                            >
                              <strong>
                                {category}
                              </strong>

                              <span
                                style={{
                                  color:
                                    "#6b7280",
                                  fontSize: 13,
                                }}
                              >
                                {money(amount)}
                              </span>
                            </div>

                            <div
                              style={{
                                height: 10,
                                background:
                                  "#e5e7eb",
                                borderRadius: 99,
                                overflow:
                                  "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height:
                                    "100%",
                                  width: `${percentage}%`,
                                  background:
                                    "#ef4444",
                                  borderRadius:
                                    99,
                                }}
                              />
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </section>

              {/* EVENT FINANCIAL REPORT */}

              <section
                className="print-card"
                style={{
                  background: "white",
                  borderRadius: 16,
                  padding: 22,
                  boxShadow:
                    "0 4px 18px rgba(0,0,0,0.06)",
                  marginBottom: 24,
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                    marginBottom: 18,
                    fontSize: 21,
                  }}
                >
                  📋 Event Financial Report
                </h2>

                <div
                  style={{
                    overflowX: "auto",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse:
                        "collapse",
                      minWidth: 850,
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={
                            tableHeaderStyle
                          }
                        >
                          Event
                        </th>

                        <th
                          style={
                            tableHeaderStyle
                          }
                        >
                          Client
                        </th>

                        <th
                          style={
                            tableHeaderStyle
                          }
                        >
                          Date
                        </th>

                        <th
                          style={
                            tableHeaderStyle
                          }
                        >
                          Status
                        </th>

                        <th
                          style={{
                            ...tableHeaderStyle,
                            textAlign:
                              "right",
                          }}
                        >
                          Total
                        </th>

                        <th
                          style={{
                            ...tableHeaderStyle,
                            textAlign:
                              "right",
                          }}
                        >
                          Paid
                        </th>

                        <th
                          style={{
                            ...tableHeaderStyle,
                            textAlign:
                              "right",
                          }}
                        >
                          Pending
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {events.length ===
                      0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            style={{
                              padding: 30,
                              textAlign:
                                "center",
                              color:
                                "#6b7280",
                            }}
                          >
                            No events found.
                          </td>
                        </tr>
                      ) : (
                        events.map((event) => {
                          const total =
                            Number(
                              event.totalAmount ||
                                0
                            );

                          const paid =
                            Number(
                              event.advancePaid ||
                                0
                            );

                          const pending =
                            Math.max(
                              0,
                              total - paid
                            );

                          return (
                            <tr
                              key={event.id}
                            >
                              <td
                                style={
                                  tableCellStyle
                                }
                              >
                                <strong>
                                  {event.eventName ||
                                    event.weddingName ||
                                    "—"}
                                </strong>
                              </td>

                              <td
                                style={
                                  tableCellStyle
                                }
                              >
                                {event.clientName ||
                                  "—"}
                              </td>

                              <td
                                style={
                                  tableCellStyle
                                }
                              >
                                {formatDate(
                                  event.weddingDate
                                )}
                              </td>

                              <td
                                style={
                                  tableCellStyle
                                }
                              >
                                <span
                                  style={{
                                    display:
                                      "inline-block",
                                    padding:
                                      "5px 9px",
                                    borderRadius:
                                      20,
                                    background:
                                      "#f3f4f6",
                                    fontSize: 12,
                                    fontWeight:
                                      700,
                                  }}
                                >
                                  {event.status ||
                                    "—"}
                                </span>
                              </td>

                              <td
                                style={{
                                  ...tableCellStyle,
                                  textAlign:
                                    "right",
                                }}
                              >
                                {money(total)}
                              </td>

                              <td
                                style={{
                                  ...tableCellStyle,
                                  textAlign:
                                    "right",
                                  color:
                                    "#15803d",
                                  fontWeight:
                                    700,
                                }}
                              >
                                {money(paid)}
                              </td>

                              <td
                                style={{
                                  ...tableCellStyle,
                                  textAlign:
                                    "right",
                                  color:
                                    "#dc2626",
                                  fontWeight:
                                    700,
                                }}
                              >
                                {money(
                                  pending
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* RECENT EXPENSES */}

              <section
                className="print-card"
                style={{
                  background: "white",
                  borderRadius: 16,
                  padding: 22,
                  boxShadow:
                    "0 4px 18px rgba(0,0,0,0.06)",
                  marginBottom: 24,
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                    marginBottom: 18,
                    fontSize: 21,
                  }}
                >
                  🧾 Recent Expenses
                </h2>

                <div
                  style={{
                    overflowX: "auto",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse:
                        "collapse",
                      minWidth: 750,
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={
                            tableHeaderStyle
                          }
                        >
                          Date
                        </th>

                        <th
                          style={
                            tableHeaderStyle
                          }
                        >
                          Title
                        </th>

                        <th
                          style={
                            tableHeaderStyle
                          }
                        >
                          Category
                        </th>

                        <th
                          style={
                            tableHeaderStyle
                          }
                        >
                          Note
                        </th>

                        <th
                          style={{
                            ...tableHeaderStyle,
                            textAlign:
                              "right",
                          }}
                        >
                          Amount
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentExpenses.length ===
                      0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            style={{
                              padding: 30,
                              textAlign:
                                "center",
                              color:
                                "#6b7280",
                            }}
                          >
                            No expenses found.
                          </td>
                        </tr>
                      ) : (
                        recentExpenses.map(
                          (expense) => (
                            <tr
                              key={
                                expense.id
                              }
                            >
                              <td
                                style={
                                  tableCellStyle
                                }
                              >
                                {formatDate(
                                  expense.date
                                )}
                              </td>

                              <td
                                style={
                                  tableCellStyle
                                }
                              >
                                <strong>
                                  {expense.title ||
                                    "—"}
                                </strong>
                              </td>

                              <td
                                style={
                                  tableCellStyle
                                }
                              >
                                {expense.category ||
                                  "Other"}
                              </td>

                              <td
                                style={{
                                  ...tableCellStyle,
                                  color:
                                    "#6b7280",
                                }}
                              >
                                {expense.note ||
                                  "—"}
                              </td>

                              <td
                                style={{
                                  ...tableCellStyle,
                                  textAlign:
                                    "right",
                                  fontWeight:
                                    700,
                                  color:
                                    "#dc2626",
                                }}
                              >
                                {money(
                                  Number(
                                    expense.amount ||
                                      0
                                  )
                                )}
                              </td>
                            </tr>
                          )
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* FINAL SUMMARY */}

              <section
                className="print-card"
                style={{
                  background:
                    "linear-gradient(135deg, #111827, #1f2937)",
                  color: "white",
                  borderRadius: 18,
                  padding: 25,
                  marginBottom: 25,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    gap: 20,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        opacity: 0.7,
                        marginBottom: 7,
                      }}
                    >
                      Overall Net Profit
                    </div>

                    <div
                      style={{
                        fontSize: 34,
                        fontWeight: 800,
                      }}
                    >
                      {money(netProfit)}
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        opacity: 0.7,
                        marginTop: 7,
                      }}
                    >
                      Revenue minus total expenses
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(3, minmax(100px, 1fr))",
                      gap: 20,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.65,
                        }}
                      >
                        Revenue
                      </div>

                      <strong
                        style={{
                          fontSize: 17,
                        }}
                      >
                        {money(
                          totalRevenue
                        )}
                      </strong>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.65,
                        }}
                      >
                        Paid
                      </div>

                      <strong
                        style={{
                          fontSize: 17,
                        }}
                      >
                        {money(totalPaid)}
                      </strong>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.65,
                        }}
                      >
                        Expenses
                      </div>

                      <strong
                        style={{
                          fontSize: 17,
                        }}
                      >
                        {money(
                          totalExpenses
                        )}
                      </strong>
                    </div>
                  </div>
                </div>
              </section>

              <div
                style={{
                  textAlign: "center",
                  color: "#9ca3af",
                  fontSize: 12,
                  paddingBottom: 20,
                }}
              >
                WedFlow • Wedding Studio Management
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}

function ReportCard({
  title,
  value,
  icon,
  background,
}: {
  title: string;
  value: string;
  icon: string;
  background: string;
}) {
  return (
    <div
      className="print-card"
      style={{
        background: "white",
        borderRadius: 15,
        padding: 20,
        boxShadow:
          "0 4px 18px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          marginBottom: 13,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          fontSize: 13,
          color: "#6b7280",
          marginBottom: 6,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SummaryBox({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: string;
}) {
  return (
    <div
      className="print-card"
      style={{
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: 13,
        padding: 18,
      }}
    >
      <div
        style={{
          fontSize: 22,
          marginBottom: 8,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          fontSize: 12,
          color: "#6b7280",
          marginBottom: 4,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MonthlyBar({
  label,
  value,
  width,
  color,
}: {
  label: string;
  value: number;
  width: number;
  color: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "90px 1fr 110px",
        gap: 10,
        alignItems: "center",
        marginBottom: 7,
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color,
        }}
      >
        {label}
      </span>

      <div
        style={{
          height: 10,
          background: "#e5e7eb",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${width}%`,
            background: color,
            borderRadius: 99,
          }}
        />
      </div>

      <strong
        style={{
          fontSize: 12,
          textAlign: "right",
          color:
            label === "Profit" && value < 0
              ? "#dc2626"
              : "#111827",
        }}
      >
        {money(value)}
      </strong>
    </div>
  );
}

const tableHeaderStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "13px 12px",
  background: "#f9fafb",
  borderBottom: "1px solid #e5e7eb",
  fontSize: 12,
  color: "#6b7280",
  textTransform: "uppercase",
};

const tableCellStyle: React.CSSProperties = {
  padding: "14px 12px",
  borderBottom: "1px solid #f1f5f9",
  fontSize: 13,
};