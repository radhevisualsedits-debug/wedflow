"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

type Expense = {
  id: string;
  title?: string;
  category?: string;
  amount?: number;
  date?: string;
  note?: string;
  createdAt?: string;
};

const categories = [
  "Equipment",
  "Travel",
  "Staff",
  "Office",
  "Food",
  "Marketing",
  "Software",
  "Other",
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [title, setTitle] = useState("");
  const [category, setCategory] =
    useState("Other");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadExpenses();
  }, []);

  async function loadExpenses() {
    try {
      const snapshot = await getDocs(
        collection(db, "expenses")
      );

      const list = snapshot.docs.map(
        (item) => ({
          id: item.id,
          ...item.data(),
        })
      ) as Expense[];

      setExpenses(list);
    } catch (error) {
      console.error(
        "Error loading expenses:",
        error
      );
    }
  }

  async function saveExpense(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!title.trim()) {
      alert("Please enter expense title.");
      return;
    }

    if (
      !amount ||
      Number(amount) <= 0
    ) {
      alert("Please enter a valid amount.");
      return;
    }

    try {
      setLoading(true);

      await addDoc(
        collection(db, "expenses"),
        {
          title: title.trim(),
          category,
          amount: Number(amount),
          date:
            date ||
            new Date()
              .toISOString()
              .split("T")[0],
          note: note.trim(),
          createdAt:
            new Date().toISOString(),
        }
      );

      alert("Expense added successfully!");

      setTitle("");
      setCategory("Other");
      setAmount("");
      setDate("");
      setNote("");

      await loadExpenses();
    } catch (error) {
      console.error(
        "Error saving expense:",
        error
      );

      alert(
        "Expense could not be saved."
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteExpense(
    expenseId: string
  ) {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this expense?"
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(
        doc(
          db,
          "expenses",
          expenseId
        )
      );

      alert("Expense deleted.");

      await loadExpenses();
    } catch (error) {
      console.error(
        "Error deleting expense:",
        error
      );

      alert(
        "Expense could not be deleted."
      );
    }
  }

  const totalExpenses =
    expenses.reduce(
      (total, expense) =>
        total +
        Number(expense.amount || 0),
      0
    );

  function money(amount: number) {
    return `₹${Number(
      amount || 0
    ).toLocaleString("en-IN")}`;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f6fa",
        fontFamily:
          "Arial, Helvetica, sans-serif",
        padding: "30px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            marginBottom: "25px",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "32px",
              color: "#111827",
            }}
          >
            Expenses
          </h1>

          <p
            style={{
              marginTop: "8px",
              color: "#6b7280",
            }}
          >
            Track your studio expenses
          </p>
        </div>

        {/* SUMMARY */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "22px",
            boxShadow:
              "0 4px 15px rgba(0,0,0,0.05)",
            marginBottom: "25px",
          }}
        >
          <div
            style={{
              color: "#6b7280",
              fontSize: "14px",
            }}
          >
            Total Expenses
          </div>

          <div
            style={{
              marginTop: "8px",
              fontSize: "30px",
              fontWeight: 700,
              color: "#dc2626",
            }}
          >
            {money(totalExpenses)}
          </div>
        </div>

        {/* ADD EXPENSE */}

        <div
          style={{
            background: "#ffffff",
            padding: "25px",
            borderRadius: "16px",
            boxShadow:
              "0 4px 15px rgba(0,0,0,0.05)",
            marginBottom: "25px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: "#111827",
            }}
          >
            Add Expense
          </h2>

          <form
            onSubmit={saveExpense}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
              }}
            >
              {/* TITLE */}

              <div>
                <label
                  style={labelStyle}
                >
                  Expense Title *
                </label>

                <input
                  type="text"
                  value={title}
                  onChange={(e) =>
                    setTitle(
                      e.target.value
                    )
                  }
                  placeholder="Example: Camera Repair"
                  style={inputStyle}
                />
              </div>

              {/* CATEGORY */}

              <div>
                <label
                  style={labelStyle}
                >
                  Category
                </label>

                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(
                      e.target.value
                    )
                  }
                  style={inputStyle}
                >
                  {categories.map(
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

              {/* AMOUNT */}

              <div>
                <label
                  style={labelStyle}
                >
                  Amount *
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
                  placeholder="Enter amount"
                  style={inputStyle}
                />
              </div>

              {/* DATE */}

              <div>
                <label
                  style={labelStyle}
                >
                  Date
                </label>

                <input
                  type="date"
                  value={date}
                  onChange={(e) =>
                    setDate(
                      e.target.value
                    )
                  }
                  style={inputStyle}
                />
              </div>

              {/* NOTE */}

              <div
                style={{
                  gridColumn:
                    "1 / -1",
                }}
              >
                <label
                  style={labelStyle}
                >
                  Note
                </label>

                <textarea
                  value={note}
                  onChange={(e) =>
                    setNote(
                      e.target.value
                    )
                  }
                  placeholder="Optional note"
                  rows={3}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: "20px",
                padding:
                  "13px 22px",
                border: "none",
                borderRadius: "10px",
                background: "#111827",
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: 600,
                cursor: loading
                  ? "not-allowed"
                  : "pointer",
                opacity: loading
                  ? 0.7
                  : 1,
              }}
            >
              {loading
                ? "Saving..."
                : "+ Add Expense"}
            </button>
          </form>
        </div>

        {/* EXPENSE LIST */}

        <div
          style={{
            background: "#ffffff",
            padding: "25px",
            borderRadius: "16px",
            boxShadow:
              "0 4px 15px rgba(0,0,0,0.05)",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: "#111827",
            }}
          >
            Expense History
          </h2>

          {expenses.length === 0 ? (
            <div
              style={{
                padding: "30px 10px",
                textAlign: "center",
                color: "#9ca3af",
              }}
            >
              No expenses found.
            </div>
          ) : (
            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  minWidth: "700px",
                  borderCollapse:
                    "collapse",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={
                        tableHeaderStyle
                      }
                    >
                      Date
                    </th>

                    <th
                      style={
                        tableHeaderStyle
                      }
                    >
                      Title
                    </th>

                    <th
                      style={
                        tableHeaderStyle
                      }
                    >
                      Category
                    </th>

                    <th
                      style={
                        tableHeaderStyle
                      }
                    >
                      Amount
                    </th>

                    <th
                      style={
                        tableHeaderStyle
                      }
                    >
                      Note
                    </th>

                    <th
                      style={
                        tableHeaderStyle
                      }
                    >
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {expenses
                    .slice()
                    .sort(
                      (a, b) =>
                        new Date(
                          b.date ||
                            "1900-01-01"
                        ).getTime() -
                        new Date(
                          a.date ||
                            "1900-01-01"
                        ).getTime()
                    )
                    .map(
                      (expense) => (
                        <tr
                          key={
                            expense.id
                          }
                        >
                          <td
                            style={
                              tableCellStyle
                            }
                          >
                            {expense.date ||
                              "-"}
                          </td>

                          <td
                            style={{
                              ...tableCellStyle,
                              fontWeight: 600,
                              color:
                                "#111827",
                            }}
                          >
                            {expense.title ||
                              "-"}
                          </td>

                          <td
                            style={
                              tableCellStyle
                            }
                          >
                            {expense.category ||
                              "-"}
                          </td>

                          <td
                            style={{
                              ...tableCellStyle,
                              fontWeight: 700,
                              color:
                                "#dc2626",
                            }}
                          >
                            {money(
                              Number(
                                expense.amount ||
                                  0
                              )
                            )}
                          </td>

                          <td
                            style={
                              tableCellStyle
                            }
                          >
                            {expense.note ||
                              "-"}
                          </td>

                          <td
                            style={
                              tableCellStyle
                            }
                          >
                            <button
                              onClick={() =>
                                deleteExpense(
                                  expense.id
                                )
                              }
                              style={{
                                padding:
                                  "8px 12px",
                                border:
                                  "none",
                                borderRadius:
                                  "8px",
                                background:
                                  "#fee2e2",
                                color:
                                  "#b91c1c",
                                cursor:
                                  "pointer",
                                fontWeight:
                                  600,
                              }}
                            >
                              🗑️ Delete
                            </button>
                          </td>
                        </tr>
                      )
                    )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  border: "1px solid #d1d5db",
  borderRadius: "9px",
  fontSize: "14px",
  boxSizing: "border-box",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "6px",
  fontSize: "13px",
  fontWeight: 600,
  color: "#374151",
};

const tableHeaderStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px",
  background: "#f3f4f6",
  color: "#374151",
  fontSize: "13px",
  fontWeight: 700,
  borderBottom:
    "1px solid #e5e7eb",
};

const tableCellStyle: React.CSSProperties = {
  padding: "13px 12px",
  color: "#4b5563",
  fontSize: "13px",
  borderBottom:
    "1px solid #e5e7eb",
};