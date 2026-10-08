"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";

export default function ClientDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClient() {
      try {
        const { id } = await params;

        const clientRef = doc(db, "clients", id);
        const snapshot = await getDoc(clientRef);

        if (snapshot.exists()) {
          setClient({
            id: snapshot.id,
            ...snapshot.data(),
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadClient();
  }, [params]);

  if (loading) {
    return (
      <main className="loading-page">
        <div className="loading-card">
          <div className="loading-circle"></div>
          <h2>Loading Client...</h2>
          <p>Please wait</p>
        </div>

        <style jsx>{`
          .loading-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f6fa;
            font-family: Arial, sans-serif;
          }

          .loading-card {
            background: white;
            padding: 35px;
            border-radius: 18px;
            text-align: center;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.07);
          }

          .loading-card h2 {
            margin: 15px 0 5px;
            color: #111827;
            font-size: 20px;
          }

          .loading-card p {
            margin: 0;
            color: #6b7280;
            font-size: 13px;
          }

          .loading-circle {
            width: 40px;
            height: 40px;
            margin: 0 auto;
            border: 4px solid #e5e7eb;
            border-top-color: #111827;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </main>
    );
  }

  if (!client) {
    return (
      <main className="not-found-page">
        <div className="not-found-card">
          <div className="not-found-icon">👤</div>

          <h2>Client not found</h2>

          <p>
            This client could not be found in your WedFlow
            database.
          </p>

          <a href="/clients" className="back-button">
            ← Back to Clients
          </a>
        </div>

        <style jsx>{`
          .not-found-page {
            min-height: 100vh;
            padding: 25px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f6fa;
            font-family: Arial, sans-serif;
          }

          .not-found-card {
            width: 100%;
            max-width: 450px;
            background: white;
            padding: 35px 25px;
            border-radius: 18px;
            text-align: center;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.07);
          }

          .not-found-icon {
            font-size: 42px;
            margin-bottom: 12px;
          }

          .not-found-card h2 {
            margin: 0;
            color: #111827;
            font-size: 23px;
          }

          .not-found-card p {
            color: #6b7280;
            font-size: 14px;
            line-height: 1.6;
            margin: 10px 0 22px;
          }

          .back-button {
            display: inline-block;
            padding: 13px 20px;
            background: #111827;
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 800;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container">

        {/* Top Bar */}
        <div className="topbar">
          <a href="/clients" className="back-link">
            ← Back to Clients
          </a>

          <div className="top-title">
            <span>CLIENT DETAILS</span>
            <h1>Client Profile</h1>
          </div>

          <div className="top-space"></div>
        </div>

        {/* Client Header */}
        <section className="profile-card">

          <div className="profile-left">
            <div className="profile-avatar">
              {client.clientName
                ? String(client.clientName)
                    .charAt(0)
                    .toUpperCase()
                : "C"}
            </div>

            <div>
              <h2>{client.clientName || "Unnamed Client"}</h2>

              <p>
                WedFlow Client
                {client.mobile
                  ? ` • ${client.mobile}`
                  : ""}
              </p>
            </div>
          </div>

          <div className="profile-badge">
            CLIENT
          </div>
        </section>

        {/* Main Information */}
        <section className="content-grid">

          {/* Client Information */}
          <div className="card">

            <div className="card-header">
              <div>
                <span className="section-label">
                  INFORMATION
                </span>

                <h3>Client Information</h3>
              </div>

              <div className="header-icon">
                👤
              </div>
            </div>

            <div className="details">

              <Detail
                label="Client Name"
                value={client.clientName}
              />

              <Detail
                label="Mobile Number"
                value={client.mobile}
              />

              <Detail
                label="Bride Name"
                value={client.brideName}
              />

              <Detail
                label="Groom Name"
                value={client.groomName}
              />

              <Detail
                label="Wedding Date"
                value={client.weddingDate}
              />

              <Detail
                label="Package"
                value={client.packageName}
                last
              />

            </div>
          </div>

          {/* Payment Summary */}
          <div className="card">

            <div className="card-header">
              <div>
                <span className="section-label">
                  FINANCE
                </span>

                <h3>Payment Summary</h3>
              </div>

              <div className="header-icon">
                ₹
              </div>
            </div>

            <div className="payment-list">

              <div className="payment-row">
                <span>Total Amount</span>

                <strong>
                  ₹
                  {Number(
                    client.totalAmount || 0
                  ).toLocaleString("en-IN")}
                </strong>
              </div>

              <div className="payment-row">
                <span>Advance Paid</span>

                <strong>
                  ₹
                  {Number(
                    client.advancePaid || 0
                  ).toLocaleString("en-IN")}
                </strong>
              </div>

            </div>

            {/* Remaining */}
            <div className="remaining-card">

              <div>
                <span>Remaining Amount</span>

                <small>
                  Pending payment
                </small>
              </div>

              <strong>
                ₹
                {Number(
                  client.remainingAmount || 0
                ).toLocaleString("en-IN")}
              </strong>

            </div>

          </div>

        </section>

        {/* Buttons */}
        <section className="actions-card">

          <div>
            <span className="section-label">
              QUICK ACTIONS
            </span>

            <h3>Manage Client</h3>
          </div>

          <div className="buttons">

            <a
              href="/clients"
              className="button primary"
            >
              ← All Clients
            </a>

            <a
              href="/payments"
              className="button secondary"
            >
              💰 Payments
            </a>

          </div>

        </section>

      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background: #f5f6fa;
          padding: 24px;
          font-family: Arial, Helvetica, sans-serif;
          color: #111827;
        }

        .container {
          width: 100%;
          max-width: 1000px;
          margin: 0 auto;
        }

        /* Top Bar */

        .topbar {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          margin-bottom: 22px;
        }

        .back-link {
          justify-self: start;
          color: #111827;
          text-decoration: none;
          font-weight: 800;
          font-size: 14px;
          padding: 9px 13px;
          border-radius: 9px;
        }

        .back-link:hover {
          background: #e5e7eb;
        }

        .top-title {
          text-align: center;
        }

        .top-title span {
          color: #6b7280;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .top-title h1 {
          margin: 4px 0 0;
          font-size: 22px;
          font-weight: 800;
        }

        .top-space {
          width: 100%;
        }

        /* Profile */

        .profile-card {
          background: #111827;
          color: white;
          border-radius: 18px;
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
          margin-bottom: 20px;
        }

        .profile-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .profile-avatar {
          width: 58px;
          height: 58px;
          border-radius: 15px;
          background: #312e81;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 800;
          flex-shrink: 0;
        }

        .profile-left h2 {
          margin: 0;
          font-size: 23px;
          font-weight: 800;
        }

        .profile-left p {
          margin: 7px 0 0;
          color: #d1d5db;
          font-size: 13px;
          font-weight: 600;
        }

        .profile-badge {
          background: #312e81;
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        /* Grid */

        .content-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 22px;
          box-shadow: 0 3px 15px rgba(0, 0, 0, 0.04);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .section-label {
          display: block;
          color: #9ca3af;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.2px;
          margin-bottom: 4px;
        }

        .card-header h3 {
          margin: 0;
          font-size: 19px;
          font-weight: 800;
        }

        .header-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }

        /* Details */

        .details {
          margin-top: 10px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          padding: 14px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .detail-row.last {
          border-bottom: 0;
        }

        .detail-label {
          color: #6b7280;
          font-size: 13px;
          font-weight: 700;
        }

        .detail-value {
          color: #111827;
          font-size: 14px;
          font-weight: 800;
          text-align: right;
          word-break: break-word;
        }

        /* Payment */

        .payment-list {
          margin-top: 12px;
        }

        .payment-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 16px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .payment-row span {
          color: #6b7280;
          font-size: 14px;
          font-weight: 700;
        }

        .payment-row strong {
          color: #111827;
          font-size: 17px;
          font-weight: 800;
        }

        .remaining-card {
          margin-top: 18px;
          padding: 18px;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .remaining-card span {
          display: block;
          color: #111827;
          font-size: 14px;
          font-weight: 800;
        }

        .remaining-card small {
          display: block;
          margin-top: 4px;
          color: #6b7280;
          font-size: 11px;
        }

        .remaining-card strong {
          color: #111827;
          font-size: 21px;
          font-weight: 800;
          white-space: nowrap;
        }

        /* Actions */

        .actions-card {
          margin-top: 20px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 20px 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          box-shadow: 0 3px 15px rgba(0, 0, 0, 0.04);
        }

        .actions-card h3 {
          margin: 0;
          font-size: 18px;
        }

        .buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .button {
          padding: 12px 17px;
          border-radius: 10px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 800;
          transition: 0.2s;
        }

        .button.primary {
          background: #111827;
          color: white;
        }

        .button.secondary {
          background: #374151;
          color: white;
        }

        .button:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        /* Mobile */

        @media (max-width: 750px) {
          .page {
            padding: 15px;
          }

          .topbar {
            grid-template-columns: 1fr auto 1fr;
            margin-bottom: 16px;
          }

          .back-link {
            font-size: 13px;
            padding: 7px 8px;
          }

          .top-title span {
            font-size: 9px;
          }

          .top-title h1 {
            font-size: 18px;
          }

          .profile-card {
            padding: 18px;
            border-radius: 15px;
          }

          .profile-left {
            gap: 12px;
          }

          .profile-avatar {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            font-size: 20px;
          }

          .profile-left h2 {
            font-size: 18px;
          }

          .profile-left p {
            font-size: 11px;
          }

          .profile-badge {
            display: none;
          }

          .content-grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .card {
            padding: 18px;
            border-radius: 14px;
          }

          .card-header h3 {
            font-size: 17px;
          }

          .detail-row {
            align-items: flex-start;
          }

          .detail-label {
            font-size: 12px;
          }

          .detail-value {
            font-size: 13px;
            max-width: 55%;
          }

          .remaining-card {
            padding: 15px;
          }

          .remaining-card strong {
            font-size: 18px;
          }

          .actions-card {
            flex-direction: column;
            align-items: stretch;
            padding: 18px;
          }

          .buttons {
            width: 100%;
          }

          .button {
            flex: 1;
            text-align: center;
            min-width: 130px;
          }
        }

        @media (max-width: 420px) {
          .top-title {
            display: none;
          }

          .topbar {
            display: flex;
            justify-content: flex-start;
          }

          .profile-left h2 {
            font-size: 17px;
          }

          .profile-left p {
            font-size: 10px;
          }

          .payment-row strong {
            font-size: 15px;
          }

          .remaining-card {
            flex-direction: column;
            align-items: flex-start;
          }

          .remaining-card strong {
            font-size: 20px;
          }

          .buttons {
            flex-direction: column;
          }

          .button {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}

function Detail({
  label,
  value,
  last = false,
}: {
  label: string;
  value?: any;
  last?: boolean;
}) {
  return (
    <div className={`detail-row ${last ? "last" : ""}`}>
      <span className="detail-label">{label}</span>

      <span className="detail-value">
        {value || "-"}
      </span>
    </div>
  );
}