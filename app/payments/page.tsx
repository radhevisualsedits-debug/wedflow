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

  const selectedClient = useMemo(() => {
    return clients.find(
      (client) => client.id === selectedClientId
    );
  }, [clients, selectedClientId]);

  const clientPayments = useMemo(() => {
    if (!selectedClientId) return [];

    return payments
      .filter(
        (payment) =>
          payment.clientId === selectedClientId
      )
      .sort((a, b) => {
        const dateA = a.paymentDate || "";
        const dateB = b.paymentDate || "";

        return dateB.localeCompare(dateA);
      });
  }, [payments, selectedClientId]);

  const selectedClientPaymentTotal = useMemo(() => {
    if (!selectedClientId) return 0;

    return payments
      .filter(
        (payment) =>
          payment.clientId === selectedClientId
      )
      .reduce(
        (total, payment) =>
          total + Number(payment.amount || 0),
        0
      );
  }, [payments, selectedClientId]);

  const selectedTotal = Number(
    selectedClient?.totalAmount || 0
  );

  const selectedPaid =
    selectedClientPaymentTotal > 0
      ? selectedClientPaymentTotal
      : Number(selectedClient?.advancePaid || 0);

  const selectedPending = Math.max(
    0,
    selectedTotal - selectedPaid
  );

  const filteredClients = useMemo(() => {
    const searchQuery = search.trim().toLowerCase();

    if (!searchQuery) return clients;

    return clients.filter((client) => {
      return (
        String(client.clientName || "")
          .toLowerCase()
          .includes(searchQuery) ||
        String(client.eventName || "")
          .toLowerCase()
          .includes(searchQuery) ||
        String(client.mobile || "")
          .toLowerCase()
          .includes(searchQuery)
      );
    });
  }, [clients, search]);

  const pendingClients = useMemo(() => {
    return clients.filter((client) => {
      const total = Number(client.totalAmount || 0);

      const paidFromPayments = payments
        .filter(
          (payment) =>
            payment.clientId === client.id
        )
        .reduce(
          (sum, payment) =>
            sum + Number(payment.amount || 0),
          0
        );

      const paid =
        paidFromPayments > 0
          ? paidFromPayments
          : Number(client.advancePaid || 0);

      return total - paid > 0;
    });
  }, [clients, payments]);

  const totalRevenue = useMemo(() => {
    return clients.reduce(
      (sum, client) =>
        sum + Number(client.totalAmount || 0),
      0
    );
  }, [clients]);

  const totalPaid = useMemo(() => {
    return clients.reduce((sum, client) => {
      const paymentTotal = payments
        .filter(
          (payment) =>
            payment.clientId === client.id
        )
        .reduce(
          (paymentSum, payment) =>
            paymentSum + Number(payment.amount || 0),
          0
        );

      if (paymentTotal > 0) {
        return sum + paymentTotal;
      }

      return sum + Number(client.advancePaid || 0);
    }, 0);
  }, [clients, payments]);

  const totalPending = Math.max(
    0,
    totalRevenue - totalPaid
  );

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

        await loadData(user.uid);
      }
    );

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

      const [clientsSnapshot, paymentsSnapshot] =
        await Promise.all([
          getDocs(clientsQuery),
          getDocs(paymentsQuery),
        ]);

      const loadedClients: Client[] =
        clientsSnapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as Client[];

      const loadedPayments: Payment[] =
        paymentsSnapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as Payment[];

      loadedClients.sort((a, b) =>
        String(a.clientName || "").localeCompare(
          String(b.clientName || "")
        )
      );

      loadedPayments.sort((a, b) => {
        const dateA = a.paymentDate || "";
        const dateB = b.paymentDate || "";

        return dateB.localeCompare(dateA);
      });

      setClients(loadedClients);
      setPayments(loadedPayments);
    } catch (error) {
      console.error("Payments loading error:", error);

      alert(
        "Payments load કરવામાં error આવ્યો."
      );
    } finally {
      setLoading(false);
    }
  }

  function getTodayDate() {
    const today = new Date();

    return new Date(
      today.getTime() -
        today.getTimezoneOffset() * 60000
    )
      .toISOString()
      .split("T")[0];
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

    setAmount(
      payment.amount !== undefined
        ? String(payment.amount)
        : ""
    );

    setPaymentDate(
      payment.paymentDate || ""
    );

    setPaymentMethod(
      payment.paymentMethod || "💳 UPI"
    );

    setShowPaymentForm(true);
  }

  function closePaymentForm() {
    setShowPaymentForm(false);
    resetPaymentForm();
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

    const paymentAmount = Number(amount || 0);

    if (paymentAmount <= 0) {
      alert("Payment amount નાખો.");
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

    if (
      !editingPaymentId &&
      selectedTotal > 0 &&
      paymentAmount > selectedPending
    ) {
      const confirmed = window.confirm(
        `Pending payment ${money(
          selectedPending
        )} છે, પરંતુ તમે ${money(
          paymentAmount
        )} નાખી રહ્યા છો.\n\nઆ payment save કરવો છે?`
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
        const existingPayment = payments.find(
          (payment) =>
            payment.id === editingPaymentId
        );

        if (!existingPayment) {
          alert("Payment મળ્યો નથી.");
          return;
        }

        if (existingPayment.studioId !== userId) {
          alert("આ payment તમારા studio નો નથી.");
          return;
        }

        await updateDoc(
          doc(
            db,
            "payments",
            editingPaymentId
          ),
          paymentData
        );
      } else {
        await addDoc(
          collection(db, "payments"),
          {
            ...paymentData,
            createdAt: new Date(),
          }
        );
      }

      await updateClientPayment(
        selectedClientId
      );

      await loadData(userId);

      setShowPaymentForm(false);
      resetPaymentForm();
    } catch (error) {
      console.error(
        "Payment save error:",
        error
      );

      alert(
        "Payment save કરવામાં error આવ્યો."
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateClientPayment(
    clientId: string
  ) {
    const client = clients.find(
      (item) => item.id === clientId
    );

    if (!client) return;

    if (client.studioId !== userId) {
      return;
    }

    const paymentsQuery = query(
      collection(db, "payments"),
      where("studioId", "==", userId),
      where("clientId", "==", clientId)
    );

    const paymentSnapshot = await getDocs(
      paymentsQuery
    );

    let paymentTotal = 0;

    paymentSnapshot.forEach((item) => {
      const data = item.data();

      paymentTotal += Number(
        data.amount || 0
      );
    });

    const oldAdvance = Number(
      client.advancePaid || 0
    );

    const newAdvance =
      paymentTotal > 0
        ? paymentTotal
        : oldAdvance;

    const total = Number(
      client.totalAmount || 0
    );

    const remaining = Math.max(
      0,
      total - newAdvance
    );

    await updateDoc(
      doc(db, "clients", clientId),
      {
        advancePaid: newAdvance,
        remainingAmount: remaining,
        updatedAt: new Date(),
      }
    );
  }

  async function deletePayment(
    payment: Payment
  ) {
    if (!userId) return;

    if (payment.studioId !== userId) {
      alert("આ payment તમારા studio નો નથી.");
      return;
    }

    const confirmed = window.confirm(
      `આ ${money(
        Number(payment.amount || 0)
      )} payment delete કરવો છે?`
    );

    if (!confirmed) return;

    try {
      await deleteDoc(
        doc(db, "payments", payment.id)
      );

      await updateClientPayment(
        payment.clientId || ""
      );

      await loadData(userId);
    } catch (error) {
      console.error(
        "Payment delete error:",
        error
      );

      alert(
        "Payment delete કરવામાં error આવ્યો."
      );
    }
  }

  function sendWhatsAppReminder(
    client: Client
  ) {
    const mobile = normalizeMobile(
      client.mobile
    );

    if (!mobile) {
      alert(
        "આ client નો mobile number નથી."
      );
      return;
    }

    const paymentTotal = payments
      .filter(
        (payment) =>
          payment.clientId === client.id
      )
      .reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );

    const total = Number(
      client.totalAmount || 0
    );

    const paid =
      paymentTotal > 0
        ? paymentTotal
        : Number(client.advancePaid || 0);

    const pending = Math.max(
      0,
      total - paid
    );

    if (pending <= 0) {
      alert(
        "આ client નું કોઈ pending payment નથી."
      );
      return;
    }

    const message =
      `Hello ${client.clientName || "Client"},\n\n` +
      `Your payment of ${money(
        pending
      )} is pending for ${
        client.eventName || "your event"
      }.\n\n` +
      `Total Amount: ${money(total)}\n` +
      `Paid: ${money(paid)}\n` +
      `Pending: ${money(pending)}\n\n` +
      `Thank you.\n` +
      `Radhe Visuals`;

    const url =
      `https://wa.me/${mobile}` +
      `?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank");
  }

  if (authLoading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
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
          fontFamily: "Arial, sans-serif",
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

          <p style={{ color: "#6b7280" }}>
            Payments જોવા માટે પહેલા WedFlow માં
            login કરો.
          </p>

          <button
            onClick={() => {
              window.location.href = "/login";
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
        fontFamily: "Arial, sans-serif",
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
            justifyContent: "space-between",
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
              💰 Payments
            </h1>

            <p
              style={{
                margin: "6px 0 0",
                color: "#6b7280",
              }}
            >
              તમારા studio ના બધા payments manage કરો
            </p>
          </div>

          <button
            onClick={() => openAddPayment()}
            style={{
              border: "none",
              background: "#111827",
              color: "white",
              padding: "13px 20px",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            + Add Payment
          </button>
        </div>

        {/* SUMMARY */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(200px, 1fr))",
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
              Total Revenue
            </div>

            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                marginTop: 5,
              }}
            >
              {money(totalRevenue)}
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
              Total Paid
            </div>

            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: "#166534",
                marginTop: 5,
              }}
            >
              {money(totalPaid)}
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
              Total Pending
            </div>

            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color:
                  totalPending > 0
                    ? "#dc2626"
                    : "#166534",
                marginTop: 5,
              }}
            >
              {money(totalPending)}
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
              Pending Clients
            </div>

            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: "#dc2626",
                marginTop: 5,
              }}
            >
              {pendingClients.length}
            </div>
          </div>
        </div>

        {/* CLIENT SELECT */}

        <div
          style={{
            background: "white",
            padding: 18,
            borderRadius: 16,
            boxShadow:
              "0 4px 18px rgba(0,0,0,0.05)",
            marginBottom: 20,
          }}
        >
          <div
            style={{
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
              placeholder="Search client, event, mobile..."
              style={{
                flex: 1,
                minWidth: 240,
                padding: "12px 14px",
                border: "1px solid #d1d5db",
                borderRadius: 10,
                outline: "none",
              }}
            />

            <select
              value={selectedClientId}
              onChange={(e) =>
                setSelectedClientId(
                  e.target.value
                )
              }
              style={{
                flex: 1,
                minWidth: 260,
                padding: "12px 14px",
                border: "1px solid #d1d5db",
                borderRadius: 10,
                background: "white",
              }}
            >
              <option value="">
                Select Client
              </option>

              {filteredClients.map(
                (client) => (
                  <option
                    key={client.id}
                    value={client.id}
                  >
                    {client.clientName ||
                      "Unnamed Client"}
                    {client.eventName
                      ? ` - ${client.eventName}`
                      : ""}
                  </option>
                )
              )}
            </select>

            <button
              onClick={() =>
                openAddPayment(
                  selectedClientId ||
                    undefined
                )
              }
              style={{
                border: "none",
                background: "#111827",
                color: "white",
                padding: "12px 18px",
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              + Payment
            </button>
          </div>
        </div>

        {/* SELECTED CLIENT SUMMARY */}

        {selectedClient && (
          <div
            style={{
              background: "white",
              padding: 20,
              borderRadius: 18,
              marginBottom: 20,
              boxShadow:
                "0 4px 18px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 15,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 21,
                  }}
                >
                  {selectedClient.clientName ||
                    "Client"}
                </h2>

                <div
                  style={{
                    color: "#6b7280",
                    marginTop: 5,
                    fontSize: 14,
                  }}
                >
                  {selectedClient.eventName ||
                    "Event"}
                </div>

                {selectedClient.mobile && (
                  <div
                    style={{
                      color: "#6b7280",
                      marginTop: 4,
                      fontSize: 13,
                    }}
                  >
                    📱 {selectedClient.mobile}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {selectedPending > 0 && (
                  <button
                    onClick={() =>
                      sendWhatsAppReminder(
                        selectedClient
                      )
                    }
                    style={{
                      border: "none",
                      background: "#25D366",
                      color: "white",
                      padding: "10px 14px",
                      borderRadius: 10,
                      cursor: "pointer",
                      fontWeight: 800,
                    }}
                  >
                    💬 WhatsApp Reminder
                  </button>
                )}

                <button
                  onClick={() =>
                    openAddPayment(
                      selectedClient.id
                    )
                  }
                  style={{
                    border: "none",
                    background: "#111827",
                    color: "white",
                    padding: "10px 14px",
                    borderRadius: 10,
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  + Add Payment
                </button>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, 1fr)",
                gap: 12,
                marginTop: 18,
              }}
            >
              <div
                style={{
                  background: "#f9fafb",
                  padding: 14,
                  borderRadius: 12,
                }}
              >
                <div
                  style={{
                    color: "#6b7280",
                    fontSize: 12,
                  }}
                >
                  Total Amount
                </div>

                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    marginTop: 4,
                  }}
                >
                  {money(selectedTotal)}
                </div>
              </div>

              <div
                style={{
                  background: "#f0fdf4",
                  padding: 14,
                  borderRadius: 12,
                }}
              >
                <div
                  style={{
                    color: "#166534",
                    fontSize: 12,
                  }}
                >
                  Paid
                </div>

                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: "#166534",
                    marginTop: 4,
                  }}
                >
                  {money(selectedPaid)}
                </div>
              </div>

              <div
                style={{
                  background:
                    selectedPending > 0
                      ? "#fef2f2"
                      : "#f0fdf4",
                  padding: 14,
                  borderRadius: 12,
                }}
              >
                <div
                  style={{
                    color:
                      selectedPending > 0
                        ? "#991b1b"
                        : "#166534",
                    fontSize: 12,
                  }}
                >
                  Pending
                </div>

                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color:
                      selectedPending > 0
                        ? "#dc2626"
                        : "#166534",
                    marginTop: 4,
                  }}
                >
                  {money(selectedPending)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAYMENT HISTORY */}

        <div
          style={{
            background: "white",
            borderRadius: 18,
            padding: 20,
            boxShadow:
              "0 4px 18px rgba(0,0,0,0.05)",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: 18,
              fontSize: 21,
            }}
          >
            💳 Payment History
          </h2>

          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: 35,
                color: "#6b7280",
              }}
            >
              Payments loading...
            </div>
          ) : !selectedClientId ? (
            <div
              style={{
                textAlign: "center",
                padding: 35,
                color: "#6b7280",
              }}
            >
              ઉપરથી Client select કરો.
            </div>
          ) : clientPayments.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 35,
                color: "#6b7280",
              }}
            >
              આ client માટે હજુ કોઈ payment નથી.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 10,
              }}
            >
              {clientPayments.map(
                (payment) => (
                  <div
                    key={payment.id}
                    style={{
                      border:
                        "1px solid #e5e7eb",
                      borderRadius: 12,
                      padding: 14,
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "center",
                      gap: 15,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 17,
                        }}
                      >
                        {money(
                          Number(
                            payment.amount || 0
                          )
                        )}
                      </div>

                      <div
                        style={{
                          color: "#6b7280",
                          fontSize: 13,
                          marginTop: 4,
                        }}
                      >
                        {formatDate(
                          payment.paymentDate
                        )}{" "}
                        •{" "}
                        {payment.paymentMethod ||
                          "Other"}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                      }}
                    >
                      <button
                        onClick={() =>
                          editPayment(
                            payment
                          )
                        }
                        style={{
                          border: "none",
                          background:
                            "#eef2ff",
                          color: "#3730a3",
                          padding:
                            "9px 12px",
                          borderRadius: 8,
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        ✏️ Edit
                      </button>

                      <button
                        onClick={() =>
                          deletePayment(
                            payment
                          )
                        }
                        style={{
                          border: "none",
                          background:
                            "#fee2e2",
                          color: "#991b1b",
                          padding:
                            "9px 12px",
                          borderRadius: 8,
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* ADD PAYMENT MODAL */}

      {showPaymentForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 550,
              background: "white",
              borderRadius: 20,
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <h2
                style={{
                  margin: 0,
                }}
              >
                {editingPaymentId
                  ? "✏️ Edit Payment"
                  : "💰 Add Payment"}
              </h2>

              <button
                onClick={closePaymentForm}
                style={{
                  border: "none",
                  background: "#f3f4f6",
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
                display: "grid",
                gap: 16,
              }}
            >
              {/* CLIENT */}

              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: 700,
                    fontSize: 13,
                    marginBottom: 7,
                  }}
                >
                  Client *
                </label>

                <select
                  value={selectedClientId}
                  onChange={(e) =>
                    setSelectedClientId(
                      e.target.value
                    )
                  }
                  style={{
                    width: "100%",
                    padding: "12px 13px",
                    border:
                      "1px solid #d1d5db",
                    borderRadius: 10,
                    background: "white",
                  }}
                >
                  <option value="">
                    Select Client
                  </option>

                  {clients.map(
                    (client) => (
                      <option
                        key={client.id}
                        value={client.id}
                      >
                        {client.clientName ||
                          "Unnamed Client"}
                        {client.eventName
                          ? ` - ${client.eventName}`
                          : ""}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* CLIENT SUMMARY */}

              {selectedClient && (
                <div
                  style={{
                    background: "#f9fafb",
                    padding: 14,
                    borderRadius: 12,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                    }}
                  >
                    {selectedClient.clientName ||
                      "Client"}
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 13,
                      color: "#6b7280",
                    }}
                  >
                    Total:{" "}
                    {money(selectedTotal)}
                    {" • "}
                    Pending:{" "}
                    {money(selectedPending)}
                  </div>
                </div>
              )}

              {/* AMOUNT */}

              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: 700,
                    fontSize: 13,
                    marginBottom: 7,
                  }}
                >
                  Payment Amount *
                </label>

                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) =>
                    setAmount(
                      e.target.value
                    )
                  }
                  placeholder="10000"
                  style={{
                    width: "100%",
                    boxSizing:
                      "border-box",
                    padding: "12px 13px",
                    border:
                      "1px solid #d1d5db",
                    borderRadius: 10,
                  }}
                />
              </div>

              {/* DATE */}

              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: 700,
                    fontSize: 13,
                    marginBottom: 7,
                  }}
                >
                  Payment Date *
                </label>

                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) =>
                    setPaymentDate(
                      e.target.value
                    )
                  }
                  style={{
                    width: "100%",
                    boxSizing:
                      "border-box",
                    padding: "12px 13px",
                    border:
                      "1px solid #d1d5db",
                    borderRadius: 10,
                  }}
                />
              </div>

              {/* METHOD */}

              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: 700,
                    fontSize: 13,
                    marginBottom: 7,
                  }}
                >
                  Payment Method
                </label>

                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(
                      e.target.value
                    )
                  }
                  style={{
                    width: "100%",
                    padding: "12px 13px",
                    border:
                      "1px solid #d1d5db",
                    borderRadius: 10,
                    background: "white",
                  }}
                >
                  {paymentMethods.map(
                    (method) => (
                      <option
                        key={method}
                        value={method}
                      >
                        {method}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            {/* BUTTONS */}

            <div
              style={{
                display: "flex",
                justifyContent:
                  "flex-end",
                gap: 10,
                marginTop: 24,
                paddingTop: 18,
                borderTop:
                  "1px solid #e5e7eb",
              }}
            >
              <button
                onClick={closePaymentForm}
                disabled={saving}
                style={{
                  border:
                    "1px solid #d1d5db",
                  background: "white",
                  color: "#374151",
                  padding:
                    "12px 18px",
                  borderRadius: 10,
                  cursor: saving
                    ? "not-allowed"
                    : "pointer",
                  fontWeight: 700,
                }}
              >
                Cancel
              </button>

              <button
                onClick={savePayment}
                disabled={saving}
                style={{
                  border: "none",
                  background: "#111827",
                  color: "white",
                  padding:
                    "12px 20px",
                  borderRadius: 10,
                  cursor: saving
                    ? "not-allowed"
                    : "pointer",
                  fontWeight: 800,
                }}
              >
                {saving
                  ? "Saving..."
                  : editingPaymentId
                  ? "Update Payment"
                  : "Save Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}