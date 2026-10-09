
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  padding: "12px",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  fontSize: "16px",
  background: "#fff",
  color: "#111827",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "7px",
  fontSize: "13px",
  fontWeight: 700,
  color: "#374151",
};

const primaryButton: React.CSSProperties = {
  border: "none",
  background: "#4f46e5",
  color: "#fff",
  padding: "12px 16px",
  borderRadius: "10px",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "14px",
};

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
    <div style={{ minWidth: 0 }}>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
        min={type === "number" ? 0 : undefined}
      />
    </div>
  );
}

export default function ClientsPage() {
  const [userId, setUserId] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
        setUserId("");
        window.location.href = "/login";
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (userId) {
      void loadClients();
    }
    // loadClients is intentionally triggered when the signed-in studio changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function loadClients() {
    if (!userId) return;

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
      alert("Clients load કરવામાં error આવ્યો. Internet તપાસો.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
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
  }

  function editClient(client: Client) {
    setEditingId(client.id);
    setClientName(client.clientName || "");
    setMobile(client.mobile || "");
    setEventName(client.eventName || "");
    setBrideName(client.brideName || "");
    setGroomName(client.groomName || "");
    setEventStartDate(client.eventStartDate || client.weddingDate || "");
    setEventEndDate(client.eventEndDate || "");
    setVenue(client.venue || "");
    setPackageName(client.packageName || "");
    setTotalAmount(String(client.totalAmount ?? ""));
    setAdvancePaid(String(client.advancePaid ?? ""));
    setNotes(client.notes || "");
    setShowForm(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveClient() {
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

    if (!eventStartDate || !eventEndDate) {
      alert("Event Start Date અને End Date પસંદ કરો.");
      return;
    }

    if (eventEndDate < eventStartDate) {
      alert("End Date, Start Date કરતાં પહેલાં હોઈ શકે નહીં.");
      return;
    }

    const total = Number(totalAmount || 0);
    const advance = Number(advancePaid || 0);

    if (
      !Number.isFinite(total) ||
      !Number.isFinite(advance) ||
      total < 0 ||
      advance < 0
    ) {
      alert("Amount સાચી રીતે નાખો.");
      return;
    }

    if (advance > total) {
      alert("Advance Total Amount કરતાં વધારે ન હોઈ શકે.");
      return;
    }

    const remaining = Math.max(0, total - advance);

    try {
      setSaving(true);

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
        // Do not allow editing a client belonging to another studio.
        const existing = clients.find((item) => item.id === editingId);

        if (!existing || existing.studioId !== userId) {
          alert("આ Client તમારા Studioનો નથી.");
          return;
        }

        await setDoc(doc(db, "clients", editingId), clientData, {
          merge: true,
        });
      } else {
        const newClient = doc(collection(db, "clients"));

        await setDoc(newClient, {
          ...clientData,
          createdAt: new Date(),
        });
      }

      alert(editingId ? "Client updated successfully." : "Client added successfully.");

      resetForm();
      await loadClients();
    } catch (error) {
      console.error("Save client error:", error);
      alert("Client save કરવામાં error આવ્યો.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteClient(client: Client) {
    if (client.studioId !== userId) {
      alert("આ Client તમારા Studioનો નથી.");
      return;
    }

    const confirmed = window.confirm(
      `${client.clientName || "આ Client"} delete કરવો છે?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(client.id);

      await deleteDoc(doc(db, "clients", client.id));

      setClients((previous) =>
        previous.filter((item) => item.id !== client.id)
      );

      alert("Client deleted successfully.");
    } catch (error) {
      console.error("Delete client error:", error);
      alert("Client delete કરવામાં error આવ્યો.");
    } finally {
      setDeletingId(null);
    }
  }

  const duration = useMemo(() => {
    if (!eventStartDate || !eventEndDate) return "";

    const start = new Date(`${eventStartDate}T00:00:00`);
    const end = new Date(`${eventEndDate}T00:00:00`);

    const days =
      Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;

    if (days <= 0) return "";

    return `${days} Day${days > 1 ? "s" : ""}`;
  }, [eventStartDate, eventEndDate]);

  const filteredClients = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    if (!searchText) return clients;

    return clients.filter((client) => {
      const searchable = [
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

      return searchable.includes(searchText);
    });
  }, [clients, search]);

  function formatDate(value?: string) {
    if (!value) return "-";

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function money(value?: number) {
    return `₹${Number(value || 0).toLocaleString("en-IN")}`;
  }

  if (authLoading) {
    return (
      <main style={centeredStyle}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 30 }}>⏳</div>
          <p>Loading WedFlow...</p>
        </div>
      </main>
    );
  }

  if (!userId) return null;

  const totalRevenue = clients.reduce(
    (sum, client) => sum + Number(client.totalAmount || 0),
    0
  );

  const totalPending = clients.reduce(
    (sum, client) =>
      sum +
      Math.max(
        0,
        Number(client.totalAmount || 0) -
          Number(client.advancePaid || 0)
      ),
    0
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f5fb",
        padding: "clamp(12px, 3vw, 28px)",
        fontFamily: "Arial, sans-serif",
        color: "#111827",
        overflowX: "hidden",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 22,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <a
              href="/"
              style={{
                color: "#4f46e5",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              ← WedFlow Dashboard
            </a>

            <h1
              style={{
                margin: "8px 0 4px",
                fontSize: "clamp(25px, 5vw, 34px)",
                lineHeight: 1.2,
              }}
            >
              👥 Clients
            </h1>

            <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
              Manage your studio clients
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            style={primaryButton}
          >
            ➕ Add Client
          </button>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <SummaryCard label="Total Clients" value={String(clients.length)} icon="👥" />
          <SummaryCard label="Total Revenue" value={money(totalRevenue)} icon="💰" />
          <SummaryCard label="Pending Amount" value={money(totalPending)} icon="⏳" />
        </section>

        <section
          style={{
            background: "#fff",
            padding: 12,
            borderRadius: 14,
            marginBottom: 18,
            border: "1px solid #e5e7eb",
            boxShadow: "0 2px 8px rgba(15,23,42,0.03)",
          }}
        >
          <label style={labelStyle}>🔍 Search Clients</label>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, mobile, event, venue..."
            style={inputStyle}
          />
          <p style={{ margin: "8px 2px 0", color: "#6b7280", fontSize: 12 }}>
            Showing {filteredClients.length} of {clients.length} clients
          </p>
        </section>

        {showForm && (
          <section
            style={{
              background: "#fff",
              padding: "clamp(14px, 3vw, 24px)",
              borderRadius: 16,
              marginBottom: 22,
              border: "1px solid #e5e7eb",
              boxShadow: "0 4px 16px rgba(15,23,42,0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 20 }}>
                {editingId ? "✏️ Edit Client" : "➕ Add Client"}
              </h2>

              <button
                type="button"
                onClick={resetForm}
                style={{
                  border: 0,
                  background: "#f3f4f6",
                  padding: "10px 12px",
                  borderRadius: 9,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                ✕ Close
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 230px), 1fr))",
                gap: 15,
              }}
            >
              <InputField label="👤 Client Name *" value={clientName} setValue={setClientName} placeholder="Client Name" />
              <InputField label="📱 Mobile Number *" value={mobile} setValue={setMobile} placeholder="Mobile Number" type="tel" />
              <InputField label="📌 Event Name *" value={eventName} setValue={setEventName} placeholder="Wedding / Engagement / Pre-Wedding" />
              <InputField label="👰 Bride Name" value={brideName} setValue={setBrideName} placeholder="Bride Name" />
              <InputField label="🤵 Groom Name" value={groomName} setValue={setGroomName} placeholder="Groom Name" />
              <InputField label="📅 Event Start Date *" value={eventStartDate} setValue={setEventStartDate} type="date" />
              <InputField label="📅 Event End Date *" value={eventEndDate} setValue={setEventEndDate} type="date" />

              <div>
                <label style={labelStyle}>⏱ Event Duration</label>
                <input value={duration} readOnly placeholder="Automatic" style={{ ...inputStyle, background: "#f9fafb" }} />
              </div>

              <InputField label="📍 Venue" value={venue} setValue={setVenue} placeholder="Venue" />
              <InputField label="📦 Package" value={packageName} setValue={setPackageName} placeholder="Package Name" />
              <InputField label="💰 Total Amount" value={totalAmount} setValue={setTotalAmount} type="number" placeholder="0" />
              <InputField label="💵 Advance Paid" value={advancePaid} setValue={setAdvancePaid} type="number" placeholder="0" />

              <div>
                <label style={labelStyle}>⏳ Pending Amount</label>
                <input
                  readOnly
                  value={money(Math.max(0, Number(totalAmount || 0) - Number(advancePaid || 0)))}
                  style={{ ...inputStyle, background: "#f9fafb", fontWeight: 700 }}
                />
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={labelStyle}>📝 Notes</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                placeholder="Any important notes..."
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 20,
              }}
            >
              <button
                type="button"
                onClick={saveClient}
                disabled={saving}
                style={{
                  ...primaryButton,
                  background: "#16a34a",
                  flex: "1 1 150px",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Saving..." : `💾 ${editingId ? "Update Client" : "Save Client"}`}
              </button>

              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                style={{
                  ...primaryButton,
                  background: "#e5e7eb",
                  color: "#374151",
                  flex: "1 1 100px",
                }}
              >
                Cancel
              </button>
            </div>
          </section>
        )}

        {loading ? (
          <div style={emptyStyle}>
            <div style={{ fontSize: 30 }}>⏳</div>
            <p>Loading clients...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div style={emptyStyle}>
            <div style={{ fontSize: 42 }}>👥</div>
            <h3 style={{ marginBottom: 6 }}>
              {search ? "No Matching Clients" : "No Clients Found"}
            </h3>
            <p style={{ color: "#6b7280", marginTop: 0 }}>
              {search
                ? "Try another name, mobile number or event."
                : "Add your first client to get started."}
            </p>
            {!search && (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                style={primaryButton}
              >
                ➕ Add First Client
              </button>
            )}
          </div>
        ) : (
          <section
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
              gap: 15,
            }}
          >
            {filteredClients.map((client) => {
              const total = Number(client.totalAmount || 0);
              const paid = Number(client.advancePaid || 0);
              const pending = Math.max(0, total - paid);
              const startDate = client.eventStartDate || client.weddingDate || "";

              return (
                <article
                  key={client.id}
                  style={{
                    minWidth: 0,
                    background: "#fff",
                    borderRadius: 16,
                    padding: "clamp(14px, 3vw, 20px)",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 3px 12px rgba(15,23,42,0.04)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 19,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {client.clientName || "Unnamed Client"}
                      </h3>
                      <p
                        style={{
                          margin: "7px 0 0",
                          color: "#4f46e5",
                          fontWeight: 700,
                          fontSize: 14,
                          overflowWrap: "anywhere",
                        }}
                      >
                        📌 {client.eventName || "Event"}
                      </p>
                    </div>

                    <span
                      style={{
                        flexShrink: 0,
                        maxWidth: "45%",
                        overflowWrap: "anywhere",
                        fontSize: 11,
                        padding: "6px 9px",
                        borderRadius: 20,
                        fontWeight: 700,
                        background: pending > 0 ? "#fee2e2" : "#dcfce7",
                        color: pending > 0 ? "#b91c1c" : "#166534",
                      }}
                    >
                      {pending > 0 ? "Payment Pending" : "Paid"}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 16,
                      display: "grid",
                      gap: 10,
                      fontSize: 14,
                      color: "#374151",
                    }}
                  >
                    <InfoRow icon="📱" text={client.mobile || "-"} />
                    {(client.brideName || client.groomName) && (
                      <InfoRow
                        icon="💑"
                        text={`${client.brideName || "-"} & ${client.groomName || "-"}`}
                      />
                    )}
                    <InfoRow
                      icon="📅"
                      text={`${formatDate(startDate)}${client.eventEndDate ? ` → ${formatDate(client.eventEndDate)}` : ""}`}
                    />
                    {client.venue && <InfoRow icon="📍" text={client.venue} />}
                    {client.packageName && <InfoRow icon="📦" text={client.packageName} />}
                  </div>

                  <div
                    style={{
                      marginTop: 17,
                      padding: "12px 8px",
                      background: "#f8fafc",
                      border: "1px solid #eef2f7",
                      borderRadius: 12,
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: 5,
                      textAlign: "center",
                    }}
                  >
                    <MoneyCell label="Total" amount={money(total)} />
                    <MoneyCell label="Paid" amount={money(paid)} color="#16a34a" />
                    <MoneyCell
                      label="Pending"
                      amount={money(pending)}
                      color={pending > 0 ? "#dc2626" : "#16a34a"}
                    />
                  </div>

                  {client.notes && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 11,
                        background: "#fffbeb",
                        borderRadius: 10,
                        fontSize: 13,
                        color: "#92400e",
                        overflowWrap: "anywhere",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      📝 {client.notes}
                    </div>
                  )}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: 7,
                      marginTop: 16,
                    }}
                  >
                    <ActionButton
                      label="👁 View"
                      color="#2563eb"
                      onClick={() => {
                        window.location.href = `/clients/${client.id}`;
                      }}
                    />
                    <ActionButton
                      label="✏️ Edit"
                      color="#d97706"
                      onClick={() => editClient(client)}
                    />
                    <ActionButton
                      label={deletingId === client.id ? "..." : "🗑 Delete"}
                      color="#dc2626"
                      disabled={deletingId === client.id}
                      onClick={() => void deleteClient(client)}
                    />
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <footer
          style={{
            padding: "28px 0 12px",
            textAlign: "center",
            color: "#9ca3af",
            fontSize: 12,
          }}
        >
          WedFlow · Wedding Studio Management
        </footer>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        padding: 16,
        borderRadius: 14,
        border: "1px solid #e5e7eb",
        background: "#fff",
        boxShadow: "0 2px 8px rgba(15,23,42,0.03)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span style={{ color: "#6b7280", fontSize: 13 }}>{label}</span>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div
        style={{
          marginTop: 10,
          fontSize: "clamp(19px, 4vw, 25px)",
          fontWeight: 800,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        overflowWrap: "anywhere",
        minWidth: 0,
      }}
    >
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{text}</span>
    </div>
  );
}

function MoneyCell({
  label,
  amount,
  color = "#111827",
}: {
  label: string;
  amount: string;
  color?: string;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 5 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: "clamp(10px, 2.6vw, 14px)",
          fontWeight: 800,
          color,
          overflowWrap: "anywhere",
        }}
      >
        {amount}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  color,
  onClick,
  disabled = false,
}: {
  label: string;
  color: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        minWidth: 0,
        border: "none",
        background: color,
        color: "#fff",
        padding: "11px 4px",
        borderRadius: 9,
        cursor: disabled ? "wait" : "pointer",
        fontSize: 12,
        fontWeight: 700,
        overflowWrap: "anywhere",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );
}

const centeredStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontFamily: "Arial, sans-serif",
  background: "#f3f5fb",
  color: "#374151",
};

const emptyStyle: React.CSSProperties = {
  background: "#fff",
  padding: "36px 18px",
  borderRadius: 14,
  textAlign: "center",
  border: "1px solid #e5e7eb",
};