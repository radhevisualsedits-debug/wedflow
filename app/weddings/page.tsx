"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
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
  eventStartDate?: string;
  eventEndDate?: string;
  venue?: string;
  packageName?: string;
  totalAmount?: number;
  advancePaid?: number;
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
  services?: string[];
  createdAt?: any;
  updatedAt?: any;
};

const serviceOptions = [
  "Photography",
  "Videography",
  "Pre-Wedding",
  "Wedding Reel",
  "Teaser",
  "Highlight",
  "Full Video",
  "Cinematic Film",
  "Album",
  "Photo Frame",
  "Drone",
  "Live Streaming",
  "Same Day Edit",
  "Invitation Video",
  "Traditional Video",
];

const eventTypes = [
  "Wedding",
  "Engagement",
  "Pre-Wedding",
  "Reception",
  "Birthday",
  "Anniversary",
  "Other",
];

const statusOptions = [
  "Booked",
  "Confirmed",
  "Pending",
  "Completed",
  "Cancelled",
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

function formatMoney(value?: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function calculateDuration(start?: string, end?: string) {
  if (!start || !end) return "";

  const startDate = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    return "";
  }

  const diff =
    Math.floor(
      (endDate.getTime() - startDate.getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;

  if (diff <= 0) return "";

  return `${diff} ${diff === 1 ? "Day" : "Days"}`;
}

export default function WeddingsPage() {
  const [userId, setUserId] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  const [clients, setClients] = useState<Client[]>([]);
  const [weddings, setWeddings] = useState<Wedding[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [clientId, setClientId] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState("Wedding");

  const [brideName, setBrideName] = useState("");
  const [groomName, setGroomName] = useState("");

  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");

  const [venue, setVenue] = useState("");
  const [packageName, setPackageName] = useState("");

  const [totalAmount, setTotalAmount] = useState("");
  const [advancePaid, setAdvancePaid] = useState("");

  const [status, setStatus] = useState("Booked");
  const [notes, setNotes] = useState("");

  const [services, setServices] = useState<string[]>([]);

  const selectedClient = useMemo(() => {
    return clients.find((client) => client.id === clientId);
  }, [clients, clientId]);

  const remainingAmount = Math.max(
    0,
    Number(totalAmount || 0) - Number(advancePaid || 0)
  );

  const duration = calculateDuration(
    eventStartDate,
    eventEndDate
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserId("");
        setAuthLoading(false);
        setLoading(false);
        return;
      }

      setUserId(user.uid);
      setAuthLoading(false);

      await loadData(user.uid);
    });

    return () => unsubscribe();
  }, []);

  async function loadData(uid: string) {
    try {
      setLoading(true);
      setErrorMessage("");

      console.log("WedFlow Events - Current User UID:", uid);

      const clientsQuery = query(
        collection(db, "clients"),
        where("studioId", "==", uid)
      );

      const weddingsQuery = query(
        collection(db, "weddings"),
        where("studioId", "==", uid)
      );

      const [clientsSnapshot, weddingsSnapshot] =
        await Promise.all([
          getDocs(clientsQuery),
          getDocs(weddingsQuery),
        ]);

      console.log(
        "WedFlow Events - Clients:",
        clientsSnapshot.size
      );

      console.log(
        "WedFlow Events - Weddings:",
        weddingsSnapshot.size
      );

      const loadedClients: Client[] =
        clientsSnapshot.docs.map((item) => ({
          id: item.id,
          ...(item.data() as Omit<Client, "id">),
        }));

      const loadedWeddings: Wedding[] =
        weddingsSnapshot.docs.map((item) => ({
          id: item.id,
          ...(item.data() as Omit<Wedding, "id">),
        }));

      loadedClients.sort((a, b) =>
        String(a.clientName || "").localeCompare(
          String(b.clientName || "")
        )
      );

      loadedWeddings.sort((a, b) => {
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

      setClients(loadedClients);
      setWeddings(loadedWeddings);
    } catch (error: any) {
      console.error("Events loading error:", error);

      const message =
        error?.message ||
        "Unknown Firebase error";

      setErrorMessage(message);

      alert(
        `Events load કરવામાં error આવ્યો.\n\n${message}`
      );
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditingId(null);

    setClientId("");
    setEventName("");
    setEventType("Wedding");

    setBrideName("");
    setGroomName("");

    setEventStartDate("");
    setEventEndDate("");

    setVenue("");
    setPackageName("");

    setTotalAmount("");
    setAdvancePaid("");

    setStatus("Booked");
    setNotes("");

    setServices([]);
  }

  function openAddForm() {
    resetForm();
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    resetForm();
  }

  function handleClientChange(value: string) {
    setClientId(value);

    const client = clients.find(
      (item) => item.id === value
    );

    if (!client) return;

    setEventName(client.eventName || "");
    setBrideName(client.brideName || "");
    setGroomName(client.groomName || "");

    setEventStartDate(
      client.eventStartDate || ""
    );

    setEventEndDate(
      client.eventEndDate || ""
    );

    setVenue(client.venue || "");
    setPackageName(
      client.packageName || ""
    );

    if (
      client.totalAmount !== undefined &&
      client.totalAmount !== null
    ) {
      setTotalAmount(
        String(client.totalAmount)
      );
    }

    if (
      client.advancePaid !== undefined &&
      client.advancePaid !== null
    ) {
      setAdvancePaid(
        String(client.advancePaid)
      );
    }
  }

  function toggleService(service: string) {
    setServices((current) => {
      if (current.includes(service)) {
        return current.filter(
          (item) => item !== service
        );
      }

      return [...current, service];
    });
  }

  async function saveWedding() {
    if (!userId) {
      alert("Please login first.");
      return;
    }

    if (!eventName.trim()) {
      alert("Event Name નાખો.");
      return;
    }

    if (!eventStartDate) {
      alert(
        "Event Start Date પસંદ કરો."
      );
      return;
    }

    if (
      eventEndDate &&
      eventEndDate < eventStartDate
    ) {
      alert(
        "Event End Date, Start Date કરતા પહેલા ન હોઈ શકે."
      );
      return;
    }

    const total = Number(
      totalAmount || 0
    );

    const advance = Number(
      advancePaid || 0
    );

    if (total < 0 || advance < 0) {
      alert("Amount સાચી રીતે નાખો.");
      return;
    }

    if (advance > total) {
      alert(
        "Advance Total Amount કરતાં વધારે ન હોઈ શકે."
      );
      return;
    }

    try {
      setSaving(true);

      const selectedClient =
        clients.find(
          (client) =>
            client.id === clientId
        );

      const weddingData = {
        studioId: userId,

        clientId: clientId || "",
        clientName:
          selectedClient?.clientName || "",

        eventName:
          eventName.trim(),

        eventType,

        brideName:
          brideName.trim(),

        groomName:
          groomName.trim(),

        eventStartDate,
        eventEndDate,

        weddingDate:
          eventStartDate,

        venue:
          venue.trim(),

        packageName:
          packageName.trim(),

        totalAmount: total,
        advancePaid: advance,

        status,

        notes:
          notes.trim(),

        services,

        updatedAt:
          new Date(),
      };

      if (editingId) {
        await updateDoc(
          doc(
            db,
            "weddings",
            editingId
          ),
          weddingData
        );
      } else {
        await addDoc(
          collection(
            db,
            "weddings"
          ),
          {
            ...weddingData,
            createdAt:
              new Date(),
          }
        );
      }

      await loadData(userId);

      closeForm();
    } catch (error: any) {
      console.error(
        "Event save error:",
        error
      );

      alert(
        `Event save કરવામાં error આવ્યો.\n\n${
          error?.message || "Unknown error"
        }`
      );
    } finally {
      setSaving(false);
    }
  }

  function editWedding(
    wedding: Wedding
  ) {
    setEditingId(wedding.id);

    setClientId(
      wedding.clientId || ""
    );

    setEventName(
      wedding.eventName || ""
    );

    setEventType(
      wedding.eventType ||
        "Wedding"
    );

    setBrideName(
      wedding.brideName || ""
    );

    setGroomName(
      wedding.groomName || ""
    );

    setEventStartDate(
      wedding.eventStartDate ||
        wedding.weddingDate ||
        ""
    );

    setEventEndDate(
      wedding.eventEndDate || ""
    );

    setVenue(
      wedding.venue || ""
    );

    setPackageName(
      wedding.packageName || ""
    );

    setTotalAmount(
      wedding.totalAmount !==
        undefined
        ? String(
            wedding.totalAmount
          )
        : ""
    );

    setAdvancePaid(
      wedding.advancePaid !==
        undefined
        ? String(
            wedding.advancePaid
          )
        : ""
    );

    setStatus(
      wedding.status ||
        "Booked"
    );

    setNotes(
      wedding.notes || ""
    );

    setServices(
      Array.isArray(
        wedding.services
      )
        ? wedding.services
        : []
    );

    setShowForm(true);
  }

  async function deleteWedding(
    id: string
  ) {
    const confirmed =
      window.confirm(
        "આ Event delete કરવો છે?"
      );

    if (!confirmed) return;

    try {
      await deleteDoc(
        doc(
          db,
          "weddings",
          id
        )
      );

      setWeddings(
        (current) =>
          current.filter(
            (item) =>
              item.id !== id
          )
      );
    } catch (error: any) {
      console.error(
        "Event delete error:",
        error
      );

      alert(
        `Event delete કરવામાં error આવ્યો.\n\n${
          error?.message ||
          "Unknown error"
        }`
      );
    }
  }

  const filteredWeddings =
    useMemo(() => {
      const queryText =
        search
          .trim()
          .toLowerCase();

      return weddings.filter(
        (wedding) => {
          const matchesSearch =
            !queryText ||
            String(
              wedding.eventName ||
                ""
            )
              .toLowerCase()
              .includes(queryText) ||
            String(
              wedding.clientName ||
                ""
            )
              .toLowerCase()
              .includes(queryText) ||
            String(
              wedding.brideName ||
                ""
            )
              .toLowerCase()
              .includes(queryText) ||
            String(
              wedding.groomName ||
                ""
            )
              .toLowerCase()
              .includes(queryText) ||
            String(
              wedding.venue ||
                ""
            )
              .toLowerCase()
              .includes(queryText);

          const matchesStatus =
            statusFilter ===
              "All" ||
            wedding.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      weddings,
      search,
      statusFilter,
    ]);

  const stats =
    useMemo(() => {
      const total =
        weddings.length;

      const confirmed =
        weddings.filter(
          (item) =>
            item.status ===
              "Confirmed" ||
            item.status ===
              "Booked"
        ).length;

      const completed =
        weddings.filter(
          (item) =>
            item.status ===
            "Completed"
        ).length;

      const cancelled =
        weddings.filter(
          (item) =>
            item.status ===
            "Cancelled"
        ).length;

      return {
        total,
        confirmed,
        completed,
        cancelled,
      };
    }, [weddings]);

  if (authLoading) {
    return (
      <main
        style={{
          minHeight:
            "100vh",
          display: "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
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
          minHeight:
            "100vh",
          display: "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          fontFamily:
            "Arial, sans-serif",
          padding: 20,
        }}
      >
        <div
          style={{
            maxWidth: 450,
            width: "100%",
            padding: 30,
            borderRadius: 20,
            background:
              "white",
            boxShadow:
              "0 10px 40px rgba(0,0,0,0.08)",
            textAlign:
              "center",
          }}
        >
          <h2
            style={{
              marginTop: 0,
            }}
          >
            Login Required
          </h2>

          <p
            style={{
              color: "#666",
            }}
          >
            Events જોવા માટે પહેલા
            WedFlow માં login કરો.
          </p>

          <button
            onClick={() => {
              window.location.href =
                "/login";
            }}
            style={{
              border: "none",
              borderRadius: 10,
              padding:
                "12px 20px",
              background:
                "#111827",
              color: "white",
              fontWeight: 700,
              cursor:
                "pointer",
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
        minHeight:
          "100vh",
        background:
          "#f5f7fb",
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
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            gap: 15,
            flexWrap:
              "wrap",
            marginBottom:
              24,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 30,
                fontWeight: 800,
                color:
                  "#111827",
              }}
            >
              📅 Events
            </h1>

            <p
              style={{
                margin:
                  "6px 0 0",
                color:
                  "#6b7280",
              }}
            >
              તમારા studio ના બધા
              events અહીં manage કરો
            </p>
          </div>

          <button
            onClick={
              openAddForm
            }
            style={{
              border: "none",
              background:
                "#111827",
              color: "white",
              padding:
                "13px 20px",
              borderRadius: 12,
              fontWeight: 800,
              cursor:
                "pointer",
              fontSize: 15,
            }}
          >
            + Add Event
          </button>
        </div>

        {errorMessage && (
          <div
            style={{
              background:
                "#fee2e2",
              color:
                "#991b1b",
              padding: 15,
              borderRadius: 12,
              marginBottom:
                18,
              fontSize: 13,
              fontWeight: 700,
              wordBreak:
                "break-word",
            }}
          >
            Firebase Error:
            <br />
            {errorMessage}
          </div>
        )}

        <div
          style={{
            background:
              "#eff6ff",
            border:
              "1px solid #bfdbfe",
            color:
              "#1e40af",
            padding: 12,
            borderRadius: 10,
            marginBottom:
              18,
            fontSize: 12,
          }}
        >
          <strong>
            Current Studio ID:
          </strong>{" "}
          {userId}
        </div>

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
            marginBottom:
              22,
          }}
        >
          <StatCard
            title="Total Events"
            value={
              stats.total
            }
          />

          <StatCard
            title="Booked / Confirmed"
            value={
              stats.confirmed
            }
          />

          <StatCard
            title="Completed"
            value={
              stats.completed
            }
          />

          <StatCard
            title="Cancelled"
            value={
              stats.cancelled
            }
          />
        </div>

        <div
          style={{
            background:
              "white",
            padding: 16,
            borderRadius: 16,
            marginBottom:
              20,
            boxShadow:
              "0 4px 18px rgba(0,0,0,0.05)",
            display:
              "flex",
            gap: 12,
            flexWrap:
              "wrap",
          }}
        >
          <input
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            placeholder="Search event, client, bride, groom, venue..."
            style={{
              flex: 1,
              minWidth: 250,
              padding:
                "12px 14px",
              border:
                "1px solid #d1d5db",
              borderRadius: 10,
              outline:
                "none",
              fontSize: 14,
            }}
          />

          <select
            value={
              statusFilter
            }
            onChange={(e) =>
              setStatusFilter(
                e.target.value
              )
            }
            style={{
              minWidth: 160,
              padding:
                "12px 14px",
              border:
                "1px solid #d1d5db",
              borderRadius: 10,
              background:
                "white",
              fontSize: 14,
            }}
          >
            <option value="All">
              All Status
            </option>

            {statusOptions.map(
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

        {loading ? (
          <div
            style={{
              background:
                "white",
              borderRadius: 16,
              padding: 40,
              textAlign:
                "center",
            }}
          >
            Events loading...
          </div>
        ) : filteredWeddings.length ===
          0 ? (
          <div
            style={{
              background:
                "white",
              borderRadius: 16,
              padding: 50,
              textAlign:
                "center",
              boxShadow:
                "0 4px 18px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                fontSize: 45,
              }}
            >
              📅
            </div>

            <h3
              style={{
                marginBottom:
                  5,
              }}
            >
              No Events Found
            </h3>

            <p
              style={{
                color:
                  "#6b7280",
              }}
            >
              Firebase માં
              Weddings:
              {weddings.length}
              {" | "}
              Clients:
              {clients.length}
            </p>

            <p
              style={{
                color:
                  "#6b7280",
                fontSize: 13,
              }}
            >
              નવો Event બનાવવા
              માટે + Add Event
              દબાવો.
            </p>
          </div>
        ) : (
          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 18,
            }}
          >
            {filteredWeddings.map(
              (wedding) => {
                const total =
                  Number(
                    wedding.totalAmount ||
                      0
                  );

                const advance =
                  Number(
                    wedding.advancePaid ||
                      0
                  );

                const pending =
                  Math.max(
                    0,
                    total -
                      advance
                  );

                const eventStart =
                  wedding.eventStartDate ||
                  wedding.weddingDate ||
                  "";

                const eventEnd =
                  wedding.eventEndDate ||
                  wedding.eventStartDate ||
                  wedding.weddingDate ||
                  "";

                const eventDuration =
                  calculateDuration(
                    eventStart,
                    eventEnd
                  );

                return (
                  <div
                    key={
                      wedding.id
                    }
                    style={{
                      background:
                        "white",
                      borderRadius:
                        18,
                      padding: 20,
                      boxShadow:
                        "0 5px 20px rgba(0,0,0,0.06)",
                      border:
                        "1px solid #eef0f4",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
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
                            fontSize:
                              20,
                            color:
                              "#111827",
                          }}
                        >
                          {wedding.eventName ||
                            "Untitled Event"}
                        </h2>

                        <div
                          style={{
                            marginTop:
                              5,
                            color:
                              "#6b7280",
                            fontSize:
                              14,
                          }}
                        >
                          {wedding.clientName ||
                            "No Client"}
                        </div>
                      </div>

                      <span
                        style={{
                          padding:
                            "6px 9px",
                          borderRadius:
                            20,
                          background:
                            wedding.status ===
                            "Completed"
                              ? "#dcfce7"
                              : wedding.status ===
                                "Cancelled"
                              ? "#fee2e2"
                              : "#fef3c7",
                          color:
                            wedding.status ===
                            "Completed"
                              ? "#166534"
                              : wedding.status ===
                                "Cancelled"
                              ? "#991b1b"
                              : "#92400e",
                          fontSize:
                            11,
                          fontWeight:
                            800,
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {wedding.status ||
                          "Booked"}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop:
                          18,
                        display:
                          "grid",
                        gap: 10,
                        fontSize:
                          14,
                      }}
                    >
                      <div>
                        <strong>
                          📅 Date:
                        </strong>{" "}
                        {formatDate(
                          eventStart
                        )}

                        {wedding.eventEndDate && (
                          <>
                            {" "}
                            →
                            {" "}
                            {formatDate(
                              wedding.eventEndDate
                            )}
                          </>
                        )}

                        {eventDuration && (
                          <span
                            style={{
                              color:
                                "#6b7280",
                              marginLeft:
                                6,
                            }}
                          >
                            (
                            {
                              eventDuration
                            }
                            )
                          </span>
                        )}
                      </div>

                      {wedding.eventType && (
                        <div>
                          <strong>
                            🎉 Type:
                          </strong>{" "}
                          {
                            wedding.eventType
                          }
                        </div>
                      )}

                      {(wedding.brideName ||
                        wedding.groomName) && (
                        <div>
                          <strong>
                            💑 Couple:
                          </strong>{" "}
                          {wedding.brideName ||
                            "-"}{" "}
                          {wedding.groomName
                            ? ` & ${wedding.groomName}`
                            : ""}
                        </div>
                      )}

                      {wedding.venue && (
                        <div>
                          <strong>
                            📍 Venue:
                          </strong>{" "}
                          {
                            wedding.venue
                          }
                        </div>
                      )}

                      {wedding.packageName && (
                        <div>
                          <strong>
                            📦 Package:
                          </strong>{" "}
                          {
                            wedding.packageName
                          }
                        </div>
                      )}
                    </div>

                    {Array.isArray(
                      wedding.services
                    ) &&
                      wedding
                        .services
                        .length >
                        0 && (
                        <div
                          style={{
                            marginTop:
                              17,
                          }}
                        >
                          <div
                            style={{
                              fontSize:
                                13,
                              fontWeight:
                                800,
                              marginBottom:
                                8,
                            }}
                          >
                            🎬 Services
                          </div>

                          <div
                            style={{
                              display:
                                "flex",
                              gap: 6,
                              flexWrap:
                                "wrap",
                            }}
                          >
                            {wedding.services.map(
                              (
                                service
                              ) => (
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
                                    color:
                                      "#374151",
                                  }}
                                >
                                  {
                                    service
                                  }
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    <div
                      style={{
                        marginTop:
                          18,
                        padding: 12,
                        background:
                          "#f9fafb",
                        borderRadius:
                          12,
                      }}
                    >
                      <div
                        style={{
                          display:
                            "grid",
                          gridTemplateColumns:
                            "repeat(3, 1fr)",
                          gap: 8,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize:
                                11,
                              color:
                                "#6b7280",
                            }}
                          >
                            Total
                          </div>

                          <div
                            style={{
                              fontWeight:
                                800,
                              marginTop:
                                3,
                            }}
                          >
                            {formatMoney(
                              total
                            )}
                          </div>
                        </div>

                        <div>
                          <div
                            style={{
                              fontSize:
                                11,
                              color:
                                "#6b7280",
                            }}
                          >
                            Paid
                          </div>

                          <div
                            style={{
                              fontWeight:
                                800,
                              marginTop:
                                3,
                              color:
                                "#166534",
                            }}
                          >
                            {formatMoney(
                              advance
                            )}
                          </div>
                        </div>

                        <div>
                          <div
                            style={{
                              fontSize:
                                11,
                              color:
                                "#6b7280",
                            }}
                          >
                            Pending
                          </div>

                          <div
                            style={{
                              fontWeight:
                                800,
                              marginTop:
                                3,
                              color:
                                pending >
                                0
                                  ? "#dc2626"
                                  : "#166534",
                            }}
                          >
                            {formatMoney(
                              pending
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {wedding.notes && (
                      <div
                        style={{
                          marginTop:
                            15,
                          padding: 11,
                          background:
                            "#fff7ed",
                          borderRadius:
                            10,
                          fontSize:
                            13,
                          color:
                            "#7c2d12",
                        }}
                      >
                        <strong>
                          📝 Notes:
                        </strong>{" "}
                        {
                          wedding.notes
                        }
                      </div>
                    )}

                    <div
                      style={{
                        display:
                          "flex",
                        gap: 9,
                        marginTop:
                          18,
                      }}
                    >
                      <button
                        onClick={() =>
                          editWedding(
                            wedding
                          )
                        }
                        style={{
                          flex: 1,
                          border:
                            "none",
                          background:
                            "#eef2ff",
                          color:
                            "#3730a3",
                          padding:
                            "10px 12px",
                          borderRadius:
                            10,
                          cursor:
                            "pointer",
                          fontWeight:
                            800,
                        }}
                      >
                        ✏️ Edit
                      </button>

                      <button
                        onClick={() =>
                          deleteWedding(
                            wedding.id
                          )
                        }
                        style={{
                          flex: 1,
                          border:
                            "none",
                          background:
                            "#fee2e2",
                          color:
                            "#991b1b",
                          padding:
                            "10px 12px",
                          borderRadius:
                            10,
                          cursor:
                            "pointer",
                          fontWeight:
                            800,
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>

      {showForm && (
        <div
          style={{
            position:
              "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.55)",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding: 20,
            zIndex:
              9999,
            overflowY:
              "auto",
          }}
        >
          <div
            style={{
              width:
                "100%",
              maxWidth:
                850,
              background:
                "white",
              borderRadius:
                20,
              padding: 24,
              margin:
                "20px 0",
            }}
          >
            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                gap: 10,
                marginBottom:
                  22,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize:
                      24,
                  }}
                >
                  {editingId
                    ? "✏️ Edit Event"
                    : "📅 Add Event"}
                </h2>

                <p
                  style={{
                    margin:
                      "5px 0 0",
                    color:
                      "#6b7280",
                    fontSize:
                      13,
                  }}
                >
                  Event ની સંપૂર્ણ
                  details અહીં
                  નાખો.
                </p>
              </div>

              <button
                onClick={
                  closeForm
                }
                style={{
                  border:
                    "none",
                  background:
                    "#f3f4f6",
                  width: 38,
                  height: 38,
                  borderRadius:
                    10,
                  cursor:
                    "pointer",
                  fontSize:
                    18,
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: 15,
              }}
            >
              <div
                style={{
                  gridColumn:
                    "1 / -1",
                }}
              >
                <label
                  style={{
                    display:
                      "block",
                    fontWeight:
                      700,
                    fontSize:
                      13,
                    marginBottom:
                      7,
                  }}
                >
                  Client
                </label>

                <select
                  value={
                    clientId
                  }
                  onChange={(
                    e
                  ) =>
                    handleClientChange(
                      e.target
                        .value
                    )
                  }
                  style={{
                    width:
                      "100%",
                    padding:
                      "12px 13px",
                    border:
                      "1px solid #d1d5db",
                    borderRadius:
                      10,
                    background:
                      "white",
                  }}
                >
                  <option value="">
                    Select Client
                  </option>

                  {clients.map(
                    (
                      client
                    ) => (
                      <option
                        key={
                          client.id
                        }
                        value={
                          client.id
                        }
                      >
                        {client.clientName ||
                          "Unnamed Client"}
                        {client.mobile
                          ? ` - ${client.mobile}`
                          : ""}
                      </option>
                    )
                  )}
                </select>
              </div>

              <FormInput
                label="Event Name *"
                value={
                  eventName
                }
                onChange={
                  setEventName
                }
                placeholder="Pruthvi Wedding"
              />

              <div>
                <label
                  style={{
                    display:
                      "block",
                    fontWeight:
                      700,
                    fontSize:
                      13,
                    marginBottom:
                      7,
                  }}
                >
                  Event Type
                </label>

                <select
                  value={
                    eventType
                  }
                  onChange={(
                    e
                  ) =>
                    setEventType(
                      e.target
                        .value
                    )
                  }
                  style={{
                    width:
                      "100%",
                    padding:
                      "12px 13px",
                    border:
                      "1px solid #d1d5db",
                    borderRadius:
                      10,
                    background:
                      "white",
                  }}
                >
                  {eventTypes.map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item
                        }
                        value={
                          item
                        }
                      >
                        {
                          item
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <FormInput
                label="Bride Name"
                value={
                  brideName
                }
                onChange={
                  setBrideName
                }
                placeholder="Bride Name"
              />

              <FormInput
                label="Groom Name"
                value={
                  groomName
                }
                onChange={
                  setGroomName
                }
                placeholder="Groom Name"
              />

              <div>
                <label
                  style={{
                    display:
                      "block",
                    fontWeight:
                      700,
                    fontSize:
                      13,
                    marginBottom:
                      7,
                  }}
                >
                  Event Start Date *
                </label>

                <input
                  type="date"
                  value={
                    eventStartDate
                  }
                  onChange={(
                    e
                  ) =>
                    setEventStartDate(
                      e.target
                        .value
                    )
                  }
                  style={{
                    width:
                      "100%",
                    boxSizing:
                      "border-box",
                    padding:
                      "12px 13px",
                    border:
                      "1px solid #d1d5db",
                    borderRadius:
                      10,
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display:
                      "block",
                    fontWeight:
                      700,
                    fontSize:
                      13,
                    marginBottom:
                      7,
                  }}
                >
                  Event End Date
                </label>

                <input
                  type="date"
                  value={
                    eventEndDate
                  }
                  min={
                    eventStartDate ||
                    undefined
                  }
                  onChange={(
                    e
                  ) =>
                    setEventEndDate(
                      e.target
                        .value
                    )
                  }
                  style={{
                    width:
                      "100%",
                    boxSizing:
                      "border-box",
                    padding:
                      "12px 13px",
                    border:
                      "1px solid #d1d5db",
                    borderRadius:
                      10,
                  }}
                />

                {duration && (
                  <div
                    style={{
                      marginTop:
                        6,
                      fontSize:
                        12,
                      color:
                        "#2563eb",
                      fontWeight:
                        700,
                    }}
                  >
                    Duration:{" "}
                    {
                      duration
                    }
                  </div>
                )}
              </div>

              <FormInput
                label="Venue"
                value={
                  venue
                }
                onChange={
                  setVenue
                }
                placeholder="Venue / Location"
              />

              <FormInput
                label="Package"
                value={
                  packageName
                }
                onChange={
                  setPackageName
                }
                placeholder="Premium Package"
              />

              <FormInput
                label="Total Amount"
                value={
                  totalAmount
                }
                onChange={
                  setTotalAmount
                }
                placeholder="50000"
                type="number"
              />

              <FormInput
                label="Advance / Paid"
                value={
                  advancePaid
                }
                onChange={
                  setAdvancePaid
                }
                placeholder="10000"
                type="number"
              />

              <div
                style={{
                  gridColumn:
                    "1 / -1",
                  padding: 13,
                  background:
                    "#f9fafb",
                  borderRadius:
                    10,
                }}
              >
                <strong>
                  Pending Payment:
                </strong>{" "}
                <span
                  style={{
                    color:
                      remainingAmount >
                      0
                        ? "#dc2626"
                        : "#166534",
                    fontWeight:
                      800,
                  }}
                >
                  {formatMoney(
                    remainingAmount
                  )}
                </span>
              </div>

              <div>
                <label
                  style={{
                    display:
                      "block",
                    fontWeight:
                      700,
                    fontSize:
                      13,
                    marginBottom:
                      7,
                  }}
                >
                  Status
                </label>

                <select
                  value={
                    status
                  }
                  onChange={(
                    e
                  ) =>
                    setStatus(
                      e.target
                        .value
                    )
                  }
                  style={{
                    width:
                      "100%",
                    padding:
                      "12px 13px",
                    border:
                      "1px solid #d1d5db",
                    borderRadius:
                      10,
                    background:
                      "white",
                  }}
                >
                  {statusOptions.map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item
                        }
                        value={
                          item
                        }
                      >
                        {
                          item
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <FormInput
                label="Notes"
                value={
                  notes
                }
                onChange={
                  setNotes
                }
                placeholder="Any special instructions..."
              />

              <div
                style={{
                  gridColumn:
                    "1 / -1",
                }}
              >
                <label
                  style={{
                    display:
                      "block",
                    fontWeight:
                      800,
                    fontSize:
                      14,
                    marginBottom:
                      10,
                  }}
                >
                  🎬 Services
                </label>

                <div
                  style={{
                    display:
                      "flex",
                    flexWrap:
                      "wrap",
                    gap: 8,
                  }}
                >
                  {serviceOptions.map(
                    (
                      service
                    ) => {
                      const active =
                        services.includes(
                          service
                        );

                      return (
                        <button
                          key={
                            service
                          }
                          type="button"
                          onClick={() =>
                            toggleService(
                              service
                            )
                          }
                          style={{
                            border:
                              active
                                ? "2px solid #111827"
                                : "1px solid #d1d5db",
                            background:
                              active
                                ? "#111827"
                                : "white",
                            color:
                              active
                                ? "white"
                                : "#374151",
                            padding:
                              "8px 11px",
                            borderRadius:
                              9,
                            cursor:
                              "pointer",
                            fontSize:
                              12,
                            fontWeight:
                              700,
                          }}
                        >
                          {active
                            ? "✓ "
                            : ""}
                          {
                            service
                          }
                        </button>
                      );
                    }
                  )}
                </div>

                {services.length >
                  0 && (
                  <div
                    style={{
                      marginTop:
                        10,
                      fontSize:
                        12,
                      color:
                        "#6b7280",
                    }}
                  >
                    Selected:{" "}
                    {services.join(
                      ", "
                    )}
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                display:
                  "flex",
                gap: 10,
                justifyContent:
                  "flex-end",
                marginTop:
                  25,
                paddingTop:
                  18,
                borderTop:
                  "1px solid #e5e7eb",
              }}
            >
              <button
                onClick={
                  closeForm
                }
                disabled={
                  saving
                }
                style={{
                  border:
                    "1px solid #d1d5db",
                  background:
                    "white",
                  color:
                    "#374151",
                  padding:
                    "12px 18px",
                  borderRadius:
                    10,
                  cursor:
                    saving
                      ? "not-allowed"
                      : "pointer",
                  fontWeight:
                    700,
                }}
              >
                Cancel
              </button>

              <button
                onClick={
                  saveWedding
                }
                disabled={
                  saving
                }
                style={{
                  border:
                    "none",
                  background:
                    "#111827",
                  color:
                    "white",
                  padding:
                    "12px 20px",
                  borderRadius:
                    10,
                  cursor:
                    saving
                      ? "not-allowed"
                      : "pointer",
                  fontWeight:
                    800,
                }}
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Event"
                  : "Save Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div
      style={{
        background:
          "white",
        padding: 18,
        borderRadius:
          16,
        boxShadow:
          "0 4px 18px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          color:
            "#6b7280",
          fontSize:
            13,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize:
            28,
          fontWeight:
            800,
          marginTop:
            5,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label
        style={{
          display:
            "block",
          fontWeight:
            700,
          fontSize:
            13,
          marginBottom:
            7,
        }}
      >
        {label}
      </label>

      <input
        type={type}
        min={
          type ===
          "number"
            ? "0"
            : undefined
        }
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        placeholder={
          placeholder
        }
        style={{
          width:
            "100%",
          boxSizing:
            "border-box",
          padding:
            "12px 13px",
          border:
            "1px solid #d1d5db",
          borderRadius:
            10,
        }}
      />
    </div>
  );
}