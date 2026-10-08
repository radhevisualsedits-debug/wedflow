"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
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
  weddingDate?: string;

  venue?: string;
  packageName?: string;

  totalAmount?: number;
  advancePaid?: number;
  remainingAmount?: number;

  notes?: string;

  createdAt?: any;
  updatedAt?: any;
};

export default function ClientsPage() {
  const [userId, setUserId] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [clientName, setClientName] = useState("");
  const [mobile, setMobile] = useState("");

  const [eventName, setEventName] = useState("");
  const [brideName, setBrideName] = useState("");
  const [groomName, setGroomName] = useState("");

  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");

  const [venue, setVenue] = useState("");
  const [packageName, setPackageName] = useState("");

  const [totalAmount, setTotalAmount] = useState("");
  const [advancePaid, setAdvancePaid] = useState("");

  const [notes, setNotes] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        window.location.href = "/login";
      }

      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (userId) {
      loadClients();
    }
  }, [userId]);

  const loadClients = async () => {
    try {
      setLoading(true);

      const clientsQuery = query(
        collection(db, "clients"),
        where("studioId", "==", userId)
      );

      const snapshot = await getDocs(clientsQuery);

      const list: Client[] = snapshot.docs.map((item) => ({
        ...(item.data() as Client),
        id: item.id,
      }));

      list.sort((a, b) => {
        const aTime = a.updatedAt?.seconds || 0;
        const bTime = b.updatedAt?.seconds || 0;

        return bTime - aTime;
      });

      setClients(list);
    } catch (error) {
      console.error("Load clients error:", error);
      alert("Clients load કરવામાં error આવ્યો.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);

    setClientName("");
    setMobile("");

    setEventName("");
    setBrideName("");
    setGroomName("");

    setEventStartDate("");
    setEventEndDate("");

    setVenue("");
    setPackageName("");

    setTotalAmount("");
    setAdvancePaid("");

    setNotes("");

    setShowForm(false);
  };

  const editClient = (client: Client) => {
    setEditingId(client.id);

    setClientName(client.clientName || "");
    setMobile(client.mobile || "");

    setEventName(client.eventName || "");
    setBrideName(client.brideName || "");
    setGroomName(client.groomName || "");

    setEventStartDate(
      client.eventStartDate || client.weddingDate || ""
    );

    setEventEndDate(client.eventEndDate || "");

    setVenue(client.venue || "");
    setPackageName(client.packageName || "");

    setTotalAmount(String(client.totalAmount || ""));
    setAdvancePaid(String(client.advancePaid || ""));

    setNotes(client.notes || "");

    setShowForm(true);
  };

  const saveClient = async () => {
    if (!userId) {
      alert("Please login first.");
      return;
    }

    if (!clientName.trim()) {
      alert("Client Name નાખો.");
      return;
    }

    if (!mobile.trim()) {
      alert("Mobile Number નાખો.");
      return;
    }

    if (!eventName.trim()) {
      alert("Event Name નાખો.");
      return;
    }

    if (!eventStartDate) {
      alert("Event Start Date પસંદ કરો.");
      return;
    }

    if (!eventEndDate) {
      alert("Event End Date પસંદ કરો.");
      return;
    }

    if (eventEndDate < eventStartDate) {
      alert("End Date, Start Date કરતાં પહેલાં હોઈ શકે નહીં.");
      return;
    }

    const total = Number(totalAmount || 0);
    const advance = Number(advancePaid || 0);

    if (total < 0 || advance < 0) {
      alert("Amount સાચી રીતે નાખો.");
      return;
    }

    if (advance > total) {
      alert("Advance Total Amount કરતાં વધારે ન હોઈ શકે.");
      return;
    }

    const remaining = Math.max(0, total - advance);

    try {
      const clientData = {
        studioId: userId,

        clientName: clientName.trim(),
        mobile: mobile.trim(),

        eventName: eventName.trim(),
        brideName: brideName.trim(),
        groomName: groomName.trim(),

        eventStartDate,
        eventEndDate,

        weddingDate: eventStartDate,

        venue: venue.trim(),
        packageName: packageName.trim(),

        totalAmount: total,
        advancePaid: advance,
        remainingAmount: remaining,

        notes: notes.trim(),

        updatedAt: new Date(),
      };

      if (editingId) {
        await setDoc(
          doc(db, "clients", editingId),
          clientData,
          { merge: true }
        );
      } else {
        const newClient = doc(collection(db, "clients"));

        await setDoc(newClient, {
          ...clientData,
          createdAt: new Date(),
        });
      }

      alert(
        editingId
          ? "Client updated successfully."
          : "Client added successfully."
      );

      resetForm();
      await loadClients();
    } catch (error) {
      console.error("Save client error:", error);
      alert("Client save કરવામાં error આવ્યો.");
    }
  };

  const deleteClient = async (client: Client) => {
    if (client.studioId !== userId) {
      alert("આ Client તમારા Studioનો નથી.");
      return;
    }

    const confirmDelete = window.confirm(
      `${client.clientName || "આ Client"} delete કરવો છે?`
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await deleteDoc(doc(db, "clients", client.id));

      setClients((prev) =>
        prev.filter((item) => item.id !== client.id)
      );

      alert("Client deleted successfully.");
    } catch (error) {
      console.error("Delete client error:", error);
      alert("Client delete કરવામાં error આવ્યો.");
    }
  };

  const duration = useMemo(() => {
    if (!eventStartDate || !eventEndDate) {
      return "";
    }

    const start = new Date(eventStartDate);
    const end = new Date(eventEndDate);

    const difference =
      Math.floor(
        (end.getTime() - start.getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1;

    if (difference <= 0) {
      return "";
    }

    return `${difference} Day${difference > 1 ? "s" : ""}`;
  }, [eventStartDate, eventEndDate]);

  const filteredClients = useMemo(() => {
    const queryText = search.toLowerCase().trim();

    if (!queryText) {
      return clients;
    }

    return clients.filter((client) => {
      const text = [
        client.clientName,
        client.mobile,
        client.eventName,
        client.brideName,
        client.groomName,
        client.venue,
        client.packageName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(queryText);
    });
  }, [clients, search]);

  const formatDate = (date?: string) => {
    if (!date) {
      return "-";
    }

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return date;
    }

    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const money = (amount?: number) => {
    return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
  };

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "24px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            gap: "15px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "28px",
                color: "#111827",
              }}
            >
              👥 Clients
            </h1>

            <p
              style={{
                margin: "6px 0 0",
                color: "#6b7280",
              }}
            >
              Manage your studio clients
            </p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            style={{
              border: "none",
              background: "#111827",
              color: "#fff",
              padding: "12px 18px",
              borderRadius: "10px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ➕ Add Client
          </button>
        </div>

        <div
          style={{
            background: "#fff",
            padding: "14px",
            borderRadius: "12px",
            marginBottom: "20px",
            border: "1px solid #e5e7eb",
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search client, mobile, event..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px",
              border: "1px solid #d1d5db",
              borderRadius: "9px",
              fontSize: "14px",
            }}
          />
        </div>

        {showForm && (
          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "14px",
              marginBottom: "20px",
              border: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "18px",
              }}
            >
              <h2 style={{ margin: 0 }}>
                {editingId ? "✏️ Edit Client" : "➕ Add Client"}
              </h2>

              <button
                onClick={resetForm}
                style={{
                  border: "none",
                  background: "#f3f4f6",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                ✕ Close
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "14px",
              }}
            >
              <InputField
                label="👤 Client Name *"
                value={clientName}
                setValue={setClientName}
                placeholder="Client Name"
              />

              <InputField
                label="📱 Mobile Number *"
                value={mobile}
                setValue={setMobile}
                placeholder="Mobile Number"
              />

              <InputField
                label="📌 Event Name *"
                value={eventName}
                setValue={setEventName}
                placeholder="Wedding / Engagement / Pre-Wedding"
              />

              <InputField
                label="👰 Bride Name"
                value={brideName}
                setValue={setBrideName}
                placeholder="Bride Name"
              />

              <InputField
                label="🤵 Groom Name"
                value={groomName}
                setValue={setGroomName}
                placeholder="Groom Name"
              />

              <InputField
                label="📅 Event Start Date *"
                value={eventStartDate}
                setValue={setEventStartDate}
                type="date"
              />

              <InputField
                label="📅 Event End Date *"
                value={eventEndDate}
                setValue={setEventEndDate}
                type="date"
              />

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  ⏱ Event Duration
                </label>

                <input
                  value={duration}
                  readOnly
                  placeholder="Automatic"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px",
                    border: "1px solid #d1d5db",
                    borderRadius: "9px",
                    background: "#f9fafb",
                  }}
                />
              </div>

              <InputField
                label="📍 Venue"
                value={venue}
                setValue={setVenue}
                placeholder="Venue"
              />

              <InputField
                label="📦 Package"
                value={packageName}
                setValue={setPackageName}
                placeholder="Package"
              />

              <InputField
                label="💰 Total Amount"
                value={totalAmount}
                setValue={setTotalAmount}
                type="number"
                placeholder="0"
              />

              <InputField
                label="💵 Advance Paid"
                value={advancePaid}
                setValue={setAdvancePaid}
                type="number"
                placeholder="0"
              />

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  ⏳ Pending Amount
                </label>

                <input
                  value={money(
                    Math.max(
                      0,
                      Number(totalAmount || 0) -
                        Number(advancePaid || 0)
                    )
                  )}
                  readOnly
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px",
                    border: "1px solid #d1d5db",
                    borderRadius: "9px",
                    background: "#f9fafb",
                    fontWeight: 700,
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: "15px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              >
                📝 Notes
              </label>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Any important notes..."
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "9px",
                  resize: "vertical",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "18px",
              }}
            >
              <button
                onClick={saveClient}
                style={{
                  border: "none",
                  background: "#16a34a",
                  color: "#fff",
                  padding: "12px 20px",
                  borderRadius: "9px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                💾 {editingId ? "Update Client" : "Save Client"}
              </button>

              <button
                onClick={resetForm}
                style={{
                  border: "none",
                  background: "#e5e7eb",
                  padding: "12px 20px",
                  borderRadius: "9px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div
            style={{
              background: "#fff",
              padding: "30px",
              borderRadius: "12px",
              textAlign: "center",
            }}
          >
            Loading clients...
          </div>
        ) : filteredClients.length === 0 ? (
          <div
            style={{
              background: "#fff",
              padding: "40px 20px",
              borderRadius: "12px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "42px" }}>👥</div>

            <h3>No Clients Found</h3>

            <p style={{ color: "#6b7280" }}>
              Add your first client to get started.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "16px",
            }}
          >
            {filteredClients.map((client) => {
              const total = Number(client.totalAmount || 0);
              const paid = Number(client.advancePaid || 0);
              const pending = Math.max(0, total - paid);

              const startDate =
                client.eventStartDate ||
                client.weddingDate ||
                "";

              return (
                <div
                  key={client.id}
                  style={{
                    background: "#fff",
                    borderRadius: "14px",
                    padding: "18px",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "19px",
                        }}
                      >
                        {client.clientName || "Unnamed Client"}
                      </h3>

                      <div
                        style={{
                          marginTop: "5px",
                          color: "#2563eb",
                          fontWeight: 700,
                        }}
                      >
                        📌 {client.eventName || "Event"}
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: "12px",
                        padding: "6px 9px",
                        borderRadius: "20px",
                        fontWeight: 700,
                        background:
                          pending > 0
                            ? "#fee2e2"
                            : "#dcfce7",
                        color:
                          pending > 0
                            ? "#b91c1c"
                            : "#166534",
                      }}
                    >
                      {pending > 0 ? "Payment Pending" : "Paid"}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "14px",
                      display: "grid",
                      gap: "8px",
                      fontSize: "14px",
                      color: "#374151",
                    }}
                  >
                    <div>📱 {client.mobile || "-"}</div>

                    {(client.brideName ||
                      client.groomName) && (
                      <div>
                        👰 {client.brideName || "-"} ❤️ 🤵{" "}
                        {client.groomName || "-"}
                      </div>
                    )}

                    <div>
                      📅 {formatDate(startDate)}
                      {client.eventEndDate
                        ? ` → ${formatDate(client.eventEndDate)}`
                        : ""}
                    </div>

                    {client.venue && (
                      <div>📍 {client.venue}</div>
                    )}

                    {client.packageName && (
                      <div>📦 {client.packageName}</div>
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: "15px",
                      padding: "12px",
                      background: "#f9fafb",
                      borderRadius: "10px",
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(3, 1fr)",
                      gap: "8px",
                      textAlign: "center",
                    }}
                  >
                    <div>
                      <small>Total</small>
                      <div>
                        <strong>{money(total)}</strong>
                      </div>
                    </div>

                    <div>
                      <small>Paid</small>
                      <div>
                        <strong
                          style={{ color: "#16a34a" }}
                        >
                          {money(paid)}
                        </strong>
                      </div>
                    </div>

                    <div>
                      <small>Pending</small>
                      <div>
                        <strong
                          style={{
                            color:
                              pending > 0
                                ? "#dc2626"
                                : "#16a34a",
                          }}
                        >
                          {money(pending)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {client.notes && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "10px",
                        background: "#fffbeb",
                        borderRadius: "8px",
                        fontSize: "13px",
                        color: "#92400e",
                      }}
                    >
                      📝 {client.notes}
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      marginTop: "15px",
                    }}
                  >
                    <button
                      onClick={() =>
                        (window.location.href =
                          `/clients/${client.id}`)
                      }
                      style={{
                        flex: 1,
                        border: "none",
                        background: "#2563eb",
                        color: "#fff",
                        padding: "10px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      👁 View
                    </button>

                    <button
                      onClick={() => editClient(client)}
                      style={{
                        flex: 1,
                        border: "none",
                        background: "#f59e0b",
                        color: "#fff",
                        padding: "10px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      ✏️ Edit
                    </button>

                    <button
                      onClick={() => deleteClient(client)}
                      style={{
                        flex: 1,
                        border: "none",
                        background: "#dc2626",
                        color: "#fff",
                        padding: "10px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  setValue,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          marginBottom: "6px",
          fontSize: "13px",
          fontWeight: 700,
        }}
      >
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "11px",
          border: "1px solid #d1d5db",
          borderRadius: "9px",
          fontSize: "14px",
        }}
      />
    </div>
  );
}