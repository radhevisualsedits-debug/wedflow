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
  totalAmount?: number;
  advancePaid?: number;
  remainingAmount?: number;
};

type Payment = {
  id: string;
  studioId?: string;
  clientId?: string;
  clientName?: string;
  amount?: number;
  paymentDate?: string;
  paymentMethod?: string;
  createdAt?: any;
  updatedAt?: any;
};

const paymentMethods = [
  "💳 UPI",
  "💵 Cash",
  "🏦 Bank",
  "🔹 Other",
];

function money(value?: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

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

function normalizeMobile(mobile?: string) {
  if (!mobile) return "";

  let number = mobile.replace(/\D/g, "");

  if (number.length === 10) {
    number = "91" + number;
  }

  if (number.startsWith("0") && number.length === 11) {
    number = "91" + number.substring(1);
  }

  return number;
}

function getTodayDate() {
  const today = new Date();

  return new Date(
    today.getTime() - today.getTimezoneOffset() * 60000
  )
    .toISOString()
    .split("T")[0];
}

export default function PaymentsPage() {
  const [userId, setUserId] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedClientId, setSelectedClientId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("💳 UPI");
  const [search, setSearch] = useState("");

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingPaymentId, setEditingPaymentId] =
    useState<string | null>(null);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId),
    [clients, selectedClientId]
  );

  function getClientPaid(client: Client) {
    const recordedPayments = payments
      .filter((payment) => payment.clientId === client.id)
      .reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      );

    return recordedPayments > 0
      ? recordedPayments
      : Number(client.advancePaid || 0);
  }

  const selectedTotal = Number(selectedClient?.totalAmount || 0);

  const selectedPaid = selectedClient
    ? getClientPaid(selectedClient)
    : 0;

  const selectedPending = Math.max(
    0,
    selectedTotal - selectedPaid
  );

  const clientPayments = useMemo(() => {
    if (!selectedClientId) return [];

    return payments
      .filter((payment) => payment.clientId === selectedClientId)
      .sort((a, b) =>
        String(b.paymentDate || "").localeCompare(
          String(a.paymentDate || "")
        )
      );
  }, [payments, selectedClientId]);

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return clients;

    return clients.filter((client) =>
      [
        client.clientName,
        client.eventName,
        client.mobile,
      ].some((value) =>
        String(value || "").toLowerCase().includes(term)
      )
    );
  }, [clients, search]);

  const pendingClients = useMemo(
    () =>
      clients.filter(
        (client) =>
          Number(client.totalAmount || 0) - getClientPaid(client) > 0
      ),
    [clients, payments]
  );

  const totalRevenue = useMemo(
    () =>
      clients.reduce(
        (sum, client) => sum + Number(client.totalAmount || 0),
        0
      ),
    [clients]
  );

  const totalPaid = useMemo(
    () =>
      clients.reduce(
        (sum, client) => sum + getClientPaid(client),
        0
      ),
    [clients, payments]
  );

  const totalPending = Math.max(0, totalRevenue - totalPaid);

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

      const clientsQuery = query(
        collection(db, "clients"),
        where("studioId", "==", uid)
      );

      const paymentsQuery = query(
        collection(db, "payments"),
        where("studioId", "==", uid)
      );

      const [clientSnapshot, paymentSnapshot] = await Promise.all([
        getDocs(clientsQuery),
        getDocs(paymentsQuery),
      ]);

      const loadedClients = clientSnapshot.docs.map((item) => ({
        ...item.data(),
        id: item.id,
      })) as Client[];

      const loadedPayments = paymentSnapshot.docs.map((item) => ({
        ...item.data(),
        id: item.id,
      })) as Payment[];

      loadedClients.sort((a, b) =>
        String(a.clientName || "").localeCompare(
          String(b.clientName || "")
        )
      );

      loadedPayments.sort((a, b) =>
        String(b.paymentDate || "").localeCompare(
          String(a.paymentDate || "")
        )
      );

      setClients(loadedClients);
      setPayments(loadedPayments);
    } catch (error) {
      console.error("Payments loading error:", error);
      alert("Payments load કરવામાં error આવ્યો.");
    } finally {
      setLoading(false);
    }
  }

  function resetPaymentForm() {
    setEditingPaymentId(null);
    setSelectedClientId("");
    setAmount("");
    setPaymentDate(getTodayDate());
    setPaymentMethod("💳 UPI");
  }

  function openAddPayment(clientId?: string) {
    setEditingPaymentId(null);
    setSelectedClientId(clientId || "");
    setAmount("");
    setPaymentDate(getTodayDate());
    setPaymentMethod("💳 UPI");
    setShowPaymentForm(true);
  }

  function editPayment(payment: Payment) {
    setEditingPaymentId(payment.id);
    setSelectedClientId(payment.clientId || "");
    setAmount(String(payment.amount ?? ""));
    setPaymentDate(payment.paymentDate || "");
    setPaymentMethod(payment.paymentMethod || "💳 UPI");
    setShowPaymentForm(true);
  }

  function closePaymentForm() {
    if (saving) return;

    setShowPaymentForm(false);
    resetPaymentForm();
  }

  async function updateClientPayment(clientId: string) {
    const client = clients.find((item) => item.id === clientId);

    if (!client || client.studioId !== userId) return;

    const paymentsQuery = query(
      collection(db, "payments"),
      where("studioId", "==", userId),
      where("clientId", "==", clientId)
    );

    const snapshot = await getDocs(paymentsQuery);

    let paymentTotal = 0;

    snapshot.forEach((item) => {
      paymentTotal += Number(item.data().amount || 0);
    });

    const oldAdvance = Number(client.advancePaid || 0);

    const newAdvance =
      paymentTotal > 0 ? paymentTotal : oldAdvance;

    const total = Number(client.totalAmount || 0);

    await updateDoc(doc(db, "clients", clientId), {
      advancePaid: newAdvance,
      remainingAmount: Math.max(0, total - newAdvance),
      updatedAt: new Date(),
    });
  }

  async function savePayment() {
    if (!userId) {
      alert("Please login first.");
      return;
    }

    if (!selectedClientId) {
      alert("Client select કરો.");
      return;
    }

    const paymentAmount = Number(amount);

    if (!amount.trim() || !Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      alert("યોગ્ય Payment Amount નાખો.");
      return;
    }

    if (!paymentDate) {
      alert("Payment date પસંદ કરો.");
      return;
    }

    const client = clients.find(
      (item) => item.id === selectedClientId
    );

    if (!client) {
      alert("Selected client મળ્યો નથી.");
      return;
    }

    if (client.studioId !== userId) {
      alert("આ client તમારા studio નો નથી.");
      return;
    }

    const previousPayment = editingPaymentId
      ? payments.find((item) => item.id === editingPaymentId)
      : undefined;

    if (editingPaymentId && !previousPayment) {
      alert("Payment મળ્યો નથી.");
      return;
    }

    if (
      previousPayment &&
      previousPayment.studioId !== userId
    ) {
      alert("આ payment તમારા studio નો નથી.");
      return;
    }

    const oldClientId = previousPayment?.clientId || "";

    if (!editingPaymentId && selectedTotal > 0 &&
        paymentAmount > selectedPending) {
      const confirmed = window.confirm(
        `Pending payment ${money(selectedPending)} છે, પરંતુ તમે ${money(paymentAmount)} નાખી રહ્યા છો.\n\nઆ payment save કરવો છે?`
      );

      if (!confirmed) return;
    }

    try {
      setSaving(true);

      const paymentData = {
        studioId: userId,
        clientId: selectedClientId,
        clientName: client.clientName || "",
        amount: paymentAmount,
        paymentDate,
        paymentMethod,
        updatedAt: new Date(),
      };

      if (editingPaymentId) {
        await updateDoc(
          doc(db, "payments", editingPaymentId),
          paymentData
        );
      } else {
        await addDoc(collection(db, "payments"), {
          ...paymentData,
          createdAt: new Date(),
        });
      }

      if (oldClientId && oldClientId !== selectedClientId) {
        await updateClientPayment(oldClientId);
      }

      await updateClientPayment(selectedClientId);
      await loadData(userId);

      setShowPaymentForm(false);
      resetPaymentForm();
    } catch (error) {
      console.error("Payment save error:", error);
      alert("Payment save કરવામાં error આવ્યો.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePayment(payment: Payment) {
    if (!userId) return;

    if (payment.studioId !== userId) {
      alert("આ payment તમારા studio નો નથી.");
      return;
    }

    const confirmed = window.confirm(
      `આ ${money(payment.amount)} payment delete કરવો છે?`
    );

    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "payments", payment.id));

      if (payment.clientId) {
        await updateClientPayment(payment.clientId);
      }

      await loadData(userId);
    } catch (error) {
      console.error("Payment delete error:", error);
      alert("Payment delete કરવામાં error આવ્યો.");
    }
  }

  function sendWhatsAppReminder(client: Client) {
    const mobile = normalizeMobile(client.mobile);

    if (!mobile) {
      alert("આ client નો mobile number નથી.");
      return;
    }

    const total = Number(client.totalAmount || 0);
    const paid = getClientPaid(client);
    const pending = Math.max(0, total - paid);

    if (pending <= 0) {
      alert("આ client નું કોઈ pending payment નથી.");
      return;
    }

    const message =
      `Hello ${client.clientName || "Client"},\n\n` +
      `Your payment of ${money(pending)} is pending for ${client.eventName || "your event"}.\n\n` +
      `Total Amount: ${money(total)}\n` +
      `Paid: ${money(paid)}\n` +
      `Pending: ${money(pending)}\n\n` +
      `Thank you.\nRadhe Visuals`;

    window.open(
      `https://wa.me/${mobile}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  if (authLoading) {
    return (
      <main className="payment-loading">
        <div className="loading-card">WedFlow loading...</div>
        <PaymentStyles />
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="payment-loading">
        <div className="login-card">
          <div className="login-icon">🔐</div>
          <h2>Login Required</h2>
          <p>Payments જોવા માટે પહેલા WedFlow માં login કરો.</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              window.location.href = "/login";
            }}
          >
            Go to Login
          </button>
        </div>
        <PaymentStyles />
      </main>
    );
  }

  return (
    <main className="payments-page">
      <div className="payments-container">
        <header className="payments-header">
          <div>
            <div className="eyebrow">WEDFLOW STUDIO MANAGER</div>
            <h1>💰 Payments</h1>
            <p className="subtitle">
              તમારા studio ના payments સરળતાથી manage કરો.
            </p>
          </div>

          <button
            className="btn btn-primary header-add"
            onClick={() => openAddPayment()}
          >
            + Add Payment
          </button>
        </header>

        <section className="summary-grid">
          <div className="summary-card">
            <div className="summary-icon revenue-icon">₹</div>
            <div className="summary-label">Total Revenue</div>
            <div className="summary-value">
              {money(totalRevenue)}
            </div>
            <div className="summary-note">બધા client ના કુલ charges</div>
          </div>

          <div className="summary-card">
            <div className="summary-icon paid-icon">✓</div>
            <div className="summary-label">Total Paid</div>
            <div className="summary-value green">
              {money(totalPaid)}
            </div>
            <div className="summary-note">મળેલી payment</div>
          </div>

          <div className="summary-card">
            <div className="summary-icon pending-icon">◷</div>
            <div className="summary-label">Total Pending</div>
            <div className="summary-value red">
              {money(totalPending)}
            </div>
            <div className="summary-note">હજુ મળવાના બાકી</div>
          </div>

          <div className="summary-card">
            <div className="summary-icon clients-icon">👤</div>
            <div className="summary-label">Pending Clients</div>
            <div className="summary-value">
              {pendingClients.length}
            </div>
            <div className="summary-note">બાકી payment ધરાવતા clients</div>
          </div>
        </section>

        <section className="panel client-tools">
          <div className="section-heading">
            <div>
              <h2>Find a Client</h2>
              <p>Client શોધો અને તેની payment જુઓ.</p>
            </div>
          </div>

          <div className="search-row">
            <div className="search-field">
              <span>⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="નામ, event અથવા mobile થી શોધો..."
              />
            </div>

            <select
              className="client-select"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
            >
              <option value="">Select Client</option>
              {filteredClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.clientName || "Unnamed Client"}
                  {client.eventName ? ` — ${client.eventName}` : ""}
                </option>
              ))}
            </select>

            <button
              className="btn btn-dark"
              onClick={() => openAddPayment(selectedClientId || undefined)}
            >
              + Payment
            </button>
          </div>
        </section>

        {selectedClient && (
          <section className="panel selected-client-panel">
            <div className="selected-client-header">
              <div className="client-identity">
                <div className="client-avatar">
                  {(selectedClient.clientName || "C")
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div>
                  <h2>{selectedClient.clientName || "Client"}</h2>
                  <p>{selectedClient.eventName || "Event not specified"}</p>
                  {selectedClient.mobile && (
                    <div className="client-mobile">
                      📱 {selectedClient.mobile}
                    </div>
                  )}
                </div>
              </div>

              <div className="client-actions">
                {selectedPending > 0 && (
                  <button
                    className="btn btn-whatsapp"
                    onClick={() => sendWhatsAppReminder(selectedClient)}
                  >
                    💬 WhatsApp Reminder
                  </button>
                )}
                <button
                  className="btn btn-primary"
                  onClick={() => openAddPayment(selectedClient.id)}
                >
                  + Add Payment
                </button>
              </div>
            </div>

            <div className="client-money-grid">
              <div className="client-money-card">
                <span>Total Amount</span>
                <strong>{money(selectedTotal)}</strong>
              </div>
              <div className="client-money-card client-paid">
                <span>Paid Amount</span>
                <strong>{money(selectedPaid)}</strong>
              </div>
              <div className="client-money-card client-pending">
                <span>Pending Amount</span>
                <strong>{money(selectedPending)}</strong>
              </div>
            </div>
          </section>
        )}

        <section className="panel history-panel">
          <div className="section-heading history-heading">
            <div>
              <h2>💳 Payment History</h2>
              <p>
                {selectedClient
                  ? `${selectedClient.clientName || "Client"} ની payment details`
                  : "Payment જોવા માટે પહેલાં client પસંદ કરો."}
              </p>
            </div>
            {selectedClientId && (
              <span className="history-count">
                {clientPayments.length} payment
                {clientPayments.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {loading ? (
            <div className="empty-state">
              <div className="empty-icon">⏳</div>
              <p>Payments loading...</p>
            </div>
          ) : !selectedClientId ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h3>Select a Client</h3>
              <p>ઉપરથી client પસંદ કરો, પછી તેની payment history અહીં દેખાશે.</p>
            </div>
          ) : clientPayments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💳</div>
              <h3>હજુ કોઈ Payment નથી</h3>
              <p>આ client માટે પ્રથમ payment ઉમેરો.</p>
              <button
                className="btn btn-primary"
                onClick={() => openAddPayment(selectedClientId)}
              >
                + Add First Payment
              </button>
            </div>
          ) : (
            <div className="payment-list">
              {clientPayments.map((payment) => (
                <article className="payment-row" key={payment.id}>
                  <div className="payment-method-icon">
                    {payment.paymentMethod?.includes("Cash")
                      ? "💵"
                      : payment.paymentMethod?.includes("Bank")
                      ? "🏦"
                      : payment.paymentMethod?.includes("UPI")
                      ? "💳"
                      : "🔹"}
                  </div>

                  <div className="payment-details">
                    <strong>{money(payment.amount)}</strong>
                    <span>
                      {formatDate(payment.paymentDate)}
                    </span>
                    <span className="payment-method-label">
                      {payment.paymentMethod || "Other"}
                    </span>
                  </div>

                  <div className="payment-actions">
                    <button
                      className="btn btn-edit"
                      onClick={() => editPayment(payment)}
                    >
                      ✏️ <span>Edit</span>
                    </button>
                    <button
                      className="btn btn-delete"
                      onClick={() => deletePayment(payment)}
                    >
                      🗑️ <span>Delete</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="payments-footer">
          <span>WedFlow</span>
          <span>Manage your studio payments with ease.</span>
        </footer>
      </div>

      {showPaymentForm && (
        <div className="payment-modal-overlay">
          <section
            className="payment-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
          >
            <div className="modal-header">
              <div>
                <div className="eyebrow">PAYMENT DETAILS</div>
                <h2 id="payment-modal-title">
                  {editingPaymentId ? "✏️ Edit Payment" : "💰 Add Payment"}
                </h2>
              </div>

              <button
                className="modal-close"
                onClick={closePaymentForm}
                disabled={saving}
                aria-label="Close payment form"
              >
                ✕
              </button>
            </div>

            <div className="modal-form">
              <label>
                <span>Client *</span>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                >
                  <option value="">Select Client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.clientName || "Unnamed Client"}
                      {client.eventName ? ` — ${client.eventName}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              {selectedClient && (
                <div className="modal-client-summary">
                  <div className="modal-client-name">
                    {selectedClient.clientName || "Client"}
                  </div>
                  <div className="modal-client-numbers">
                    <span>Total: <strong>{money(selectedTotal)}</strong></span>
                    <span>Paid: <strong>{money(selectedPaid)}</strong></span>
                    <span>Pending: <strong>{money(selectedPending)}</strong></span>
                  </div>
                </div>
              )}

              <label>
                <span>Payment Amount (₹) *</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="ઉદાહરણ: 10000"
                />
              </label>

              <label>
                <span>Payment Date *</span>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </label>

              <label>
                <span>Payment Method</span>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-cancel"
                onClick={closePaymentForm}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary save-button"
                onClick={savePayment}
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingPaymentId
                  ? "Update Payment"
                  : "Save Payment"}
              </button>
            </div>
          </section>
        </div>
      )}

      <PaymentStyles />
    </main>
  );
}

function PaymentStyles() {
  return (
    <style jsx global>{`
      * {
        box-sizing: border-box;
      }

      .payments-page {
        min-height: 100vh;
        width: 100%;
        padding: 28px;
        background: #f4f6fb;
        color: #172033;
        font-family: Arial, Helvetica, sans-serif;
        overflow-x: hidden;
      }

      .payments-container {
        width: 100%;
        max-width: 1380px;
        margin: 0 auto;
      }

      .payments-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        flex-wrap: wrap;
        margin-bottom: 26px;
      }

      .eyebrow {
        margin-bottom: 8px;
        color: #68748a;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 1.5px;
      }

      .payments-header h1 {
        margin: 0;
        color: #111827;
        font-size: 32px;
        line-height: 1.25;
        font-weight: 850;
        letter-spacing: -0.7px;
      }

      .subtitle {
        margin: 8px 0 0;
        color: #697386;
        font-size: 14px;
        line-height: 1.6;
      }

      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        min-height: 42px;
        padding: 11px 15px;
        border: 1px solid transparent;
        border-radius: 10px;
        font-family: inherit;
        font-size: 13px;
        font-weight: 750;
        line-height: 1.2;
        cursor: pointer;
        transition: transform 0.15s ease, opacity 0.15s ease;
      }

      .btn:hover {
        transform: translateY(-1px);
      }

      .btn:disabled {
        cursor: not-allowed;
        opacity: 0.55;
        transform: none;
      }

      .btn-primary {
        background: #4f46e5;
        color: #ffffff;
        box-shadow: 0 5px 14px rgba(79, 70, 229, 0.16);
      }

      .btn-dark {
        background: #182033;
        color: #ffffff;
      }

      .btn-whatsapp {
        background: #e9f9ef;
        color: #14763c;
        border-color: #c5efd3;
      }

      .btn-edit {
        background: #eef2ff;
        color: #3730a3;
      }

      .btn-delete {
        background: #fff0f0;
        color: #b42318;
      }

      .btn-cancel {
        background: #ffffff;
        color: #374151;
        border-color: #d8deea;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
        margin-bottom: 20px;
      }

      .summary-card {
        min-width: 0;
        padding: 20px;
        background: #ffffff;
        border: 1px solid #e9edf5;
        border-radius: 17px;
        box-shadow: 0 4px 16px rgba(24, 32, 51, 0.035);
      }

      .summary-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 39px;
        height: 39px;
        margin-bottom: 15px;
        border-radius: 12px;
        font-size: 19px;
        font-weight: 800;
      }

      .revenue-icon {
        background: #eef2ff;
        color: #4f46e5;
      }

      .paid-icon {
        background: #e9f9ef;
        color: #15803d;
      }

      .pending-icon {
        background: #fff1f2;
        color: #e11d48;
      }

      .clients-icon {
        background: #fff7e6;
        color: #b7791f;
      }

      .summary-label {
        color: #697386;
        font-size: 13px;
        font-weight: 650;
      }

      .summary-value {
        margin-top: 7px;
        color: #172033;
        font-size: clamp(21px, 2vw, 27px);
        font-weight: 850;
        line-height: 1.25;
        overflow-wrap: anywhere;
      }

      .summary-value.green {
        color: #15803d;
      }

      .summary-value.red {
        color: #dc2626;
      }

      .summary-note {
        margin-top: 8px;
        color: #9099aa;
        font-size: 11px;
        line-height: 1.5;
      }

      .panel {
        min-width: 0;
        margin-bottom: 20px;
        padding: 22px;
        background: #ffffff;
        border: 1px solid #e9edf5;
        border-radius: 17px;
        box-shadow: 0 4px 16px rgba(24, 32, 51, 0.035);
      }

      .section-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 17px;
      }

      .section-heading h2 {
        margin: 0;
        color: #172033;
        font-size: 18px;
        font-weight: 800;
      }

      .section-heading p {
        margin: 5px 0 0;
        color: #818a9c;
        font-size: 12px;
        line-height: 1.5;
      }

      .search-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(220px, 0.85fr) auto;
        gap: 12px;
        align-items: center;
      }

      .search-field {
        display: flex;
        align-items: center;
        gap: 9px;
        min-width: 0;
        height: 46px;
        padding: 0 13px;
        border: 1px solid #dfe4ed;
        border-radius: 11px;
        background: #ffffff;
      }

      .search-field > span {
        color: #8791a3;
        font-size: 23px;
      }

      .search-field input {
        width: 100%;
        min-width: 0;
        padding: 0;
        border: none;
        outline: none;
        background: transparent;
        color: #172033;
        font: inherit;
        font-size: 13px;
      }

      .search-field input:focus {
        outline: none;
      }

      .client-select,
      .modal-form input,
      .modal-form select {
        width: 100%;
        min-width: 0;
        min-height: 46px;
        padding: 11px 12px;
        border: 1px solid #dfe4ed;
        border-radius: 10px;
        outline: none;
        background: #ffffff;
        color: #172033;
        font: inherit;
        font-size: 13px;
      }

      .client-select:focus,
      .modal-form input:focus,
      .modal-form select:focus {
        border-color: #818cf8;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
      }

      .selected-client-panel {
        padding: 23px;
      }

      .selected-client-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
        flex-wrap: wrap;
      }

      .client-identity {
        display: flex;
        align-items: center;
        gap: 13px;
        min-width: 0;
      }

      .client-avatar {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        width: 51px;
        height: 51px;
        border-radius: 15px;
        background: #eef2ff;
        color: #4f46e5;
        font-size: 21px;
        font-weight: 850;
      }

      .client-identity h2 {
        margin: 0;
        color: #172033;
        font-size: 21px;
        overflow-wrap: anywhere;
      }

      .client-identity p {
        margin: 5px 0 0;
        color: #707b8e;
        font-size: 13px;
      }

      .client-mobile {
        margin-top: 7px;
        color: #818a9c;
        font-size: 12px;
      }

      .client-actions {
        display: flex;
        gap: 9px;
        flex-wrap: wrap;
      }

      .client-money-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin-top: 22px;
      }

      .client-money-card {
        min-width: 0;
        padding: 16px;
        border: 1px solid #e9edf5;
        border-radius: 13px;
        background: #f8faff;
      }

      .client-money-card span {
        display: block;
        color: #727d90;
        font-size: 12px;
      }

      .client-money-card strong {
        display: block;
        margin-top: 8px;
        color: #172033;
        font-size: clamp(19px, 2vw, 24px);
        font-weight: 850;
        overflow-wrap: anywhere;
      }

      .client-money-card.client-paid {
        background: #f0fdf4;
        border-color: #d8f3df;
      }

      .client-money-card.client-paid strong {
        color: #15803d;
      }

      .client-money-card.client-pending {
        background: #fff5f5;
        border-color: #fee0e0;
      }

      .client-money-card.client-pending strong {
        color: #dc2626;
      }

      .history-heading {
        margin-bottom: 20px;
      }

      .history-count {
        flex-shrink: 0;
        padding: 6px 10px;
        border-radius: 20px;
        background: #eef2ff;
        color: #4338ca;
        font-size: 11px;
        font-weight: 750;
      }

      .payment-list {
        display: grid;
        gap: 11px;
      }

      .payment-row {
        display: flex;
        align-items: center;
        gap: 13px;
        min-width: 0;
        padding: 15px;
        border: 1px solid #e8ecf3;
        border-radius: 13px;
        background: #ffffff;
      }

      .payment-method-icon {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        width: 43px;
        height: 43px;
        border-radius: 12px;
        background: #f2f4fa;
        font-size: 19px;
      }

      .payment-details {
        display: flex;
        flex: 1;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px 13px;
        min-width: 0;
      }

      .payment-details strong {
        color: #172033;
        font-size: 17px;
        font-weight: 850;
      }

      .payment-details span {
        color: #7b8597;
        font-size: 12px;
      }

      .payment-details .payment-method-label {
        padding: 5px 8px;
        border-radius: 7px;
        background: #f4f6fb;
        color: #566176;
      }

      .payment-actions {
        display: flex;
        flex-shrink: 0;
        gap: 8px;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 38px 18px;
        text-align: center;
      }

      .empty-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 55px;
        height: 55px;
        margin-bottom: 13px;
        border-radius: 17px;
        background: #f2f4fa;
        font-size: 24px;
      }

      .empty-state h3 {
        margin: 0;
        color: #263147;
        font-size: 16px;
      }

      .empty-state p {
        max-width: 400px;
        margin: 8px 0 0;
        color: #818a9c;
        font-size: 13px;
        line-height: 1.6;
      }

      .empty-state .btn {
        margin-top: 16px;
      }

      .payments-footer {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 7px 3px 2px;
        color: #929bad;
        font-size: 11px;
      }

      .payments-footer span:first-child {
        color: #697386;
        font-weight: 850;
      }

      .payment-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 18px;
        background: rgba(15, 23, 42, 0.62);
        backdrop-filter: blur(4px);
      }

      .payment-modal {
        width: 100%;
        max-width: 540px;
        max-height: 90vh;
        overflow-y: auto;
        padding: 25px;
        border: 1px solid rgba(255, 255, 255, 0.6);
        border-radius: 21px;
        background: #ffffff;
        box-shadow: 0 25px 80px rgba(0, 0, 0, 0.22);
      }

      .modal-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 23px;
      }

      .modal-header h2 {
        margin: 0;
        color: #172033;
        font-size: 23px;
        font-weight: 850;
      }

      .modal-close {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        width: 39px;
        height: 39px;
        border: none;
        border-radius: 11px;
        background: #f1f3f8;
        color: #475166;
        font-size: 17px;
        cursor: pointer;
      }

      .modal-form {
        display: grid;
        gap: 17px;
      }

      .modal-form label {
        display: grid;
        gap: 8px;
        min-width: 0;
      }

      .modal-form label > span {
        color: #374151;
        font-size: 12px;
        font-weight: 800;
      }

      .modal-client-summary {
        padding: 14px;
        border: 1px solid #e6eafa;
        border-radius: 12px;
        background: #f7f8ff;
      }

      .modal-client-name {
        color: #252f45;
        font-size: 14px;
        font-weight: 850;
      }

      .modal-client-numbers {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 14px;
        margin-top: 10px;
        color: #707b8e;
        font-size: 11px;
      }

      .modal-client-numbers strong {
        color: #252f45;
      }

      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 23px;
        padding-top: 18px;
        border-top: 1px solid #edf0f5;
      }

      .save-button {
        min-width: 140px;
      }

      .payment-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 18px;
        background: #f4f6fb;
        font-family: Arial, Helvetica, sans-serif;
      }

      .loading-card,
      .login-card {
        width: 100%;
        max-width: 430px;
        padding: 30px;
        border: 1px solid #e9edf5;
        border-radius: 18px;
        background: #ffffff;
        text-align: center;
        box-shadow: 0 8px 30px rgba(24, 32, 51, 0.06);
      }

      .loading-card {
        color: #4f46e5;
        font-weight: 800;
      }

      .login-icon {
        margin-bottom: 12px;
        font-size: 35px;
      }

      .login-card h2 {
        margin: 0;
        color: #172033;
      }

      .login-card p {
        margin: 10px 0 20px;
        color: #697386;
        font-size: 13px;
        line-height: 1.6;
      }

      @media (max-width: 1050px) {
        .summary-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .search-row {
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        }

        .search-row .btn {
          grid-column: 1 / -1;
        }
      }

      @media (max-width: 600px) {
        .payments-page {
          padding: 13px;
        }

        .payments-header {
          align-items: stretch;
          gap: 15px;
          margin-bottom: 19px;
        }

        .payments-header h1 {
          font-size: 27px;
        }

        .subtitle {
          max-width: 300px;
          font-size: 12px;
        }

        .header-add {
          width: 100%;
        }

        .summary-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }

        .summary-card {
          padding: 14px;
          border-radius: 14px;
        }

        .summary-icon {
          width: 33px;
          height: 33px;
          margin-bottom: 11px;
          border-radius: 10px;
          font-size: 16px;
        }

        .summary-label {
          font-size: 11px;
        }

        .summary-value {
          margin-top: 6px;
          font-size: clamp(18px, 5vw, 23px);
        }

        .summary-note {
          font-size: 10px;
        }

        .panel {
          margin-bottom: 14px;
          padding: 15px;
          border-radius: 14px;
        }

        .section-heading h2 {
          font-size: 16px;
        }

        .section-heading p {
          font-size: 11px;
        }

        .search-row {
          grid-template-columns: minmax(0, 1fr);
          gap: 10px;
        }

        .search-row .btn {
          grid-column: auto;
          width: 100%;
        }

        .search-field,
        .client-select {
          width: 100%;
          min-height: 45px;
        }

        .selected-client-panel {
          padding: 15px;
        }

        .selected-client-header {
          flex-direction: column;
          gap: 15px;
        }

        .client-identity h2 {
          font-size: 18px;
        }

        .client-avatar {
          width: 44px;
          height: 44px;
          border-radius: 12px;
        }

        .client-actions {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          width: 100%;
        }

        .client-actions .btn {
          width: 100%;
        }

        .client-money-grid {
          grid-template-columns: minmax(0, 1fr);
          gap: 9px;
          margin-top: 17px;
        }

        .client-money-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 13px;
        }

        .client-money-card span {
          font-size: 12px;
        }

        .client-money-card strong {
          margin-top: 0;
          font-size: 19px;
          text-align: right;
        }

        .history-heading {
          align-items: flex-start;
        }

        .payment-row {
          display: grid;
          grid-template-columns: 39px minmax(0, 1fr);
          gap: 10px;
          padding: 12px;
        }

        .payment-method-icon {
          width: 39px;
          height: 39px;
          font-size: 17px;
        }

        .payment-details {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 5px;
        }

        .payment-details strong {
          font-size: 17px;
        }

        .payment-details span {
          font-size: 11px;
        }

        .payment-actions {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          width: 100%;
        }

        .payment-actions .btn {
          width: 100%;
          padding: 10px 8px;
        }

        .payments-footer {
          flex-direction: column;
          gap: 5px;
          padding: 5px 2px 10px;
        }

        .payment-modal-overlay {
          align-items: center;
          padding: 10px;
        }

        .payment-modal {
          width: 100%;
          max-width: 100%;
          max-height: 90dvh;
          padding: 17px;
          border-radius: 17px;
        }

        .modal-header {
          margin-bottom: 18px;
        }

        .modal-header h2 {
          font-size: 20px;
        }

        .modal-form {
          gap: 14px;
        }

        .modal-actions {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr);
          gap: 8px;
        }

        .modal-actions .btn {
          width: 100%;
          padding: 11px 8px;
          font-size: 12px;
        }

        .save-button {
          min-width: 0;
        }
      }

      @media (max-width: 360px) {
        .payments-page {
          padding: 9px;
        }

        .summary-card {
          padding: 11px;
        }

        .summary-value {
          font-size: 17px;
        }

        .panel {
          padding: 12px;
        }

        .history-count {
          font-size: 10px;
        }
      }
    `}</style>
  );
}