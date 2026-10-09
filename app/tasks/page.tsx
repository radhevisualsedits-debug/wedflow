
"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";

type Item = {
  id: string;
  studioId?: string;
  [key: string]: any;
};

type Task = {
  id: string;
  studioId: string;
  weddingId: string;
  clientId: string;
  clientName: string;
  eventName: string;
  eventType: string;
  brideName: string;
  groomName: string;
  eventStartDate: string;
  eventEndDate: string;
  weddingDate: string;
  venue: string;
  packageName: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  services: string[];
  notes: string;
  status: string;
};

const statuses = ["Pending", "In Progress", "Completed"];

function formatDate(value?: string) {
  if (!value) return "Date not added";

  const d = new Date(value + "T00:00:00");

  if (Number.isNaN(d.getTime())) return value;

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function money(value: number) {
  return "₹" + Number(value || 0).toLocaleString("en-IN");
}

function normalizeServices(value: any): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) =>
      typeof item === "string" ? item : item?.name || ""
    )
    .filter(Boolean);
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    const firebaseError = error as {
      code?: string;
      message?: string;
    };

    return `${firebaseError.code || "error"}: ${
      firebaseError.message || "Unknown error"
    }`;
  }

  return error instanceof Error
    ? error.message
    : String(error);
}

export default function TasksPage() {
  const [userId, setUserId] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");

  const syncTasks = useCallback(async (uid: string) => {
    if (!uid) return;

    setLoading(true);
    setError("");
    setSyncMessage("");

    try {
      const [eventsSnap, clientsSnap, paymentsSnap, tasksSnap] =
        await Promise.all([
          getDocs(
            query(
              collection(db, "weddings"),
              where("studioId", "==", uid)
            )
          ),
          getDocs(
            query(
              collection(db, "clients"),
              where("studioId", "==", uid)
            )
          ),
          getDocs(
            query(
              collection(db, "payments"),
              where("studioId", "==", uid)
            )
          ),
          getDocs(
            query(
              collection(db, "tasks"),
              where("studioId", "==", uid)
            )
          ),
        ]);

      const events: Item[] = eventsSnap.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      }));

      const clients: Item[] = clientsSnap.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      }));

      const payments: Item[] = paymentsSnap.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      }));

      const oldTasks: Item[] = tasksSnap.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      }));

      const generated: Task[] = [];

      for (const event of events) {
        const client =
          clients.find((c) => c.id === event.clientId) ||
          clients.find(
            (c) =>
              event.clientName &&
              c.clientName === event.clientName
          );

        const clientId = event.clientId || client?.id || "";

        const existing = oldTasks.find(
          (t) => t.weddingId === event.id
        );

        const eventPayments = payments.filter(
          (p) => p.clientId && p.clientId === clientId
        );

        const paymentTotal = eventPayments.reduce(
          (sum, p) => sum + Number(p.amount || 0),
          0
        );

        const total = Number(
          event.totalAmount ?? client?.totalAmount ?? 0
        );

        const advance = Number(
          event.advancePaid ?? client?.advancePaid ?? 0
        );

        const paid = paymentTotal > 0 ? paymentTotal : advance;

        // New task IDs are unique to this studio and event.
        const taskId =
          existing?.id || `${uid}_${event.id}`;

        const taskData: Task = {
          id: taskId,
          studioId: uid,
          weddingId: event.id,
          clientId,
          clientName:
            event.clientName || client?.clientName || "Client",
          eventName:
            event.eventName || client?.eventName || "Event",
          eventType: event.eventType || "",
          brideName: event.brideName || client?.brideName || "",
          groomName: event.groomName || client?.groomName || "",
          eventStartDate:
            event.eventStartDate || event.weddingDate || "",
          eventEndDate: event.eventEndDate || "",
          weddingDate:
            event.weddingDate || event.eventStartDate || "",
          venue: event.venue || client?.venue || "",
          packageName:
            event.packageName || client?.packageName || "",
          totalAmount: total,
          paidAmount: paid,
          pendingAmount: Math.max(0, total - paid),
          services: normalizeServices(event.services),
          notes: event.notes || "",
          status: existing?.status || "Pending",
        };

        await setDoc(
          doc(db, "tasks", taskId),
          {
            ...taskData,
            updatedAt: new Date(),
            ...(!existing ? { createdAt: new Date() } : {}),
          },
          { merge: true }
        );

        generated.push(taskData);
      }

      // Keep manually created tasks for this studio.
      const manualTasks = oldTasks
        .filter((t) => !t.weddingId)
        .map((t) => ({
          ...t,
          services: normalizeServices(t.services),
        })) as Task[];

      const result = [...generated, ...manualTasks];

      result.sort((a, b) =>
        (
          a.eventStartDate ||
          a.weddingDate ||
          "9999-12-31"
        ).localeCompare(
          b.eventStartDate ||
            b.weddingDate ||
            "9999-12-31"
        )
      );

      setTasks(result);
      setSyncMessage(
        `${generated.length} event task(s) synced successfully.`
      );
    } catch (e) {
      console.error("WedFlow task sync error:", e);
      setError(`Tasks Sync Error: ${getErrorMessage(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setUserId("");
        setTasks([]);
        setAuthLoading(false);
        return;
      }

      setUserId(user.uid);
      setAuthLoading(false);
      void syncTasks(user.uid);
    });

    return () => unsubscribe();
  }, [syncTasks]);

  async function changeStatus(task: Task, status: string) {
    if (!userId || task.studioId !== userId) return;

    setError("");

    try {
      await setDoc(
        doc(db, "tasks", task.id),
        {
          status,
          studioId: userId,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      setTasks((old) =>
        old.map((t) =>
          t.id === task.id ? { ...t, status } : t
        )
      );
    } catch (e) {
      console.error("Task status update error:", e);
      setError(
        `Task status update Error: ${getErrorMessage(e)}`
      );
    }
  }

  const visibleTasks = tasks.filter((task) => {
    const q = search.trim().toLowerCase();

    const matchesText =
      !q ||
      [
        task.clientName,
        task.eventName,
        task.brideName,
        task.groomName,
        task.venue,
      ].some((v) =>
        String(v || "").toLowerCase().includes(q)
      );

    return (
      matchesText &&
      (filter === "All" || task.status === filter)
    );
  });

  if (authLoading) {
    return <main style={centerStyle}>WedFlow loading...</main>;
  }

  if (!userId) {
    return (
      <main style={centerStyle}>
        <div style={panelStyle}>
          <h2>Login Required</h2>
          <p>Tasks જોવા માટે પહેલા WedFlowમાં login કરો.</p>
          <button
            style={buttonStyle}
            onClick={() => {
              window.location.href = "/login";
            }}
          >
            Go to Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={contentStyle}>
        <header style={headerStyle}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>
              ✓ Tasks
            </h1>
            <p style={{ color: "#64748b", margin: "6px 0 0" }}>
              તમારા Eventsના Tasks એક જ જગ્યાએ
            </p>
          </div>

          <button
            style={buttonStyle}
            disabled={loading}
            onClick={() => void syncTasks(userId)}
          >
            {loading ? "Syncing..." : "↻ Sync Tasks"}
          </button>
        </header>

        {error && <div style={errorStyle}>{error}</div>}

        {syncMessage && !error && (
          <div style={successStyle}>{syncMessage}</div>
        )}

        <div style={statsStyle}>
          <Stat label="Total Tasks" value={tasks.length} />
          <Stat
            label="Pending"
            value={
              tasks.filter(
                (t) => !t.status || t.status === "Pending"
              ).length
            }
          />
          <Stat
            label="In Progress"
            value={
              tasks.filter(
                (t) => t.status === "In Progress"
              ).length
            }
          />
          <Stat
            label="Completed"
            value={
              tasks.filter(
                (t) => t.status === "Completed"
              ).length
            }
          />
        </div>

        <section style={panelStyle}>
          <div style={filtersStyle}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search client, event, venue..."
              style={inputStyle}
            />

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={inputStyle}
            >
              <option value="All">All Status</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <p style={{ textAlign: "center", padding: 25 }}>
              Tasks loading...
            </p>
          ) : visibleTasks.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "35px 10px",
              }}
            >
              <div style={{ fontSize: 38 }}>📋</div>
              <h3>No Tasks Found</h3>
              <p style={{ color: "#64748b" }}>
                પહેલા Eventsમાં Event બનાવો, પછી અહીં Sync
                Tasks દબાવો.
              </p>
            </div>
          ) : (
            <div style={taskGridStyle}>
              {visibleTasks.map((task) => (
                <article key={task.id} style={taskCardStyle}>
                  <div style={taskHeaderStyle}>
                    <div>
                      <h3
                        style={{ margin: 0, fontSize: 19 }}
                      >
                        {task.eventName || "Event"}
                      </h3>
                      <p
                        style={{
                          margin: "5px 0",
                          color: "#64748b",
                        }}
                      >
                        {task.clientName || "Client"}
                      </p>
                    </div>

                    <span style={statusBadge(task.status)}>
                      {task.status || "Pending"}
                    </span>
                  </div>

                  <p>
                    📅 <strong>Date:</strong>{" "}
                    {formatDate(
                      task.eventStartDate || task.weddingDate
                    )}
                  </p>

                  {task.eventEndDate && (
                    <p>
                      📅 <strong>End:</strong>{" "}
                      {formatDate(task.eventEndDate)}
                    </p>
                  )}

                  {(task.brideName || task.groomName) && (
                    <p>
                      💑 <strong>Couple:</strong>{" "}
                      {task.brideName}
                      {task.groomName && ` & ${task.groomName}`}
                    </p>
                  )}

                  {task.venue && (
                    <p>
                      📍 <strong>Venue:</strong> {task.venue}
                    </p>
                  )}

                  {task.packageName && (
                    <p>
                      📦 <strong>Package:</strong>{" "}
                      {task.packageName}
                    </p>
                  )}

                  {task.services.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                      }}
                    >
                      {task.services.map((service, index) => (
                        <span
                          key={`${service}-${index}`}
                          style={serviceBadgeStyle}
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={moneyGridStyle}>
                    <Money
                      label="Total"
                      value={task.totalAmount}
                    />
                    <Money
                      label="Paid"
                      value={task.paidAmount}
                    />
                    <Money
                      label="Pending"
                      value={task.pendingAmount}
                    />
                  </div>

                  <label
                    style={{
                      display: "block",
                      fontWeight: 700,
                      marginBottom: 7,
                    }}
                  >
                    Task Status
                  </label>

                  <select
                    value={task.status || "Pending"}
                    onChange={(e) =>
                      void changeStatus(task, e.target.value)
                    }
                    style={{ ...inputStyle, width: "100%" }}
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>

                  {task.notes && (
                    <p
                      style={{
                        background: "#fff7ed",
                        padding: 10,
                        borderRadius: 8,
                      }}
                    >
                      📝 {task.notes}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div style={statCardStyle}>
      <div style={{ color: "#64748b", fontSize: 13 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          marginTop: 5,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Money({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <div style={{ color: "#64748b", fontSize: 12 }}>
        {label}
      </div>
      <div style={{ fontWeight: 800, marginTop: 4 }}>
        {money(value)}
      </div>
    </div>
  );
}

function statusBadge(status?: string): CSSProperties {
  const colors =
    status === "Completed"
      ? { background: "#dcfce7", color: "#166534" }
      : status === "In Progress"
        ? { background: "#fef3c7", color: "#92400e" }
        : { background: "#fee2e2", color: "#991b1b" };

  return {
    ...colors,
    borderRadius: 20,
    padding: "6px 9px",
    fontSize: 11,
    fontWeight: 800,
    whiteSpace: "nowrap",
  };
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#f1f5f9",
  padding: "clamp(12px, 3vw, 28px)",
  fontFamily: "Arial, sans-serif",
  color: "#0f172a",
};

const contentStyle: CSSProperties = {
  maxWidth: 1400,
  width: "100%",
  margin: "0 auto",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 14,
  marginBottom: 22,
};

const statsStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
  gap: 12,
  marginBottom: 18,
};

const statCardStyle: CSSProperties = {
  background: "white",
  padding: 16,
  borderRadius: 14,
  boxShadow: "0 3px 12px rgba(15,23,42,0.05)",
};

const panelStyle: CSSProperties = {
  background: "white",
  padding: "clamp(12px, 2vw, 20px)",
  borderRadius: 16,
  boxShadow: "0 3px 14px rgba(15,23,42,0.05)",
};

const filtersStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
  gap: 10,
  marginBottom: 20,
};

const inputStyle: CSSProperties = {
  boxSizing: "border-box",
  minWidth: 0,
  width: "100%",
  padding: "12px 13px",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  background: "white",
  fontSize: 14,
};

const buttonStyle: CSSProperties = {
  border: 0,
  background: "#111827",
  color: "white",
  padding: "12px 16px",
  borderRadius: 10,
  fontWeight: 800,
  cursor: "pointer",
};

const taskGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(min(100%, 290px), 1fr))",
  gap: 14,
};

const taskCardStyle: CSSProperties = {
  minWidth: 0,
  padding: 16,
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  overflowWrap: "anywhere",
  background: "white",
};

const taskHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
  marginBottom: 14,
};

const moneyGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
  background: "#f8fafc",
  padding: 12,
  borderRadius: 10,
  margin: "15px 0",
};

const serviceBadgeStyle: CSSProperties = {
  background: "#f1f5f9",
  borderRadius: 7,
  padding: "6px 8px",
  fontSize: 12,
  fontWeight: 700,
};

const centerStyle: CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: 20,
  fontFamily: "Arial, sans-serif",
};

const errorStyle: CSSProperties = {
  background: "#fee2e2",
  color: "#991b1b",
  borderRadius: 10,
  padding: 12,
  marginBottom: 14,
  overflowWrap: "anywhere",
};

const successStyle: CSSProperties = {
  background: "#dcfce7",
  color: "#166534",
  borderRadius: 10,
  padding: 12,
  marginBottom: 14,
};