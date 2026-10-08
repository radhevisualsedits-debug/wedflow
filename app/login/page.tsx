"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [studioName, setStudioName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [mobile, setMobile] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);

      // LOGIN
      if (mode === "login") {
        const result =
          await signInWithEmailAndPassword(
            auth,
            email.trim(),
            password
          );

        const studioDoc = await getDoc(
          doc(db, "studios", result.user.uid)
        );

        if (studioDoc.exists()) {
          router.push("/");
        } else {
          router.push("/studio-setup");
        }

        return;
      }

      // SIGNUP VALIDATION
      if (!studioName.trim()) {
        setError("Please enter studio name.");
        return;
      }

      if (!ownerName.trim()) {
        setError("Please enter owner name.");
        return;
      }

      if (!mobile.trim()) {
        setError("Please enter mobile number.");
        return;
      }

      if (password.length < 6) {
        setError(
          "Password must be at least 6 characters."
        );
        return;
      }

      // CREATE ACCOUNT
      const result =
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      // CREATE STUDIO PROFILE
      await setDoc(
        doc(db, "studios", result.user.uid),
        {
          ownerId: result.user.uid,

          studioName: studioName.trim(),

          ownerName: ownerName.trim(),

          mobile: mobile.trim(),

          email: email.trim(),

          whatsapp: mobile.trim(),

          address: "",

          city: "",

          logoUrl: "",

          instagram: "",

          website: "",

          gstNumber: "",

          description: "",

          createdAt: new Date(),

          updatedAt: new Date(),
        }
      );

      router.push("/");
    } catch (err: any) {
      console.error(err);

      if (
        err?.code ===
        "auth/email-already-in-use"
      ) {
        setError(
          "This email is already registered."
        );
      } else if (
        err?.code ===
        "auth/invalid-email"
      ) {
        setError(
          "Please enter a valid email."
        );
      } else if (
        err?.code ===
        "auth/weak-password"
      ) {
        setError(
          "Password must be at least 6 characters."
        );
      } else if (
        err?.code ===
        "auth/invalid-credential"
      ) {
        setError(
          "Email or password is incorrect."
        );
      } else {
        setError(
          err?.message ||
            "Something went wrong."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f6fa",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily:
          "Arial, sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "450px",
          background: "#ffffff",
          padding: "35px",
          borderRadius: "20px",
          boxShadow:
            "0 10px 35px rgba(0,0,0,0.08)",
          boxSizing: "border-box",
        }}
      >
        {/* LOGO */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "25px",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "36px",
              color: "#111827",
              fontWeight: 800,
            }}
          >
            WedFlow
          </h1>

          <p
            style={{
              marginTop: "7px",
              color: "#6b7280",
              fontSize: "15px",
            }}
          >
            Wedding Studio Management
          </p>
        </div>

        {/* TITLE */}
        <h2
          style={{
            margin:
              "0 0 8px",
            color: "#111827",
            fontSize: "24px",
          }}
        >
          {mode === "login"
            ? "Welcome Back 👋"
            : "Create Your Studio 🏢"}
        </h2>

        <p
          style={{
            color: "#6b7280",
            marginTop: 0,
            marginBottom: "25px",
          }}
        >
          {mode === "login"
            ? "Login to continue to WedFlow"
            : "Create your free WedFlow studio account"}
        </p>

        <form
          onSubmit={handleSubmit}
        >
          {/* SIGNUP FIELDS */}
          {mode === "signup" && (
            <>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 600,
                  color: "#374151",
                }}
              >
                🏢 Studio Name
              </label>

              <input
                type="text"
                placeholder="Example: Radhe Visuals"
                value={studioName}
                onChange={(e) =>
                  setStudioName(
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                  padding: "13px",
                  border:
                    "1px solid #d1d5db",
                  borderRadius: "10px",
                  fontSize: "15px",
                  boxSizing:
                    "border-box",
                  marginBottom:
                    "16px",
                }}
              />

              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 600,
                  color: "#374151",
                }}
              >
                👤 Owner Name
              </label>

              <input
                type="text"
                placeholder="Enter owner name"
                value={ownerName}
                onChange={(e) =>
                  setOwnerName(
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                  padding: "13px",
                  border:
                    "1px solid #d1d5db",
                  borderRadius: "10px",
                  fontSize: "15px",
                  boxSizing:
                    "border-box",
                  marginBottom:
                    "16px",
                }}
              />

              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 600,
                  color: "#374151",
                }}
              >
                📱 Mobile Number
              </label>

              <input
                type="tel"
                placeholder="Enter mobile number"
                value={mobile}
                onChange={(e) =>
                  setMobile(
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                  padding: "13px",
                  border:
                    "1px solid #d1d5db",
                  borderRadius: "10px",
                  fontSize: "15px",
                  boxSizing:
                    "border-box",
                  marginBottom:
                    "16px",
                }}
              />
            </>
          )}

          {/* EMAIL */}
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: 600,
              color: "#374151",
            }}
          >
            📧 Email
          </label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
            style={{
              width: "100%",
              padding: "13px",
              border:
                "1px solid #d1d5db",
              borderRadius: "10px",
              fontSize: "15px",
              boxSizing:
                "border-box",
              marginBottom:
                "16px",
            }}
          />

          {/* PASSWORD */}
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: 600,
              color: "#374151",
            }}
          >
            🔐 Password
          </label>

          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            style={{
              width: "100%",
              padding: "13px",
              border:
                "1px solid #d1d5db",
              borderRadius: "10px",
              fontSize: "15px",
              boxSizing:
                "border-box",
              marginBottom:
                "18px",
            }}
          />

          {/* ERROR */}
          {error && (
            <div
              style={{
                background: "#fee2e2",
                color: "#b91c1c",
                padding: "12px",
                borderRadius: "10px",
                marginBottom: "18px",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              border: "none",
              borderRadius: "10px",
              background:
                loading
                  ? "#6b7280"
                  : "#111827",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: 700,
              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Login"
              : "Create Studio"}
          </button>
        </form>

        {/* SWITCH MODE */}
        <div
          style={{
            textAlign: "center",
            marginTop: "22px",
            color: "#6b7280",
            fontSize: "14px",
          }}
        >
          {mode === "login"
            ? "New to WedFlow?"
            : "Already have a WedFlow account?"}

          <button
            type="button"
            onClick={() => {
              setMode(
                mode === "login"
                  ? "signup"
                  : "login"
              );

              setError("");
            }}
            style={{
              border: "none",
              background:
                "transparent",
              color: "#2563eb",
              fontWeight: 700,
              cursor: "pointer",
              marginLeft: "5px",
            }}
          >
            {mode === "login"
              ? "Create Studio"
              : "Login"}
          </button>
        </div>

        <div
          style={{
            marginTop: "25px",
            padding: "12px",
            background: "#f8fafc",
            borderRadius: "10px",
            textAlign: "center",
            color: "#64748b",
            fontSize: "12px",
          }}
        >
          🔐 Your studio data will be
          kept separate and secure.
        </div>
      </div>
    </main>
  );
}