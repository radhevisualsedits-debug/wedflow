
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
};

const serviceOptions = [
  "Photography", "Videography", "Pre-Wedding",
  "Wedding Reel", "Teaser", "Highlight",
  "Full Video", "Cinematic Film", "Album",
  "Photo Frame", "Drone", "Live Streaming",
  "Same Day Edit", "Invitation Video", "Traditional Video",
];

const eventTypes = [
  "Wedding", "Engagement", "Pre-Wedding",
  "Reception", "Birthday", "Anniversary", "Other",
];

const statusOptions = [
  "Booked", "Confirmed", "Pending", "Completed", "Cancelled",
];

const inputClass = "event-input";

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

  const a = new Date(start + "T00:00:00").getTime();
  const b = new Date(end + "T00:00:00").getTime();
  const days = Math.floor((b - a) / 86400000) + 1;

  if (!Number.isFinite(days) || days <= 0) return "";
  return `${days} ${days === 1 ? "Day" : "Days"}`;
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
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="event-field">
      <span className="event-label">{label}</span>
      <input
        className={inputClass}
        type={type}
        min={type === "number" ? "0" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function StatCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
  return (
    <div className="event-stat">
      <div className="event-stat-title">{title}</div>
      <div className="event-stat-value" style={{ color }}>{value}</div>
    </div>
  );
}

export default function EventsPage() {
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

  const duration = calculateDuration(eventStartDate, eventEndDate);
  const remainingAmount = Math.max(
    0,
    Number(totalAmount || 0) - Number(advancePaid || 0)
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

      const clientsQuery = query(
        collection(db, "clients"),
        where("studioId", "==", uid)
      );

      const eventsQuery = query(
        collection(db, "weddings"),
        where("studioId", "==", uid)
      );

      const [clientSnapshot, eventSnapshot] = await Promise.all([
        getDocs(clientsQuery),
        getDocs(eventsQuery),
      ]);

      const loadedClients: Client[] = clientSnapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as Omit<Client, "id">),
      }));

      const loadedEvents: Wedding[] = eventSnapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as Omit<Wedding, "id">),
      }));

      loadedClients.sort((a, b) =>
        String(a.clientName || "").localeCompare(String(b.clientName || ""))
      );

      loadedEvents.sort((a, b) =>
        String(a.eventStartDate || a.weddingDate || "9999-12-31").localeCompare(
          String(b.eventStartDate || b.weddingDate || "9999-12-31")
        )
      );

      setClients(loadedClients);
      setWeddings(loadedEvents);
    } catch (error: any) {
      console.error("Events loading error:", error);
      setErrorMessage(error?.message || "Events load થઈ શક્યા નથી.");
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
    const client = clients.find((item) => item.id === value);
    if (!client) return;

    setEventName(client.eventName || "");
    setBrideName(client.brideName || "");
    setGroomName(client.groomName || "");
    setEventStartDate(client.eventStartDate || "");
    setEventEndDate(client.eventEndDate || "");
    setVenue(client.venue || "");
    setPackageName(client.packageName || "");

    if (client.totalAmount != null) {
      setTotalAmount(String(client.totalAmount));
    }
    if (client.advancePaid != null) {
      setAdvancePaid(String(client.advancePaid));
    }
  }

  function toggleService(service: string) {
    setServices((current) =>
      current.includes(service)
        ? current.filter((item) => item !== service)
        : [...current, service]
    );
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
      alert("Event Start Date પસંદ કરો.");
      return;
    }

    if (eventEndDate && eventEndDate < eventStartDate) {
      alert("End Date, Start Date પહેલાં ન હોઈ શકે.");
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
      alert("Advance, Total Amount કરતાં વધારે ન હોઈ શકે.");
      return;
    }

    try {
      setSaving(true);

      const selectedClient = clients.find((item) => item.id === clientId);

      const weddingData = {
        studioId: userId,
        clientId: clientId || "",
        clientName: selectedClient?.clientName || "",
        eventName: eventName.trim(),
        eventType,
        brideName: brideName.trim(),
        groomName: groomName.trim(),
        eventStartDate,
        eventEndDate,
        weddingDate: eventStartDate,
        venue: venue.trim(),
        packageName: packageName.trim(),
        totalAmount: total,
        advancePaid: advance,
        status,
        notes: notes.trim(),
        services,
        updatedAt: new Date(),
      };

      if (editingId) {
        await updateDoc(doc(db, "weddings", editingId), weddingData);
      } else {
        await addDoc(collection(db, "weddings"), {
          ...weddingData,
          createdAt: new Date(),
        });
      }

      await loadData(userId);
      closeForm();
    } catch (error: any) {
      console.error("Event save error:", error);
      alert(
        `Event save કરવામાં error આવ્યો.\n${error?.message || "Unknown error"}`
      );
    } finally {
      setSaving(false);
    }
  }

  function editWedding(wedding: Wedding) {
    setEditingId(wedding.id);
    setClientId(wedding.clientId || "");
    setEventName(wedding.eventName || "");
    setEventType(wedding.eventType || "Wedding");
    setBrideName(wedding.brideName || "");
    setGroomName(wedding.groomName || "");
    setEventStartDate(wedding.eventStartDate || wedding.weddingDate || "");
    setEventEndDate(wedding.eventEndDate || "");
    setVenue(wedding.venue || "");
    setPackageName(wedding.packageName || "");
    setTotalAmount(String(wedding.totalAmount ?? ""));
    setAdvancePaid(String(wedding.advancePaid ?? ""));
    setStatus(wedding.status || "Booked");
    setNotes(wedding.notes || "");
    setServices(Array.isArray(wedding.services) ? wedding.services : []);
    setShowForm(true);
  }

  async function deleteWedding(wedding: Wedding) {
    if (wedding.studioId !== userId) {
      alert("આ Event તમારા Studio નો નથી.");
      return;
    }

    if (!window.confirm(`"${wedding.eventName || "આ Event"}" delete કરવો છે?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "weddings", wedding.id));
      setWeddings((current) => current.filter((item) => item.id !== wedding.id));
    } catch (error: any) {
      console.error("Event delete error:", error);
      alert(
        `Event delete કરવામાં error આવ્યો.\n${error?.message || "Unknown error"}`
      );
    }
  }

  const filteredWeddings = useMemo(() => {
    const text = search.trim().toLowerCase();

    return weddings.filter((wedding) => {
      const matchesSearch =
        !text ||
        [
          wedding.eventName,
          wedding.clientName,
          wedding.brideName,
          wedding.groomName,
          wedding.venue,
          wedding.eventType,
        ].some((value) => String(value || "").toLowerCase().includes(text));

      const matchesStatus =
        statusFilter === "All" || wedding.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [weddings, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: weddings.length,
      booked: weddings.filter(
        (item) => item.status === "Booked" || item.status === "Confirmed"
      ).length,
      completed: weddings.filter((item) => item.status === "Completed").length,
      cancelled: weddings.filter((item) => item.status === "Cancelled").length,
    }),
    [weddings]
  );

  if (authLoading) {
    return <main className="event-center">WedFlow loading...</main>;
  }

  if (!userId) {
    return (
      <main className="event-center">
        <div className="event-login">
          <h2>Login Required</h2>
          <p>Events જોવા માટે પહેલાં WedFlow માં login કરો.</p>
          <button className="event-primary" onClick={() => {
            window.location.href = "/login";
          }}>
            Go to Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="events-page">
      <div className="events-container">
        <header className="events-header">
          <div>
            <h1 className="events-title">📅 Events</h1>
            <p className="events-subtitle">
              તમારા Studio ના બધા Events અહીં મેનેજ કરો.
            </p>
          </div>

          <button className="event-primary add-event-button" onClick={openAddForm}>
            + Add Event
          </button>
        </header>

        {errorMessage && (
          <div className="event-error">
            <strong>Events load થઈ શક્યા નથી.</strong>
            <p>{errorMessage}</p>
            <button className="event-secondary" onClick={() => loadData(userId)}>
              Try Again
            </button>
          </div>
        )}

        <section className="event-stats">
          <StatCard title="Total Events" value={stats.total} color="#1d4ed8" />
          <StatCard title="Booked / Confirmed" value={stats.booked} color="#047857" />
          <StatCard title="Completed" value={stats.completed} color="#6d28d9" />
          <StatCard title="Cancelled" value={stats.cancelled} color="#dc2626" />
        </section>

        <section className="event-filters">
          <label className="event-search-wrap">
            <span className="event-label">Search Events</span>
            <input
              className={inputClass}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Event, client, couple or venue..."
            />
          </label>

          <label className="event-status-wrap">
            <span className="event-label">Filter by Status</span>
            <select
              className={inputClass}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              {statusOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
        </section>

        {loading ? (
          <div className="event-empty">Events loading...</div>
        ) : filteredWeddings.length === 0 ? (
          <div className="event-empty">
            <div className="event-empty-icon">📅</div>
            <h2>No Events Found</h2>
            <p>
              {search || statusFilter !== "All"
                ? "Search અથવા Status Filter બદલીને જુઓ."
                : "તમારો પહેલો Event બનાવવા માટે નીચેનું બટન દબાવો."}
            </p>
            <button className="event-primary" onClick={openAddForm}>
              + Add Event
            </button>
          </div>
        ) : (
          <section className="event-cards">
            {filteredWeddings.map((wedding) => {
              const total = Number(wedding.totalAmount || 0);
              const advance = Number(wedding.advancePaid || 0);
              const pending = Math.max(0, total - advance);
              const start = wedding.eventStartDate || wedding.weddingDate || "";
              const end = wedding.eventEndDate || start;
              const days = calculateDuration(start, end);

              return (
                <article className="event-card" key={wedding.id}>
                  <div className="event-card-header">
                    <div className="event-card-heading">
                      <h2>{wedding.eventName || "Untitled Event"}</h2>
                      <p>{wedding.clientName || "No Client Linked"}</p>
                    </div>
                    <span className={`event-status status-${(wedding.status || "Booked").toLowerCase().replace(/\s+/g, "-")}`}>
                      {wedding.status || "Booked"}
                    </span>
                  </div>

                  <div className="event-details">
                    <div className="event-detail">
                      <span className="detail-icon">📅</span>
                      <div>
                        <span className="detail-label">Event Date</span>
                        <strong>
                          {formatDate(start)}
                          {wedding.eventEndDate && wedding.eventEndDate !== start
                            ? ` – ${formatDate(wedding.eventEndDate)}`
                            : ""}
                        </strong>
                        {days && <small>{days}</small>}
                      </div>
                    </div>

                    {wedding.eventType && (
                      <div className="event-detail">
                        <span className="detail-icon">🎉</span>
                        <div>
                          <span className="detail-label">Event Type</span>
                          <strong>{wedding.eventType}</strong>
                        </div>
                      </div>
                    )}

                    {(wedding.brideName || wedding.groomName) && (
                      <div className="event-detail">
                        <span className="detail-icon">💑</span>
                        <div>
                          <span className="detail-label">Couple</span>
                          <strong>
                            {[wedding.brideName, wedding.groomName].filter(Boolean).join(" & ")}
                          </strong>
                        </div>
                      </div>
                    )}

                    {wedding.venue && (
                      <div className="event-detail">
                        <span className="detail-icon">📍</span>
                        <div>
                          <span className="detail-label">Venue</span>
                          <strong>{wedding.venue}</strong>
                        </div>
                      </div>
                    )}

                    {wedding.packageName && (
                      <div className="event-detail">
                        <span className="detail-icon">📦</span>
                        <div>
                          <span className="detail-label">Package</span>
                          <strong>{wedding.packageName}</strong>
                        </div>
                      </div>
                    )}
                  </div>

                  {Array.isArray(wedding.services) && wedding.services.length > 0 && (
                    <div className="event-services">
                      <h3>🎬 Services</h3>
                      <div className="service-chips">
                        {wedding.services.map((service) => (
                          <span key={service} className="service-chip">{service}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="event-money">
                    <div>
                      <span>Total Amount</span>
                      <strong>{formatMoney(total)}</strong>
                    </div>
                    <div>
                      <span>Paid</span>
                      <strong className="money-paid">{formatMoney(advance)}</strong>
                    </div>
                    <div>
                      <span>Pending</span>
                      <strong className={pending > 0 ? "money-pending" : "money-paid"}>
                        {formatMoney(pending)}
                      </strong>
                    </div>
                  </div>

                  {wedding.notes && (
                    <div className="event-notes">
                      <strong>📝 Notes</strong>
                      <p>{wedding.notes}</p>
                    </div>
                  )}

                  <div className="event-actions">
                    <button className="event-edit" onClick={() => editWedding(wedding)}>
                      ✏️ Edit Event
                    </button>
                    <button className="event-delete" onClick={() => deleteWedding(wedding)}>
                      🗑️ Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <div className="events-footer">
          Showing {filteredWeddings.length} of {weddings.length} Events
        </div>
      </div>

      {showForm && (
        <div className="event-modal-backdrop" onClick={closeForm}>
          <section
            className="event-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-form-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="event-modal-header">
              <div>
                <h2 id="event-form-title">
                  {editingId ? "✏️ Edit Event" : "📅 Add New Event"}
                </h2>
                <p>બધી જરૂરી વિગતો અહીં ભરો.</p>
              </div>
              <button
                className="event-close"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
              >
                ✕
              </button>
            </header>

            <div className="event-form-grid">
              <label className="event-field full-width">
                <span className="event-label">Link Existing Client</span>
                <select
                  className={inputClass}
                  value={clientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                >
                  <option value="">Select Client (Optional)</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.clientName || "Unnamed Client"}
                      {client.mobile ? ` - ${client.mobile}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <FormInput label="Event Name *" value={eventName} onChange={setEventName} placeholder="Wedding Event" />

              <label className="event-field">
                <span className="event-label">Event Type</span>
                <select className={inputClass} value={eventType} onChange={(e) => setEventType(e.target.value)}>
                  {eventTypes.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>

              <FormInput label="Bride Name" value={brideName} onChange={setBrideName} placeholder="Bride Name" />
              <FormInput label="Groom Name" value={groomName} onChange={setGroomName} placeholder="Groom Name" />

              <FormInput label="Start Date *" type="date" value={eventStartDate} onChange={setEventStartDate} />

              <label className="event-field">
                <span className="event-label">End Date</span>
                <input
                  className={inputClass}
                  type="date"
                  min={eventStartDate || undefined}
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                />
                {duration && <small className="event-duration">Duration: {duration}</small>}
              </label>

              <FormInput label="Venue / Location" value={venue} onChange={setVenue} placeholder="Venue name" />
              <FormInput label="Package" value={packageName} onChange={setPackageName} placeholder="Premium Package" />

              <FormInput label="Total Amount (₹)" type="number" value={totalAmount} onChange={setTotalAmount} placeholder="50000" />
              <FormInput label="Advance / Paid (₹)" type="number" value={advancePaid} onChange={setAdvancePaid} placeholder="10000" />

              <div className="event-pending-box full-width">
                <span>Pending Payment</span>
                <strong className={remainingAmount > 0 ? "money-pending" : "money-paid"}>
                  {formatMoney(remainingAmount)}
                </strong>
              </div>

              <label className="event-field">
                <span className="event-label">Status</span>
                <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
                  {statusOptions.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>

              <FormInput label="Notes" value={notes} onChange={setNotes} placeholder="Special instructions" />

              <div className="event-field full-width">
                <span className="event-label">🎬 Services Included</span>
                <div className="service-picker">
                  {serviceOptions.map((service) => {
                    const active = services.includes(service);
                    return (
                      <button
                        key={service}
                        type="button"
                        className={`service-option ${active ? "service-active" : ""}`}
                        onClick={() => toggleService(service)}
                        aria-pressed={active}
                      >
                        {active ? "✓ " : "+ "}{service}
                      </button>
                    );
                  })}
                </div>
                {services.length > 0 && (
                  <small className="event-selected">
                    Selected: {services.join(", ")}
                  </small>
                )}
              </div>
            </div>

            <footer className="event-modal-footer">
              <button className="event-secondary" onClick={closeForm} disabled={saving}>
                Cancel
              </button>
              <button className="event-primary" onClick={saveWedding} disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update Event" : "Save Event"}
              </button>
            </footer>
          </section>
        </div>
      )}

      <style jsx global>{`
        * { box-sizing: border-box; }

        .events-page {
          min-height: 100vh;
          background: #f3f6fc;
          color: #172033;
          padding: 28px;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 16px;
        }

        .events-container {
          max-width: 1400px;
          width: 100%;
          margin: 0 auto;
        }

        .events-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
          margin-bottom: 26px;
        }

        .events-title {
          font-size: clamp(28px, 3vw, 36px);
          font-weight: 800;
          line-height: 1.25;
          margin: 0;
          color: #111827;
        }

        .events-subtitle {
          margin: 8px 0 0;
          color: #596579;
          font-size: 16px;
          line-height: 1.6;
        }

        .event-primary, .event-secondary, .event-edit, .event-delete {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 46px;
          padding: 12px 18px;
          border-radius: 11px;
          font-size: 15px;
          line-height: 1.35;
          font-weight: 800;
          cursor: pointer;
          transition: background .15s ease;
        }

        .event-primary {
          border: 1px solid #1d4ed8;
          background: #1d4ed8;
          color: #fff;
        }

        .event-primary:hover { background: #1e40af; }

        .event-secondary {
          border: 1px solid #cbd5e1;
          background: #fff;
          color: #1f2937;
        }

        .event-primary:disabled, .event-secondary:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .event-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }

        .event-stat {
          background: #fff;
          border: 1px solid #e4e9f2;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 15px rgba(15, 23, 42, .04);
          min-width: 0;
        }

        .event-stat-title {
          color: #596579;
          font-size: 14px;
          line-height: 1.5;
          font-weight: 700;
        }

        .event-stat-value {
          font-size: 32px;
          line-height: 1.2;
          font-weight: 800;
          margin-top: 8px;
        }

        .event-filters {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 240px;
          gap: 14px;
          background: #fff;
          border: 1px solid #e4e9f2;
          padding: 18px;
          border-radius: 16px;
          margin-bottom: 22px;
        }

        .event-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }

        .event-label {
          display: block;
          color: #253047;
          font-size: 14px;
          line-height: 1.4;
          font-weight: 800;
        }

        .event-input {
          display: block;
          width: 100%;
          min-width: 0;
          min-height: 48px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 12px 13px;
          background: #fff;
          color: #111827;
          font-size: 16px;
          line-height: 1.4;
          outline: none;
        }

        .event-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, .13);
        }

        .event-input::placeholder { color: #778196; opacity: 1; }

        .event-error {
          border: 1px solid #fecaca;
          background: #fff1f2;
          color: #991b1b;
          border-radius: 13px;
          padding: 16px;
          margin-bottom: 20px;
          overflow-wrap: anywhere;
        }

        .event-error p { line-height: 1.6; }

        .event-empty {
          background: #fff;
          border: 1px solid #e4e9f2;
          border-radius: 18px;
          padding: 38px 22px;
          text-align: center;
          box-shadow: 0 4px 15px rgba(15, 23, 42, .04);
        }

        .event-empty-icon { font-size: 46px; }
        .event-empty h2 { font-size: 23px; margin: 12px 0 8px; }
        .event-empty p { color: #596579; font-size: 15px; line-height: 1.6; }

        .event-cards {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          align-items: start;
        }

        .event-card {
          background: #fff;
          border: 1px solid #e0e6f0;
          border-radius: 18px;
          padding: 22px;
          min-width: 0;
          box-shadow: 0 5px 18px rgba(15, 23, 42, .05);
        }

        .event-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          padding-bottom: 16px;
          border-bottom: 1px solid #edf0f5;
        }

        .event-card-heading { min-width: 0; }

        .event-card-heading h2 {
          font-size: 21px;
          line-height: 1.4;
          overflow-wrap: anywhere;
          margin: 0;
          color: #111827;
        }

        .event-card-heading p {
          color: #596579;
          font-size: 15px;
          line-height: 1.5;
          margin: 6px 0 0;
          overflow-wrap: anywhere;
        }

        .event-status {
          display: inline-block;
          flex-shrink: 0;
          padding: 7px 10px;
          border-radius: 8px;
          background: #fff7d6;
          color: #854d0e;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.3;
          overflow-wrap: anywhere;
        }

        .status-completed { background: #dcfce7; color: #166534; }
        .status-cancelled { background: #fee2e2; color: #991b1b; }
        .status-confirmed { background: #dbeafe; color: #1d4ed8; }
        .status-pending { background: #ffedd5; color: #9a3412; }

        .event-details {
          display: grid;
          gap: 16px;
          margin: 19px 0;
        }

        .event-detail {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          min-width: 0;
        }

        .detail-icon { font-size: 20px; width: 26px; flex-shrink: 0; }

        .event-detail > div {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .detail-label {
          font-size: 12px;
          color: #69758a;
          font-weight: 700;
        }

        .event-detail strong {
          color: #172033;
          font-size: 15px;
          line-height: 1.5;
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        .event-detail small { color: #64748b; font-size: 13px; }

        .event-services { margin: 20px 0; }
        .event-services h3 { font-size: 14px; margin: 0 0 10px; }

        .service-chips, .service-picker {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .service-chip {
          background: #edf2ff;
          color: #3730a3;
          border: 1px solid #dbe4ff;
          border-radius: 8px;
          padding: 7px 10px;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        .event-money {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 20px;
          padding: 15px 12px;
          background: #f5f7fb;
          border: 1px solid #edf0f5;
          border-radius: 13px;
        }

        .event-money > div { min-width: 0; }

        .event-money span {
          display: block;
          color: #596579;
          font-size: 12px;
          line-height: 1.4;
          font-weight: 700;
          margin-bottom: 7px;
        }

        .event-money strong {
          display: block;
          font-size: 15px;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .money-paid { color: #047857 !important; }
        .money-pending { color: #dc2626 !important; }

        .event-notes {
          background: #fff7ed;
          border: 1px solid #fed7aa;
          border-radius: 11px;
          padding: 13px;
          margin-top: 16px;
          color: #7c2d12;
          overflow-wrap: anywhere;
        }

        .event-notes p { margin: 7px 0 0; line-height: 1.6; font-size: 14px; }

        .event-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 20px;
        }

        .event-edit {
          background: #e8efff;
          color: #1e40af;
          border: 1px solid #d4e0ff;
        }

        .event-delete {
          background: #fff0f0;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }

        .events-footer {
          text-align: center;
          color: #69758a;
          font-size: 13px;
          padding: 22px 0 6px;
        }

        .event-center {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          background: #f3f6fc;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 18px;
          font-weight: 700;
        }

        .event-login {
          width: 100%;
          max-width: 420px;
          padding: 28px;
          border-radius: 18px;
          background: #fff;
          text-align: center;
          box-shadow: 0 8px 28px rgba(15, 23, 42, .08);
        }

        .event-login p { color: #596579; font-weight: 400; line-height: 1.6; }

        .event-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(15, 23, 42, .62);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          overflow-y: auto;
        }

        .event-modal {
          width: 100%;
          max-width: 820px;
          max-height: calc(100dvh - 40px);
          overflow-y: auto;
          overscroll-behavior: contain;
          background: #fff;
          border-radius: 20px;
          padding: 26px;
          box-shadow: 0 20px 70px rgba(0, 0, 0, .22);
        }

        .event-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          padding-bottom: 20px;
          margin-bottom: 22px;
          border-bottom: 1px solid #e5eaf2;
        }

        .event-modal-header h2 { margin: 0; font-size: 25px; line-height: 1.35; }
        .event-modal-header p { margin: 7px 0 0; color: #64748b; font-size: 14px; line-height: 1.5; }

        .event-close {
          flex-shrink: 0;
          width: 42px;
          height: 42px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #f8fafc;
          color: #1f2937;
          font-size: 20px;
          cursor: pointer;
        }

        .event-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 19px 16px;
        }

        .full-width { grid-column: 1 / -1; }

        .event-duration, .event-selected {
          display: block;
          color: #1d4ed8;
          font-size: 13px;
          line-height: 1.5;
          margin-top: 5px;
        }

        .event-pending-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 15px;
          background: #f5f7fb;
          border: 1px solid #e5eaf2;
          border-radius: 11px;
          font-size: 15px;
          font-weight: 700;
        }

        .service-option {
          border: 1px solid #cbd5e1;
          background: #fff;
          color: #334155;
          border-radius: 9px;
          padding: 10px 12px;
          min-height: 40px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .service-active {
          background: #1d4ed8;
          color: #fff;
          border-color: #1d4ed8;
        }

        .event-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 20px;
          margin-top: 25px;
          border-top: 1px solid #e5eaf2;
        }

        @media (max-width: 900px) {
          .events-page { padding: 22px; }
          .event-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .event-cards { grid-template-columns: minmax(0, 1fr); }
        }

        @media (max-width: 600px) {
          .events-page { padding: 14px; }
          .events-header { align-items: stretch; gap: 14px; margin-bottom: 20px; }
          .events-header > div { width: 100%; }
          .events-title { font-size: 29px; }
          .events-subtitle { font-size: 15px; }
          .add-event-button { width: 100%; min-height: 50px; }
          .event-stats { gap: 10px; margin-bottom: 16px; }
          .event-stat { padding: 15px 13px; border-radius: 13px; }
          .event-stat-title { font-size: 12px; }
          .event-stat-value { font-size: 27px; }
          .event-filters { grid-template-columns: minmax(0, 1fr); padding: 14px; gap: 14px; }
          .event-card { padding: 17px; border-radius: 15px; }
          .event-card-header { flex-wrap: wrap; }
          .event-card-heading h2 { font-size: 20px; }
          .event-status { font-size: 12px; }
          .event-money { gap: 7px; padding: 12px 9px; }
          .event-money span { font-size: 11px; }
          .event-money strong { font-size: 13px; }
          .event-actions { grid-template-columns: minmax(0, 1fr); }
          .event-modal-backdrop { padding: 0; align-items: flex-end; }
          .event-modal {
            width: 100%;
            max-width: none;
            max-height: 94dvh;
            border-radius: 20px 20px 0 0;
            padding: 20px 16px;
          }
          .event-modal-header h2 { font-size: 22px; }
          .event-form-grid { grid-template-columns: minmax(0, 1fr); gap: 17px; }
          .full-width { grid-column: auto; }
          .event-modal-footer {
            position: sticky;
            bottom: -20px;
            background: #fff;
            padding: 14px 0 8px;
            flex-direction: column-reverse;
          }
          .event-modal-footer button { width: 100%; min-height: 48px; }
          .service-option { padding: 10px; font-size: 13px; }
        }

        @media (max-width: 360px) {
          .events-page { padding: 10px; }
          .event-stat { padding: 12px 10px; }
          .event-stat-value { font-size: 24px; }
          .event-card { padding: 14px; }
          .event-money { grid-template-columns: minmax(0, 1fr); }
          .event-money > div { display: flex; justify-content: space-between; gap: 10px; }
          .event-money span { margin-bottom: 0; }
        }
      `}</style>
    </main>
  );
}