"use client";

import { Suspense, useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { useSearchParams } from "next/navigation";
import { db } from "../../lib/firebase";

type OldService = {
  name?: string;
  status?: string;
  ordered?: boolean;
};

type EventData = {
  id: string;
  clientId?: string;
  clientName?: string;
  mobile?: string;
  eventName?: string;
  weddingName?: string;
  eventType?: string;
  brideName?: string;
  groomName?: string;
  weddingDate?: string;
  venue?: string;
  packageName?: string;
  totalAmount?: number;
  advancePaid?: number;
  status?: string;
  notes?: string;
  services?: (string | OldService)[];
};

type Payment = {
  id: string;
  clientId?: string;
  clientName?: string;
  weddingId?: string;
  eventId?: string;
  amount?: number;
  paymentAmount?: number;
  paymentDate?: string;
  date?: string;
  note?: string;
  method?: string;
};

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "20px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
};

const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#6b7280",
  marginBottom: "5px",
};

const valueStyle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 600,
  color: "#111827",
};

function getServiceName(service: string | OldService) {
  if (typeof service === "string") {
    return service;
  }

  return service?.name || "Service";
}

function WeddingDetailsContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("id");

  const [event, setEvent] = useState<EventData | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    loadEvent();
  }, [eventId]);

  async function loadEvent() {
    if (!eventId) return;

    try {
      setLoading(true);

      const eventRef = doc(db, "weddings", eventId);
      const eventSnap = await getDoc(eventRef);

      if (!eventSnap.exists()) {
        setEvent(null);
        setLoading(false);
        return;
      }

      const eventData: EventData = {
        id: eventSnap.id,
        ...eventSnap.data(),
      } as EventData;

      setEvent(eventData);

      await loadPayments(eventData);
    } catch (error) {
      console.error("Error loading event:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadPayments(eventData: EventData) {
    try {
      const snapshot = await getDocs(
        collection(db, "payments")
      );

      const list: Payment[] = snapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        .filter((payment) => {
          const data = payment as Payment;

          return (
            data.weddingId === eventData.id ||
            data.eventId === eventData.id ||
            data.clientId === eventData.clientId
          );
        }) as Payment[];

      setPayments(list);
    } catch (error) {
      console.error("Error loading payments:", error);
      setPayments([]);
    }
  }

  function formatMoney(amount: number) {
    return `₹${amount.toLocaleString("en-IN")}`;
  }

  function getEventName() {
    if (!event) return "Event";

    return (
      event.eventName ||
      event.weddingName ||
      `${event.clientName || "Untitled"} Event`
    );
  }

  const totalAmount = Number(event?.totalAmount) || 0;

  const advancePaid = Number(event?.advancePaid) || 0;

  const paymentHistoryAmount = payments.reduce(
    (sum, payment) => {
      return (
        sum +
        (Number(payment.amount) ||
          Number(payment.paymentAmount) ||
          0)
      );
    },
    0
  );

  const totalPaid =
    paymentHistoryAmount > 0
      ? paymentHistoryAmount
      : advancePaid;

  const remainingAmount = totalAmount - totalPaid;

  const services = Array.isArray(event?.services)
    ? event.services
    : [];

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          color: "#6b7280",
        }}
      >
        Loading event...
      </div>
    );
  }

  if (!eventId) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "40px 20px",
          background: "#f8fafc",
        }}
      >
        <div
          style={{
            maxWidth: "700px",
            margin: "0 auto",
            ...cardStyle,
            textAlign: "center",
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            Event Not Selected
          </h2>

          <p style={{ color: "#6b7280" }}>
            Please open an event from the Events page.
          </p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "40px 20px",
          background: "#f8fafc",
        }}
      >
        <div
          style={{
            maxWidth: "700px",
            margin: "0 auto",
            ...cardStyle,
            textAlign: "center",
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            Event Not Found
          </h2>

          <p style={{ color: "#6b7280" }}>
            This event could not be found in Firebase.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "24px",
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
            alignItems: "flex-start",
            gap: "15px",
            flexWrap: "wrap",
            marginBottom: "24px",
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
              {getEventName()}
            </h1>

            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                marginTop: "9px",
              }}
            >
              <span
                style={{
                  background: "#dbeafe",
                  color: "#1d4ed8",
                  padding: "5px 10px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                {event.eventType || "Event"}
              </span>

              <span
                style={{
                  background: "#f3f4f6",
                  color: "#374151",
                  padding: "5px 10px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                {event.status || "Pending"}
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "16px",
          }}
        >
          <div style={cardStyle}>
            <div style={labelStyle}>CLIENT</div>

            <div style={valueStyle}>
              {event.clientName || "No client"}
            </div>

            {event.mobile && (
              <div
                style={{
                  marginTop: "7px",
                  color: "#6b7280",
                  fontSize: "13px",
                }}
              >
                📱 {event.mobile}
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>EVENT DATE</div>

            <div style={valueStyle}>
              {event.weddingDate || "Not selected"}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>VENUE</div>

            <div style={valueStyle}>
              {event.venue || "Not added"}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>PACKAGE</div>

            <div style={valueStyle}>
              {event.packageName || "No package"}
            </div>
          </div>
        </div>

        {(event.brideName || event.groomName) && (
          <div
            style={{
              ...cardStyle,
              marginBottom: "16px",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                fontSize: "19px",
                color: "#111827",
              }}
            >
              Couple Details
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
              }}
            >
              <div>
                <div style={labelStyle}>BRIDE</div>

                <div style={valueStyle}>
                  {event.brideName || "-"}
                </div>
              </div>

              <div>
                <div style={labelStyle}>GROOM</div>

                <div style={valueStyle}>
                  {event.groomName || "-"}
                </div>
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            ...cardStyle,
            marginBottom: "16px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              fontSize: "19px",
              color: "#111827",
            }}
          >
            Services
          </h2>

          {services.length === 0 ? (
            <p
              style={{
                marginBottom: 0,
                color: "#6b7280",
              }}
            >
              No services selected.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              {services.map((service, index) => (
                <span
                  key={`${event.id}-service-${index}`}
                  style={{
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    border: "1px solid #bfdbfe",
                    padding: "7px 11px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  {getServiceName(service)}
                </span>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "16px",
          }}
        >
          <div style={cardStyle}>
            <div style={labelStyle}>TOTAL AMOUNT</div>

            <div
              style={{
                ...valueStyle,
                fontSize: "21px",
              }}
            >
              {formatMoney(totalAmount)}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>TOTAL PAID</div>

            <div
              style={{
                ...valueStyle,
                fontSize: "21px",
                color: "#16a34a",
              }}
            >
              {formatMoney(totalPaid)}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>REMAINING</div>

            <div
              style={{
                ...valueStyle,
                fontSize: "21px",
                color:
                  remainingAmount > 0
                    ? "#dc2626"
                    : "#16a34a",
              }}
            >
              {formatMoney(
                Math.max(remainingAmount, 0)
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            ...cardStyle,
            marginBottom: "16px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              fontSize: "19px",
              color: "#111827",
            }}
          >
            Payment History
          </h2>

          {payments.length === 0 ? (
            <p
              style={{
                marginBottom: 0,
                color: "#6b7280",
              }}
            >
              No payment history found.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "10px",
              }}
            >
              {payments.map((payment) => {
                const amount =
                  Number(payment.amount) ||
                  Number(payment.paymentAmount) ||
                  0;

                return (
                  <div
                    key={payment.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "15px",
                      flexWrap: "wrap",
                      padding: "12px",
                      background: "#f8fafc",
                      borderRadius: "9px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "#111827",
                        }}
                      >
                        {payment.paymentDate ||
                          payment.date ||
                          "Payment"}
                      </div>

                      {payment.method && (
                        <div
                          style={{
                            marginTop: "3px",
                            fontSize: "12px",
                            color: "#6b7280",
                          }}
                        >
                          {payment.method}
                        </div>
                      )}

                      {payment.note && (
                        <div
                          style={{
                            marginTop: "3px",
                            fontSize: "12px",
                            color: "#6b7280",
                          }}
                        >
                          {payment.note}
                        </div>
                      )}
                    </div>

                    <strong
                      style={{
                        color: "#16a34a",
                      }}
                    >
                      {formatMoney(amount)}
                    </strong>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {event.notes && (
          <div style={cardStyle}>
            <h2
              style={{
                marginTop: 0,
                fontSize: "19px",
                color: "#111827",
              }}
            >
              Notes
            </h2>

            <p
              style={{
                marginBottom: 0,
                color: "#4b5563",
                whiteSpace: "pre-wrap",
              }}
            >
              {event.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        color: "#6b7280",
      }}
    >
      Loading event...
    </div>
  );
}

export default function WeddingDetailsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <WeddingDetailsContent />
    </Suspense>
  );
}