"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";

type Client = {
  id: string;
  studioId?: string;
  clientName?: string;
  mobile?: string;
  eventName?: string;
  brideName?: string;
  groomName?: string;
  venue?: string;
  packageName?: string;
  totalAmount?: number;
  advancePaid?: number;
  remainingAmount?: number;
};

type Wedding = {
  id: string;
  studioId?: string;
  clientId?: string;
  clientName?: string;
  eventName?: string;
  eventType?: string;
  brideName?: string;
  groomName?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  weddingDate?: string;
  venue?: string;
  packageName?: string;
  totalAmount?: number;
  advancePaid?: number;
  status?: string;
  notes?: string;
  services?: any[];
};

type Payment = {
  id: string;
  studioId?: string;
  clientId?: string;
  clientName?: string;
  amount?: number;
  paymentDate?: string;
  paymentMethod?: string;
};

type Task = {
  id: string;
  studioId?: string;
  weddingId?: string;
  clientId?: string;
  clientName?: string;
  eventName?: string;
  eventType?: string;
  brideName?: string;
  groomName?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  weddingDate?: string;
  venue?: string;
  packageName?: string;
  totalAmount?: number;
  paidAmount?: number;
  pendingAmount?: number;
  services?: string[];
  notes?: string;
  status?: string;
  createdAt?: any;
  updatedAt?: any;
};

const taskStatuses = [
  "Pending",
  "In Progress",
  "Completed",
];

function formatDate(date?: string) {
  if (!date) return "-";

  const d = new Date(date + "T00:00:00");

  if (Number.isNaN(d.getTime())) return date;

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function money(value?: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function normalizeServices(services: any): string[] {
  if (!Array.isArray(services)) {
    return [];
  }

  return services
    .map((service) => {
      if (typeof service === "string") {
        return service;
      }

      if (
        service &&
        typeof service === "object" &&
        service.name
      ) {
        return String(service.name);
      }

      return "";
    })
    .filter(Boolean);
}

function getDateOnly(date?: string) {
  if (!date) return null;

  const value = new Date(date + "T00:00:00");

  if (Number.isNaN(value.getTime())) {
    return null;
  }

  return value;
}

function getReminderText(date?: string) {
  const eventDate = getDateOnly(date);

  if (!eventDate) {
    return "";
  }

  const today = new Date();

  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const difference = Math.round(
    (eventDate.getTime() - todayOnly.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (difference === 0) {
    return "🔴 Event Today";
  }

  if (difference === 1) {
    return "🟡 Event Tomorrow";
  }

  if (difference < 0) {
    return "⚫ Event Passed";
  }

  return `📅 ${difference} days left`;
}

export default function TasksPage() {
  const [userId, setUserId] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("All");

  const [selectedTask, setSelectedTask] =
    useState<Task | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          setUserId("");
          setAuthLoading(false);
          setLoading(false);
          return;
        }

        setUserId(user.uid);
        setAuthLoading(false);

        await syncTasks(user.uid);
      }
    );

    return () => unsubscribe();
  }, []);

  async function syncTasks(uid: string) {
    try {
      setSyncing(true);
      setLoading(true);

      const [
        weddingsSnapshot,
        clientsSnapshot,
        paymentsSnapshot,
        tasksSnapshot,
      ] = await Promise.all([
        getDocs(collection(db, "weddings")),
        getDocs(collection(db, "clients")),
        getDocs(collection(db, "payments")),
        getDocs(collection(db, "tasks")),
      ]);

      const clients: Client[] = [];
      const weddings: Wedding[] = [];
      const payments: Payment[] = [];
      const existingTasks: Task[] = [];

      // CLIENTS

      for (const item of clientsSnapshot.docs) {
        const data = item.data();

        if (!data.studioId) {
          try {
            await updateDoc(
              doc(db, "clients", item.id),
              {
                studioId: uid,
                updatedAt: new Date(),
              }
            );
          } catch (error) {
            console.error(
              "Client migration error:",
              error
            );
          }

          clients.push({
            id: item.id,
            ...data,
            studioId: uid,
          } as Client);
        } else if (data.studioId === uid) {
          clients.push({
            id: item.id,
            ...data,
          } as Client);
        }
      }

      // EVENTS

      for (const item of weddingsSnapshot.docs) {
        const data = item.data();

        if (!data.studioId) {
          try {
            await updateDoc(
              doc(db, "weddings", item.id),
              {
                studioId: uid,
                updatedAt: new Date(),
              }
            );
          } catch (error) {
            console.error(
              "Event migration error:",
              error
            );
          }

          weddings.push({
            id: item.id,
            ...data,
            studioId: uid,
          } as Wedding);
        } else if (data.studioId === uid) {
          weddings.push({
            id: item.id,
            ...data,
          } as Wedding);
        }
      }

      // PAYMENTS

      for (const item of paymentsSnapshot.docs) {
        const data = item.data();

        if (!data.studioId) {
          try {
            await updateDoc(
              doc(db, "payments", item.id),
              {
                studioId: uid,
                updatedAt: new Date(),
              }
            );
          } catch (error) {
            console.error(
              "Payment migration error:",
              error
            );
          }

          payments.push({
            id: item.id,
            ...data,
            studioId: uid,
          } as Payment);
        } else if (data.studioId === uid) {
          payments.push({
            id: item.id,
            ...data,
          } as Payment);
        }
      }

      // EXISTING TASKS

      for (const item of tasksSnapshot.docs) {
        const data = item.data();

        if (!data.studioId) {
          try {
            await updateDoc(
              doc(db, "tasks", item.id),
              {
                studioId: uid,
                updatedAt: new Date(),
              }
            );
          } catch (error) {
            console.error(
              "Task migration error:",
              error
            );
          }

          existingTasks.push({
            id: item.id,
            ...data,
            studioId: uid,
          } as Task);
        } else if (data.studioId === uid) {
          existingTasks.push({
            id: item.id,
            ...data,
          } as Task);
        }
      }

      const weddingIds = new Set<string>();

      for (const wedding of weddings) {
        weddingIds.add(wedding.id);

        let client: Client | undefined;

        if (wedding.clientId) {
          client = clients.find(
            (item) =>
              item.id === wedding.clientId
          );
        }

        if (!client && wedding.clientName) {
          client = clients.find(
            (item) =>
              item.clientName ===
              wedding.clientName
          );
        }

        const clientId =
          wedding.clientId ||
          client?.id ||
          "";

        const clientName =
          wedding.clientName ||
          client?.clientName ||
          "";

        const eventName =
          wedding.eventName ||
          client?.eventName ||
          "Event";

        const services =
          normalizeServices(
            wedding.services
          );

        const totalAmount = Number(
          wedding.totalAmount ??
            client?.totalAmount ??
            0
        );

        const advanceAmount = Number(
          wedding.advancePaid ??
            client?.advancePaid ??
            0
        );

        const paymentTotal = payments
          .filter(
            (payment) =>
              payment.clientId === clientId
          )
          .reduce(
            (sum, payment) =>
              sum +
              Number(payment.amount || 0),
            0
          );

        const paidAmount =
          paymentTotal > 0
            ? paymentTotal
            : advanceAmount;

        const pendingAmount = Math.max(
          0,
          totalAmount - paidAmount
        );

        const existingTask =
          existingTasks.find(
            (task) =>
              task.weddingId === wedding.id ||
              task.id === wedding.id
          );

        const taskData = {
          studioId: uid,

          weddingId: wedding.id,
          clientId,

          clientName,
          eventName,

          eventType:
            wedding.eventType || "",

          brideName:
            wedding.brideName ||
            client?.brideName ||
            "",

          groomName:
            wedding.groomName ||
            client?.groomName ||
            "",

          eventStartDate:
            wedding.eventStartDate ||
            wedding.weddingDate ||
            "",

          eventEndDate:
            wedding.eventEndDate || "",

          weddingDate:
            wedding.weddingDate ||
            wedding.eventStartDate ||
            "",

          venue:
            wedding.venue ||
            client?.venue ||
            "",

          packageName:
            wedding.packageName ||
            client?.packageName ||
            "",

          totalAmount,
          paidAmount,
          pendingAmount,

          services,

          notes: wedding.notes || "",

          status:
            existingTask?.status ||
            "Pending",

          updatedAt: new Date(),
        };

        try {
          await updateDoc(
            doc(db, "tasks", wedding.id),
            taskData
          );
        } catch {
          await addDoc(
            collection(db, "tasks"),
            {
              ...taskData,
              createdAt: new Date(),
            }
          );
        }
      }

      // DELETE TASKS OF DELETED EVENTS

      for (const task of existingTasks) {
        if (
          task.weddingId &&
          !weddingIds.has(task.weddingId)
        ) {
          try {
            await deleteDoc(
              doc(db, "tasks", task.id)
            );
          } catch (error) {
            console.error(
              "Old task delete error:",
              error
            );
          }
        }
      }

      // LOAD FINAL TASKS

      const finalTasksSnapshot =
        await getDocs(
          collection(db, "tasks")
        );

      const finalTasks: Task[] = [];

      for (const item of finalTasksSnapshot.docs) {
        const data = item.data();

        if (data.studioId === uid) {
          finalTasks.push({
            id: item.id,
            ...data,
            services: normalizeServices(
              data.services
            ),
          } as Task);
        }
      }

      finalTasks.sort((a, b) => {
        const dateA =
          a.eventStartDate ||
          a.weddingDate ||
          "9999-12-31";

        const dateB =
          b.eventStartDate ||
          b.weddingDate ||
          "9999-12-31";

        return dateA.localeCompare(dateB);
      });

      setTasks(finalTasks);
    } catch (error) {
      console.error(
        "Task sync error:",
        error
      );

      alert(
        "Tasks load/sync કરવામાં error આવ્યો."
      );
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }

  async function updateTaskStatus(
    task: Task,
    newStatus: string
  ) {
    try {
      await updateDoc(
        doc(db, "tasks", task.id),
        {
          status: newStatus,
          updatedAt: new Date(),
        }
      );

      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? {
                ...item,
                status: newStatus,
              }
            : item
        )
      );

      if (selectedTask?.id === task.id) {
        setSelectedTask({
          ...task,
          status: newStatus,
        });
      }
    } catch (error) {
      console.error(
        "Task status error:",
        error
      );

      alert(
        "Task status update કરવામાં error આવ્યો."
      );
    }
  }

  const filteredTasks = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        String(task.clientName || "")
          .toLowerCase()
          .includes(query) ||
        String(task.eventName || "")
          .toLowerCase()
          .includes(query) ||
        String(task.brideName || "")
          .toLowerCase()
          .includes(query) ||
        String(task.groomName || "")
          .toLowerCase()
          .includes(query) ||
        String(task.venue || "")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        task.status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    tasks,
    search,
    statusFilter,
  ]);

  const pendingCount = tasks.filter(
    (task) =>
      !task.status ||
      task.status === "Pending"
  ).length;

  const inProgressCount = tasks.filter(
    (task) =>
      task.status === "In Progress"
  ).length;

  const completedCount = tasks.filter(
    (task) =>
      task.status === "Completed"
  ).length;

  const todayTasks = tasks.filter(
    (task) => {
      const eventDate =
        getDateOnly(
          task.eventStartDate ||
            task.weddingDate
        );

      if (!eventDate) return false;

      const today = new Date();

      const todayOnly = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );

      return (
        eventDate.getTime() ===
        todayOnly.getTime()
      );
    }
  ).length;

  const tomorrowTasks = tasks.filter(
    (task) => {
      const eventDate =
        getDateOnly(
          task.eventStartDate ||
            task.weddingDate
        );

      if (!eventDate) return false;

      const tomorrow = new Date();

      tomorrow.setDate(
        tomorrow.getDate() + 1
      );

      const tomorrowOnly =
        new Date(
          tomorrow.getFullYear(),
          tomorrow.getMonth(),
          tomorrow.getDate()
        );

      return (
        eventDate.getTime() ===
        tomorrowOnly.getTime()
      );
    }
  ).length;

  async function handleSync() {
    if (!userId) return;

    await syncTasks(userId);
  }

  if (authLoading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "Arial, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          WedFlow loading...
        </div>
      </main>
    );
  }

  if (!userId) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          fontFamily:
            "Arial, sans-serif",
        }}
      >
        <div
          style={{
            background: "white",
            padding: 30,
            borderRadius: 20,
            textAlign: "center",
            maxWidth: 450,
            width: "100%",
            boxShadow:
              "0 10px 40px rgba(0,0,0,0.08)",
          }}
        >
          <h2>Login Required</h2>

          <p
            style={{
              color: "#6b7280",
            }}
          >
            Tasks જોવા માટે પહેલા WedFlow માં
            login કરો.
          </p>

          <button
            onClick={() => {
              window.location.href =
                "/login";
            }}
            style={{
              border: "none",
              background: "#111827",
              color: "white",
              padding: "12px 20px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Go to Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: 24,
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: 15,
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 30,
                fontWeight: 800,
              }}
            >
              ✓ Tasks
            </h1>

            <p
              style={{
                margin: "6px 0 0",
                color: "#6b7280",
              }}
            >
              દરેક Event માટે એક જ Task
            </p>
          </div>

          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              border: "none",
              background: "#111827",
              color: "white",
              padding: "12px 18px",
              borderRadius: 10,
              cursor: syncing
                ? "not-allowed"
                : "pointer",
              fontWeight: 800,
            }}
          >
            {syncing
              ? "Syncing..."
              : "🔄 Sync Tasks"}
          </button>
        </div>

        {/* STATS */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 14,
            marginBottom: 22,
          }}
        >
          <div
            style={{
              background: "white",
              padding: 18,
              borderRadius: 16,
              boxShadow:
                "0 4px 18px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                color: "#6b7280",
                fontSize: 13,
              }}
            >
              Total Tasks
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                marginTop: 5,
              }}
            >
              {tasks.length}
            </div>
          </div>

          <div
            style={{
              background: "white",
              padding: 18,
              borderRadius: 16,
              boxShadow:
                "0 4px 18px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                color: "#6b7280",
                fontSize: 13,
              }}
            >
              🔴 Pending
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#dc2626",
                marginTop: 5,
              }}
            >
              {pendingCount}
            </div>
          </div>

          <div
            style={{
              background: "white",
              padding: 18,
              borderRadius: 16,
              boxShadow:
                "0 4px 18px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                color: "#6b7280",
                fontSize: 13,
              }}
            >
              🟡 In Progress
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#ca8a04",
                marginTop: 5,
              }}
            >
              {inProgressCount}
            </div>
          </div>

          <div
            style={{
              background: "white",
              padding: 18,
              borderRadius: 16,
              boxShadow:
                "0 4px 18px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                color: "#6b7280",
                fontSize: 13,
              }}
            >
              🟢 Completed
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#16a34a",
                marginTop: 5,
              }}
            >
              {completedCount}
            </div>
          </div>

          <div
            style={{
              background: "white",
              padding: 18,
              borderRadius: 16,
              boxShadow:
                "0 4px 18px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                color: "#6b7280",
                fontSize: 13,
              }}
            >
              🔴 Today
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#dc2626",
                marginTop: 5,
              }}
            >
              {todayTasks}
            </div>
          </div>

          <div
            style={{
              background: "white",
              padding: 18,
              borderRadius: 16,
              boxShadow:
                "0 4px 18px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                color: "#6b7280",
                fontSize: 13,
              }}
            >
              🟡 Tomorrow
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#ca8a04",
                marginTop: 5,
              }}
            >
              {tomorrowTasks}
            </div>
          </div>
        </div>

        {/* SEARCH */}

        <div
          style={{
            background: "white",
            padding: 16,
            borderRadius: 16,
            marginBottom: 20,
            boxShadow:
              "0 4px 18px rgba(0,0,0,0.05)",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search client, event, bride, groom, venue..."
            style={{
              flex: 1,
              minWidth: 250,
              padding: "12px 14px",
              border:
                "1px solid #d1d5db",
              borderRadius: 10,
              outline: "none",
            }}
          />

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
            style={{
              minWidth: 170,
              padding: "12px 14px",
              border:
                "1px solid #d1d5db",
              borderRadius: 10,
              background: "white",
            }}
          >
            <option value="All">
              All Status
            </option>

            {taskStatuses.map(
              (status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status}
                </option>
              )
            )}
          </select>
        </div>

        {/* TASKS */}

        {loading ? (
          <div
            style={{
              background: "white",
              borderRadius: 18,
              padding: 45,
              textAlign: "center",
            }}
          >
            Tasks loading...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div
            style={{
              background: "white",
              borderRadius: 18,
              padding: 50,
              textAlign: "center",
              boxShadow:
                "0 4px 18px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                fontSize: 45,
              }}
            >
              ✓
            </div>

            <h3>
              No Tasks Found
            </h3>

            <p
              style={{
                color: "#6b7280",
              }}
            >
              Event બનાવ્યા પછી Task અહીં
              automatically આવશે.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(330px, 1fr))",
              gap: 18,
            }}
          >
            {filteredTasks.map(
              (task) => {
                const eventDate =
                  task.eventStartDate ||
                  task.weddingDate;

                const reminder =
                  getReminderText(
                    eventDate
                  );

                return (
                  <div
                    key={task.id}
                    style={{
                      background: "white",
                      borderRadius: 18,
                      padding: 20,
                      boxShadow:
                        "0 5px 20px rgba(0,0,0,0.06)",
                      border:
                        "1px solid #eef0f4",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "flex-start",
                        gap: 10,
                      }}
                    >
                      <div>
                        <h2
                          style={{
                            margin: 0,
                            fontSize: 20,
                          }}
                        >
                          {task.eventName ||
                            "Event"}
                        </h2>

                        <div
                          style={{
                            marginTop: 5,
                            color: "#6b7280",
                            fontSize: 14,
                          }}
                        >
                          {task.clientName ||
                            "Client"}
                        </div>
                      </div>

                      <span
                        style={{
                          padding:
                            "6px 9px",
                          borderRadius: 20,
                          background:
                            task.status ===
                            "Completed"
                              ? "#dcfce7"
                              : task.status ===
                                "In Progress"
                              ? "#fef3c7"
                              : "#fee2e2",
                          color:
                            task.status ===
                            "Completed"
                              ? "#166534"
                              : task.status ===
                                "In Progress"
                              ? "#92400e"
                              : "#991b1b",
                          fontSize: 11,
                          fontWeight: 800,
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {task.status ||
                          "Pending"}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 14,
                        padding:
                          "9px 11px",
                        borderRadius: 9,
                        background:
                          reminder.includes(
                            "Today"
                          )
                            ? "#fee2e2"
                            : reminder.includes(
                                "Tomorrow"
                              )
                            ? "#fef3c7"
                            : "#f3f4f6",
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      {reminder}
                    </div>

                    <div
                      style={{
                        marginTop: 15,
                        display: "grid",
                        gap: 9,
                        fontSize: 14,
                      }}
                    >
                      <div>
                        <strong>
                          📅 Date:
                        </strong>{" "}
                        {formatDate(
                          eventDate
                        )}

                        {task.eventEndDate && (
                          <>
                            {" "}
                            →{" "}
                            {formatDate(
                              task.eventEndDate
                            )}
                          </>
                        )}
                      </div>

                      {task.eventType && (
                        <div>
                          <strong>
                            🎉 Type:
                          </strong>{" "}
                          {task.eventType}
                        </div>
                      )}

                      {(task.brideName ||
                        task.groomName) && (
                        <div>
                          <strong>
                            💑 Couple:
                          </strong>{" "}
                          {task.brideName ||
                            "-"}
                          {task.groomName
                            ? ` & ${task.groomName}`
                            : ""}
                        </div>
                      )}

                      {task.venue && (
                        <div>
                          <strong>
                            📍 Venue:
                          </strong>{" "}
                          {task.venue}
                        </div>
                      )}

                      {task.packageName && (
                        <div>
                          <strong>
                            📦 Package:
                          </strong>{" "}
                          {task.packageName}
                        </div>
                      )}
                    </div>

                    {task.services &&
                      task.services.length > 0 && (
                        <div
                          style={{
                            marginTop: 17,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 800,
                              marginBottom: 8,
                            }}
                          >
                            🎬 Services
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              flexWrap:
                                "wrap",
                            }}
                          >
                            {task.services.map(
                              (service) => (
                                <span
                                  key={
                                    service
                                  }
                                  style={{
                                    background:
                                      "#f3f4f6",
                                    padding:
                                      "6px 9px",
                                    borderRadius:
                                      8,
                                    fontSize:
                                      11,
                                    fontWeight:
                                      700,
                                  }}
                                >
                                  {service}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    <div
                      style={{
                        marginTop: 17,
                        padding: 12,
                        background:
                          "#f9fafb",
                        borderRadius: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(3, 1fr)",
                          gap: 8,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 11,
                              color:
                                "#6b7280",
                            }}
                          >
                            Total
                          </div>

                          <div
                            style={{
                              fontWeight: 800,
                              marginTop: 3,
                            }}
                          >
                            {money(
                              task.totalAmount
                            )}
                          </div>
                        </div>

                        <div>
                          <div
                            style={{
                              fontSize: 11,
                              color:
                                "#6b7280",
                            }}
                          >
                            Paid
                          </div>

                          <div
                            style={{
                              fontWeight: 800,
                              color:
                                "#166534",
                              marginTop: 3,
                            }}
                          >
                            {money(
                              task.paidAmount
                            )}
                          </div>
                        </div>

                        <div>
                          <div
                            style={{
                              fontSize: 11,
                              color:
                                "#6b7280",
                            }}
                          >
                            Pending
                          </div>

                          <div
                            style={{
                              fontWeight: 800,
                              color:
                                Number(
                                  task.pendingAmount ||
                                    0
                                ) > 0
                                  ? "#dc2626"
                                  : "#166534",
                              marginTop: 3,
                            }}
                          >
                            {money(
                              task.pendingAmount
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 17,
                      }}
                    >
                      <select
                        value={
                          task.status ||
                          "Pending"
                        }
                        onChange={(e) =>
                          updateTaskStatus(
                            task,
                            e.target.value
                          )
                        }
                        style={{
                          width: "100%",
                          padding:
                            "11px 12px",
                          border:
                            "1px solid #d1d5db",
                          borderRadius: 10,
                          background:
                            "white",
                          fontWeight: 700,
                        }}
                      >
                        {taskStatuses.map(
                          (item) => (
                            <option
                              key={item}
                              value={item}
                            >
                              {item}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <button
                      onClick={() =>
                        setSelectedTask(
                          task
                        )
                      }
                      style={{
                        width: "100%",
                        marginTop: 10,
                        border: "none",
                        background:
                          "#111827",
                        color: "white",
                        padding:
                          "11px 14px",
                        borderRadius: 10,
                        cursor: "pointer",
                        fontWeight: 800,
                      }}
                    >
                      👁️ View Full Details
                    </button>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>

      {/* DETAILS MODAL */}

      {selectedTask && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
            padding: 20,
            zIndex: 9999,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 650,
              background: "white",
              borderRadius: 20,
              padding: 24,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "flex-start",
                gap: 10,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 25,
                  }}
                >
                  {selectedTask.eventName ||
                    "Event"}
                </h2>

                <div
                  style={{
                    marginTop: 5,
                    color: "#6b7280",
                  }}
                >
                  {selectedTask.clientName ||
                    "Client"}
                </div>
              </div>

              <button
                onClick={() =>
                  setSelectedTask(null)
                }
                style={{
                  border: "none",
                  background:
                    "#f3f4f6",
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 18,
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                marginTop: 22,
                display: "grid",
                gap: 14,
              }}
            >
              <div
                style={{
                  padding: 14,
                  background:
                    "#f9fafb",
                  borderRadius: 12,
                }}
              >
                <strong>
                  📅 Event Date
                </strong>

                <div
                  style={{
                    marginTop: 5,
                  }}
                >
                  {formatDate(
                    selectedTask.eventStartDate ||
                      selectedTask.weddingDate
                  )}

                  {selectedTask.eventEndDate &&
                    ` → ${formatDate(
                      selectedTask.eventEndDate
                    )}`}
                </div>
              </div>

              {selectedTask.eventType && (
                <div
                  style={{
                    padding: 14,
                    background:
                      "#f9fafb",
                    borderRadius: 12,
                  }}
                >
                  <strong>
                    🎉 Event Type
                  </strong>

                  <div
                    style={{
                      marginTop: 5,
                    }}
                  >
                    {selectedTask.eventType}
                  </div>
                </div>
              )}

              {(selectedTask.brideName ||
                selectedTask.groomName) && (
                <div
                  style={{
                    padding: 14,
                    background:
                      "#f9fafb",
                    borderRadius: 12,
                  }}
                >
                  <strong>
                    💑 Couple
                  </strong>

                  <div
                    style={{
                      marginTop: 5,
                    }}
                  >
                    {selectedTask.brideName ||
                      "-"}

                    {selectedTask.groomName
                      ? ` & ${selectedTask.groomName}`
                      : ""}
                  </div>
                </div>
              )}

              {selectedTask.venue && (
                <div
                  style={{
                    padding: 14,
                    background:
                      "#f9fafb",
                    borderRadius: 12,
                  }}
                >
                  <strong>
                    📍 Venue
                  </strong>

                  <div
                    style={{
                      marginTop: 5,
                    }}
                  >
                    {selectedTask.venue}
                  </div>
                </div>
              )}

              {selectedTask.packageName && (
                <div
                  style={{
                    padding: 14,
                    background:
                      "#f9fafb",
                    borderRadius: 12,
                  }}
                >
                  <strong>
                    📦 Package
                  </strong>

                  <div
                    style={{
                      marginTop: 5,
                    }}
                  >
                    {selectedTask.packageName}
                  </div>
                </div>
              )}

              {selectedTask.services &&
                selectedTask.services.length > 0 && (
                  <div
                    style={{
                      padding: 14,
                      background:
                        "#f9fafb",
                      borderRadius: 12,
                    }}
                  >
                    <strong>
                      🎬 Services
                    </strong>

                    <div
                      style={{
                        display: "flex",
                        gap: 7,
                        flexWrap: "wrap",
                        marginTop: 9,
                      }}
                    >
                      {selectedTask.services.map(
                        (service) => (
                          <span
                            key={service}
                            style={{
                              padding:
                                "7px 10px",
                              background:
                                "white",
                              border:
                                "1px solid #e5e7eb",
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {service}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

              <div
                style={{
                  padding: 14,
                  background:
                    "#f9fafb",
                  borderRadius: 12,
                }}
              >
                <strong>
                  💰 Payment
                </strong>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(3, 1fr)",
                    gap: 10,
                    marginTop: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color:
                          "#6b7280",
                      }}
                    >
                      Total
                    </div>

                    <div
                      style={{
                        fontWeight: 800,
                        marginTop: 3,
                      }}
                    >
                      {money(
                        selectedTask.totalAmount
                      )}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color:
                          "#6b7280",
                      }}
                    >
                      Paid
                    </div>

                    <div
                      style={{
                        fontWeight: 800,
                        color:
                          "#166534",
                        marginTop: 3,
                      }}
                    >
                      {money(
                        selectedTask.paidAmount
                      )}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color:
                          "#6b7280",
                      }}
                    >
                      Pending
                    </div>

                    <div
                      style={{
                        fontWeight: 800,
                        color:
                          Number(
                            selectedTask.pendingAmount ||
                              0
                          ) > 0
                            ? "#dc2626"
                            : "#166534",
                        marginTop: 3,
                      }}
                    >
                      {money(
                        selectedTask.pendingAmount
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {selectedTask.notes && (
                <div
                  style={{
                    padding: 14,
                    background:
                      "#fff7ed",
                    color:
                      "#7c2d12",
                    borderRadius: 12,
                  }}
                >
                  <strong>
                    📝 Notes
                  </strong>

                  <div
                    style={{
                      marginTop: 5,
                    }}
                  >
                    {selectedTask.notes}
                  </div>
                </div>
              )}

              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: 800,
                    fontSize: 13,
                    marginBottom: 7,
                  }}
                >
                  Task Status
                </label>

                <select
                  value={
                    selectedTask.status ||
                    "Pending"
                  }
                  onChange={(e) =>
                    updateTaskStatus(
                      selectedTask,
                      e.target.value
                    )
                  }
                  style={{
                    width: "100%",
                    padding:
                      "12px 13px",
                    border:
                      "1px solid #d1d5db",
                    borderRadius: 10,
                    background:
                      "white",
                    fontWeight: 700,
                  }}
                >
                  {taskStatuses.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <button
              onClick={() =>
                setSelectedTask(null)
              }
              style={{
                width: "100%",
                marginTop: 22,
                border: "none",
                background:
                  "#111827",
                color: "white",
                padding:
                  "12px 16px",
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}