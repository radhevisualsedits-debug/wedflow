
function PaymentStyles() {
  return (
    <style jsx global>{`
      * {
        box-sizing: border-box;
      }

      .payments-page,
      .payment-loading {
        min-height: 100vh;
        width: 100%;
        padding: 20px;
        background: #f4f6fb;
        color: #172033;
        font-family: Arial, Helvetica, sans-serif;
        overflow-x: hidden;
        font-size: 18px;
        line-height: 1.6;
      }

      .payments-container {
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
      }

      .payments-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 18px;
        margin-bottom: 24px;
      }

      .eyebrow {
        color: #5b6478;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 1px;
        margin-bottom: 8px;
      }

      .payments-header h1 {
        margin: 0;
        font-size: 34px;
        line-height: 1.3;
        font-weight: 800;
      }

      .subtitle {
        margin-top: 8px;
        color: #566176;
        font-size: 17px;
      }

      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 48px;
        padding: 12px 18px;
        border: 1px solid transparent;
        border-radius: 12px;
        font-family: inherit;
        font-size: 17px;
        font-weight: 750;
        line-height: 1.4;
        cursor: pointer;
        white-space: normal;
      }

      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .btn-primary {
        color: white;
        background: #4338ca;
      }

      .btn-dark {
        color: white;
        background: #182033;
      }

      .btn-whatsapp {
        color: #126b36;
        background: #e7f9ed;
        border-color: #b9e8c9;
      }

      .btn-edit {
        color: #3730a3;
        background: #eef2ff;
      }

      .btn-delete {
        color: #b42318;
        background: #fff0f0;
      }

      .btn-cancel {
        color: #374151;
        background: white;
        border-color: #d1d5db;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
        margin-bottom: 20px;
      }

      .summary-card {
        min-width: 0;
        padding: 20px;
        background: white;
        border: 1px solid #e0e5ef;
        border-radius: 16px;
        box-shadow: 0 3px 12px #1820330a;
      }

      .summary-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        margin-bottom: 13px;
        border-radius: 12px;
        font-size: 23px;
        font-weight: 800;
      }

      .revenue-icon,
      .clients-icon {
        color: #4338ca;
        background: #eef2ff;
      }

      .paid-icon {
        color: #15803d;
        background: #e9f9ef;
      }

      .pending-icon {
        color: #dc2626;
        background: #fff0f0;
      }

      .summary-label {
        color: #4b5563;
        font-size: 16px;
        font-weight: 700;
      }

      .summary-value {
        margin-top: 6px;
        color: #172033;
        font-size: 27px;
        font-weight: 850;
        line-height: 1.4;
        overflow-wrap: anywhere;
      }

      .summary-value.green {
        color: #15803d;
      }

      .summary-value.red {
        color: #dc2626;
      }

      .summary-note {
        margin-top: 7px;
        color: #606b7d;
        font-size: 14px;
        line-height: 1.5;
      }

      .panel {
        min-width: 0;
        margin-bottom: 20px;
        padding: 22px;
        background: white;
        border: 1px solid #e0e5ef;
        border-radius: 16px;
        box-shadow: 0 3px 12px #1820330a;
      }

      .section-heading {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 18px;
      }

      .section-heading h2 {
        margin: 0;
        color: #172033;
        font-size: 23px;
        line-height: 1.4;
        font-weight: 800;
      }

      .section-heading p {
        margin: 6px 0 0;
        color: #5b6478;
        font-size: 16px;
        line-height: 1.6;
      }

      .search-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 13px;
      }

      .search-field {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        min-height: 54px;
        padding: 0 14px;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        background: white;
      }

      .search-field > span {
        color: #475569;
        font-size: 27px;
      }

      .search-field input {
        width: 100%;
        min-width: 0;
        min-height: 50px;
        padding: 8px 0;
        border: none;
        outline: none;
        background: transparent;
        color: #172033;
        font-family: inherit;
        font-size: 17px;
      }

      .client-select,
      .modal-form input,
      .modal-form select {
        width: 100%;
        min-width: 0;
        min-height: 52px;
        padding: 12px;
        border: 1px solid #cbd5e1;
        border-radius: 11px;
        background: white;
        color: #172033;
        font-family: inherit;
        font-size: 17px;
      }

      .selected-client-header {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }

      .client-identity {
        display: flex;
        align-items: center;
        gap: 14px;
        min-width: 0;
      }

      .client-avatar {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        width: 54px;
        height: 54px;
        border-radius: 14px;
        background: #eef2ff;
        color: #4338ca;
        font-size: 25px;
        font-weight: 800;
      }

      .client-identity h2 {
        margin: 0;
        font-size: 23px;
        line-height: 1.4;
        overflow-wrap: anywhere;
      }

      .client-identity p,
      .client-mobile {
        margin: 5px 0 0;
        color: #566176;
        font-size: 16px;
        overflow-wrap: anywhere;
      }

      .client-actions {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 10px;
      }

      .client-actions .btn {
        width: 100%;
      }

      .client-money-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 10px;
        margin-top: 20px;
      }

      .client-money-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-width: 0;
        padding: 16px;
        border: 1px solid #e0e5ef;
        border-radius: 12px;
        background: #f8faff;
      }

      .client-money-card span {
        color: #4b5563;
        font-size: 16px;
      }

      .client-money-card strong {
        color: #172033;
        font-size: 21px;
        text-align: right;
        overflow-wrap: anywhere;
      }

      .client-money-card.client-paid {
        background: #f0fdf4;
        border-color: #bbf7d0;
      }

      .client-money-card.client-paid strong {
        color: #15803d;
      }

      .client-money-card.client-pending {
        background: #fff5f5;
        border-color: #fecaca;
      }

      .client-money-card.client-pending strong {
        color: #dc2626;
      }

      .history-count {
        padding: 7px 12px;
        border-radius: 20px;
        background: #eef2ff;
        color: #3730a3;
        font-size: 15px;
        font-weight: 750;
      }

      .payment-list {
        display: grid;
        gap: 13px;
      }

      .payment-row {
        display: grid;
        grid-template-columns: 46px minmax(0, 1fr);
        gap: 12px;
        min-width: 0;
        padding: 15px;
        border: 1px solid #e0e5ef;
        border-radius: 13px;
        background: white;
      }

      .payment-method-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 46px;
        height: 46px;
        border-radius: 12px;
        background: #f1f5f9;
        font-size: 22px;
      }

      .payment-details {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 5px;
        min-width: 0;
      }

      .payment-details strong {
        color: #172033;
        font-size: 22px;
        line-height: 1.4;
        overflow-wrap: anywhere;
      }

      .payment-details span {
        color: #4b5563;
        font-size: 16px;
      }

      .payment-details .payment-method-label {
        padding: 5px 9px;
        border-radius: 8px;
        background: #f1f5f9;
        color: #374151;
      }

      .payment-actions {
        grid-column: 1 / -1;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 9px;
      }

      .payment-actions .btn {
        width: 100%;
        min-width: 0;
        padding: 11px 7px;
        font-size: 16px;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 30px 10px;
        text-align: center;
      }

      .empty-icon {
        margin-bottom: 12px;
        font-size: 34px;
      }

      .empty-state h3 {
        margin: 0;
        font-size: 21px;
      }

      .empty-state p {
        margin: 8px 0 0;
        color: #566176;
        font-size: 16px;
        line-height: 1.7;
      }

      .empty-state .btn {
        margin-top: 16px;
      }

      .payments-footer {
        display: flex;
        flex-direction: column;
        gap: 5px;
        padding: 10px 2px;
        color: #566176;
        font-size: 14px;
      }

      .payments-footer span:first-child {
        font-weight: 800;
      }

      .payment-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 12px;
        background: rgba(15, 23, 42, 0.65);
      }

      .payment-modal {
        width: 100%;
        max-width: 540px;
        max-height: 90vh;
        max-height: 90dvh;
        overflow-y: auto;
        padding: 20px;
        border-radius: 18px;
        background: white;
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 20px;
      }

      .modal-header h2 {
        margin: 0;
        font-size: 25px;
        line-height: 1.4;
      }

      .modal-close {
        flex-shrink: 0;
        width: 44px;
        height: 44px;
        border: none;
        border-radius: 11px;
        background: #eef2f7;
        color: #172033;
        font-size: 22px;
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
        font-size: 17px;
        font-weight: 750;
      }

      .modal-client-summary {
        padding: 14px;
        border: 1px solid #dbe3f5;
        border-radius: 12px;
        background: #f7f8ff;
      }

      .modal-client-name {
        font-size: 19px;
        font-weight: 800;
        overflow-wrap: anywhere;
      }

      .modal-client-numbers {
        display: grid;
        gap: 7px;
        margin-top: 10px;
        color: #4b5563;
        font-size: 16px;
      }

      .modal-actions {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 10px;
        margin-top: 22px;
        padding-top: 17px;
        border-top: 1px solid #e5e7eb;
      }

      .modal-actions .btn {
        width: 100%;
      }

      .loading-card,
      .login-card {
        width: 100%;
        max-width: 430px;
        padding: 28px;
        border-radius: 18px;
        background: white;
        text-align: center;
        font-size: 18px;
      }

      .login-card h2 {
        font-size: 25px;
      }

      .login-card p {
        font-size: 17px;
        line-height: 1.7;
      }

      .login-icon {
        font-size: 38px;
      }

      @media (min-width: 700px) {
        .summary-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .search-row {
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
        }

        .selected-client-header {
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
        }

        .client-actions {
          display: flex;
          flex-wrap: wrap;
        }

        .client-money-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .payment-row {
          grid-template-columns: 46px minmax(0, 1fr) auto;
          align-items: center;
        }

        .payment-details {
          flex-direction: row;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px 14px;
        }

        .payment-actions {
          grid-column: auto;
          display: flex;
        }

        .payment-actions .btn {
          width: auto;
        }

        .modal-actions {
          grid-template-columns: auto auto;
          justify-content: end;
        }

        .modal-actions .btn {
          width: auto;
        }
      }

      @media (max-width: 380px) {
        .payments-page {
          padding: 10px;
        }

        .panel {
          padding: 13px;
        }

        .summary-card {
          padding: 12px;
        }

        .summary-value {
          font-size: 22px;
        }

        .client-money-card {
          align-items: flex-start;
          flex-direction: column;
        }

        .client-money-card strong {
          text-align: left;
        }
      }
    `}</style>
  );
}