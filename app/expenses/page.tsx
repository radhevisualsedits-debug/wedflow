
"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../lib/firebase";

type Expense = {
  id: string;
  studioId: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  note: string;
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
  const [studioId, setStudioId] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Other");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setStudioId(user?.uid ?? "");
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  async function loadExpenses(uid: string) {
    setLoadingExpenses(true);
    setErrorMessage("");

    try {
      const q = query(
        collection(db, "expenses"),
        where("studioId", "==", uid)
      );

      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as Expense[];

      list.sort((a, b) =>
        (b.date || "").localeCompare(a.date || "")
      );
      setExpenses(list);
    } catch (error) {
      console.error("Error loading expenses:", error);
      setErrorMessage(
        "ખર્ચ લોડ થયા નથી. Firebase Rules અને Login તપાસો."
      );
    } finally {
      setLoadingExpenses(false);
    }
  }

  useEffect(() => {
    if (!authReady) return;

    if (!studioId) {
      setExpenses([]);
      setLoadingExpenses(false);
      setErrorMessage("ખર્ચ જોવા માટે પહેલાં Login કરો.");
      return;
    }

    void loadExpenses(studioId);
  }, [authReady, studioId]);

  async function saveExpense(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const user = auth.currentUser;

    if (!user || user.uid !== studioId) {
      alert("Login તપાસી શકાયું નથી. પેજ Refresh કરો.");
      return;
    }

    const numericAmount = Number(amount);

    if (!title.trim()) {
      alert("ખર્ચનું નામ લખો.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      alert("યોગ્ય રકમ લખો.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      await addDoc(collection(db, "expenses"), {
        studioId: user.uid,
        title: title.trim(),
        category,
        amount: numericAmount,
        date: date || new Date().toISOString().slice(0, 10),
        note: note.trim(),
        createdAt: new Date().toISOString(),
      });

      setTitle("");
      setCategory("Other");
      setAmount("");
      setDate(new Date().toISOString().slice(0, 10));
      setNote("");

      await loadExpenses(user.uid);
      alert("ખર્ચ સફળતાપૂર્વક સેવ થયો.");
    } catch (error) {
      console.error("Error saving expense:", error);
      setErrorMessage(
        "ખર્ચ સેવ થયો નથી. Firebase Rules અને Login તપાસો."
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteExpense(expense: Expense) {
    const user = auth.currentUser;

    if (!user || user.uid !== studioId) {
      alert("કૃપા કરીને ફરી Login કરો.");
      return;
    }

    if (expense.studioId !== user.uid) {
      alert("આ ખર્ચ તમારા સ્ટુડિયાનો નથી.");
      return;
    }

    if (!window.confirm(
      `"${expense.title}" ખર્ચ Delete કરવો છે?`
    )) return;

    try {
      await deleteDoc(doc(db, "expenses", expense.id));
      setExpenses((previous) =>
        previous.filter((item) => item.id !== expense.id)
      );
    } catch (error) {
      console.error("Error deleting expense:", error);
      alert("ખર્ચ Delete થયો નથી. Firebase Rules તપાસો.");
    }
  }

  const total = expenses.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const money = (value: number) =>
    `₹${value.toLocaleString("en-IN")}`;

  if (!authReady) {
    return <main className="p-6 text-lg">Login તપાસી રહ્યા છીએ...</main>;
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-4 text-base sm:p-6">
      <header>
        <h1 className="text-3xl font-bold">Expenses</h1>
        <p className="mt-2 text-gray-600">
          તમારા સ્ટુડિયાના ખર્ચની નોંધ રાખો.
        </p>
      </header>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <p className="text-lg text-gray-600">કુલ ખર્ચ</p>
        <p className="mt-2 text-3xl font-bold">{money(total)}</p>
        <p className="mt-1 text-sm text-gray-500">
          કુલ {expenses.length} ખર્ચની નોંધ
        </p>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="mb-5 text-2xl font-bold">નવો ખર્ચ ઉમેરો</h2>

        <form onSubmit={saveExpense} className="space-y-4">
          <div>
            <label className="mb-2 block font-semibold">ખર્ચનું નામ *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-xl border px-4 py-3 text-lg"
              placeholder="દા.ત. પેટ્રોલ"
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold">કેટેગરી</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-lg"
            >
              {categories.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block font-semibold">રકમ (₹) *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full rounded-xl border px-4 py-3 text-lg"
              placeholder="1500"
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold">તારીખ</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-lg"
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold">નોંધ (વૈકલ્પિક)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full rounded-xl border px-4 py-3 text-lg"
              placeholder="વધારાની માહિતી"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !studioId}
            className="w-full rounded-xl bg-blue-600 px-5 py-4 text-lg font-bold text-white disabled:opacity-60"
          >
            {loading ? "સેવ થઈ રહ્યું છે..." : "ખર્ચ સેવ કરો"}
          </button>
        </form>
      </section>

      {errorMessage && (
        <section role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">
          {errorMessage}
        </section>
      )}

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-2xl font-bold">ખર્ચની યાદી</h2>

        {loadingExpenses ? (
          <p className="py-5 text-lg">ખર્ચ લોડ થઈ રહ્યા છે...</p>
        ) : expenses.length === 0 ? (
          <p className="py-5 text-lg text-gray-600">
            હજી કોઈ ખર્ચની નોંધ નથી.
          </p>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => (
              <article key={expense.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-xl font-bold">
                      {expense.title}
                    </h3>
                    <p className="mt-1 text-gray-600">
                      {expense.category} · {expense.date}
                    </p>
                    {expense.note && (
                      <p className="mt-2 break-words text-gray-700">
                        {expense.note}
                      </p>
                    )}
                  </div>
                  <p className="whitespace-nowrap text-xl font-bold">
                    {money(Number(expense.amount || 0))}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void deleteExpense(expense)}
                  className="mt-4 rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700"
                >
                  Delete
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}