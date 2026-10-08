"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

type Wedding = {
  id: string;
  clientId?: string;
  clientName?: string;
  eventName?: string;
  eventType?: string;
  weddingDate?: string;
  status?: string;
  totalAmount?: number | string;
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWeddings();
  }, []);

  async function loadWeddings() {
    try {
      setLoading(true);

      const weddingsRef = collection(db, "weddings");

      let snapshot;

      try {
        const q = query(weddingsRef, orderBy("weddingDate", "asc"));
        snapshot = await getDocs(q);
      } catch {
        snapshot = await getDocs(weddingsRef);
      }

      const data: Wedding[] = snapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as Omit<Wedding, "id">),
      }));

      setWeddings(data);
    } catch (error) {
      console.error("Calendar loading error:", error);
      setWeddings([]);
    } finally {
      setLoading(false);
    }
  }

  function previousMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  }

  function goToToday() {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  }

  function getDateNumber(dateValue?: string) {
    if (!dateValue) return null;

    const date = new Date(dateValue);

    if (isNaN(date.getTime())) return null;

    return date.getDate();
  }

  function getEventsForDate(day: number) {
    return weddings.filter((wedding) => {
      if (!wedding.weddingDate) return false;

      const date = new Date(wedding.weddingDate);

      if (isNaN(date.getTime())) return false;

      return (
        date.getDate() === day &&
        date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear
      );
    });
  }

  const calendarDays = useMemo(() => {
    const firstDay = new Date(
      currentYear,
      currentMonth,
      1
    ).getDay();

    const daysInMonth = new Date(
      currentYear,
      currentMonth + 1,
      0
    ).getDate();

    const previousMonthDays = new Date(
      currentYear,
      currentMonth,
      0
    ).getDate();

    const days: {
      day: number;
      currentMonth: boolean;
      dateKey: string;
    }[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const day = previousMonthDays - i;

      days.push({
        day,
        currentMonth: false,
        dateKey: `prev-${day}`,
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        currentMonth: true,
        dateKey: `${currentYear}-${currentMonth}-${day}`,
      });
    }

    let nextDay = 1;

    while (days.length < 42) {
      days.push({
        day: nextDay,
        currentMonth: false,
        dateKey: `next-${nextDay}`,
      });

      nextDay++;
    }

    return days;
  }, [currentMonth, currentYear]);

  function isToday(day: number) {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  }

  function formatDate(dateValue?: string) {
    if (!dateValue) return "";

    const date = new Date(dateValue);

    if (isNaN(date.getTime())) return "";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const monthEvents = weddings
    .filter((wedding) => {
      if (!wedding.weddingDate) return false;

      const date = new Date(wedding.weddingDate);

      return (
        !isNaN(date.getTime()) &&
        date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear
      );
    })
    .sort((a, b) => {
      const dateA = new Date(a.weddingDate || "").getTime();
      const dateB = new Date(b.weddingDate || "").getTime();

      return dateA - dateB;
    });

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f6f7fb",
        padding: "20px",
        color: "#111827",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
            marginBottom: "20px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "30px",
                fontWeight: 800,
              }}
            >
              📅 Calendar
            </h1>

            <p
              style={{
                margin: "6px 0 0",
                color: "#6b7280",
              }}
            >
              Manage your wedding events and dates
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/"
              style={{
                textDecoration: "none",
                background: "#111827",
                color: "white",
                padding: "10px 16px",
                borderRadius: "10px",
                fontWeight: 600,
              }}
            >
              ← Dashboard
            </Link>

            <Link
              href="/clients"
              style={{
                textDecoration: "none",
                background: "#2563eb",
                color: "white",
                padding: "10px 16px",
                borderRadius: "10px",
                fontWeight: 600,
              }}
            >
              Clients
            </Link>
          </div>
        </div>

        {/* Calendar Card */}
        <div
          style={{
            background: "white",
            borderRadius: "18px",
            padding: "20px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            border: "1px solid #e5e7eb",
          }}
        >
          {/* Calendar Top */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              marginBottom: "20px",
              flexWrap: "wrap",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "24px",
                fontWeight: 800,
              }}
            >
              {monthNames[currentMonth]} {currentYear}
            </h2>

            <div
              style={{
                display: "flex",
                gap: "8px",
              }}
            >
              <button
                onClick={previousMonth}
                style={{
                  border: "1px solid #d1d5db",
                  background: "white",
                  borderRadius: "9px",
                  padding: "9px 13px",
                  cursor: "pointer",
                  fontSize: "16px",
                }}
              >
                ←
              </button>

              <button
                onClick={goToToday}
                style={{
                  border: "1px solid #d1d5db",
                  background: "white",
                  borderRadius: "9px",
                  padding: "9px 14px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Today
              </button>

              <button
                onClick={nextMonth}
                style={{
                  border: "1px solid #d1d5db",
                  background: "white",
                  borderRadius: "9px",
                  padding: "9px 13px",
                  cursor: "pointer",
                  fontSize: "16px",
                }}
              >
                →
              </button>
            </div>
          </div>

          {/* Day Names */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              borderTop: "1px solid #e5e7eb",
              borderLeft: "1px solid #e5e7eb",
            }}
          >
            {dayNames.map((day) => (
              <div
                key={day}
                style={{
                  padding: "12px 6px",
                  textAlign: "center",
                  fontWeight: 700,
                  background: "#f9fafb",
                  borderRight: "1px solid #e5e7eb",
                  borderBottom: "1px solid #e5e7eb",
                  color: "#4b5563",
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              borderLeft: "1px solid #e5e7eb",
            }}
          >
            {calendarDays.map((calendarDay) => {
              const events = calendarDay.currentMonth
                ? getEventsForDate(calendarDay.day)
                : [];

              return (
                <div
                  key={calendarDay.dateKey}
                  style={{
                    minHeight: "115px",
                    padding: "8px",
                    borderRight: "1px solid #e5e7eb",
                    borderBottom: "1px solid #e5e7eb",
                    background: calendarDay.currentMonth
                      ? "white"
                      : "#f9fafb",
                    opacity: calendarDay.currentMonth ? 1 : 0.45,
                  }}
                >
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "50%",
                      background: isToday(calendarDay.day)
                        ? "#2563eb"
                        : "transparent",
                      color: isToday(calendarDay.day)
                        ? "white"
                        : "#111827",
                      fontWeight: 700,
                      marginBottom: "5px",
                    }}
                  >
                    {calendarDay.day}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "5px",
                    }}
                  >
                    {events.map((event) => (
                      <Link
                        key={event.id}
                        href={
                          event.clientId
                            ? `/clients/${event.clientId}`
                            : "#"
                        }
                        style={{
                          textDecoration: "none",
                          background: "#eff6ff",
                          borderLeft: "4px solid #2563eb",
                          padding: "6px",
                          borderRadius: "6px",
                          color: "#1e3a8a",
                          fontSize: "12px",
                          fontWeight: 600,
                          display: "block",
                        }}
                      >
                        <div>
                          {event.eventName ||
                            event.eventType ||
                            "Wedding"}
                        </div>

                        {event.clientName && (
                          <div
                            style={{
                              fontSize: "11px",
                              marginTop: "2px",
                              color: "#4b5563",
                            }}
                          >
                            {event.clientName}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Events */}
        <div
          style={{
            marginTop: "20px",
            background: "white",
            borderRadius: "18px",
            padding: "20px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            border: "1px solid #e5e7eb",
          }}
        >
          <h2
            style={{
              margin: "0 0 15px",
              fontSize: "21px",
              fontWeight: 800,
            }}
          >
            📋 Events This Month
          </h2>

          {loading ? (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                color: "#6b7280",
              }}
            >
              Loading events...
            </div>
          ) : monthEvents.length === 0 ? (
            <div
              style={{
                padding: "25px",
                textAlign: "center",
                background: "#f9fafb",
                borderRadius: "12px",
                color: "#6b7280",
              }}
            >
              No wedding events found for this month.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {monthEvents.map((event) => (
                <div
                  key={event.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "15px",
                    padding: "14px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: "16px",
                      }}
                    >
                      {event.eventName ||
                        event.eventType ||
                        "Wedding"}
                    </div>

                    <div
                      style={{
                        color: "#6b7280",
                        marginTop: "3px",
                      }}
                    >
                      {event.clientName || "Client"}
                    </div>
                  </div>

                  <div
                    style={{
                      fontWeight: 700,
                      color: "#2563eb",
                    }}
                  >
                    {formatDate(event.weddingDate)}
                  </div>

                  {event.status && (
                    <div
                      style={{
                        background: "#f3f4f6",
                        padding: "6px 10px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      {event.status}
                    </div>
                  )}

                  {event.clientId && (
                    <Link
                      href={`/clients/${event.clientId}`}
                      style={{
                        textDecoration: "none",
                        background: "#111827",
                        color: "white",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      View Client
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}