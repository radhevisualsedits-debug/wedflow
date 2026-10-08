"use client";

import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { useRouter } from "next/navigation";

export default function StudioSetupPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [studioName, setStudioName] =
    useState("");

  const [ownerName, setOwnerName] =
    useState("");

  const [mobile, setMobile] =
    useState("");

  const [whatsapp, setWhatsapp] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [address, setAddress] =
    useState("");

  const [city, setCity] =
    useState("");

  const [instagram, setInstagram] =
    useState("");

  const [website, setWebsite] =
    useState("");

  const [gstNumber, setGstNumber] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {
          if (!user) {
            router.push("/login");
            return;
          }

          try {
            const studioRef = doc(
              db,
              "studios",
              user.uid
            );

            const studioSnap =
              await getDoc(studioRef);

            if (studioSnap.exists()) {
              const data =
                studioSnap.data();

              setStudioName(
                data.studioName || ""
              );

              setOwnerName(
                data.ownerName || ""
              );

              setMobile(
                data.mobile || ""
              );

              setWhatsapp(
                data.whatsapp ||
                  data.mobile ||
                  ""
              );

              setEmail(
                data.email ||
                  user.email ||
                  ""
              );

              setAddress(
                data.address || ""
              );

              setCity(
                data.city || ""
              );

              setInstagram(
                data.instagram || ""
              );

              setWebsite(
                data.website || ""
              );

              setGstNumber(
                data.gstNumber || ""
              );

              setDescription(
                data.description || ""
              );
            } else {
              setEmail(
                user.email || ""
              );
            }
          } catch (err) {
            console.error(err);

            setError(
              "Studio details load કરવામાં problem આવી."
            );
          } finally {
            setLoading(false);
          }
        }
      );

    return () => unsubscribe();
  }, [router]);

  async function saveStudio(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setError("");

    if (!studioName.trim()) {
      setError(
        "Please enter studio name."
      );
      return;
    }

    if (!ownerName.trim()) {
      setError(
        "Please enter owner name."
      );
      return;
    }

    if (!mobile.trim()) {
      setError(
        "Please enter mobile number."
      );
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      router.push("/login");
      return;
    }

    try {
      setSaving(true);

      await setDoc(
        doc(
          db,
          "studios",
          user.uid
        ),
        {
          ownerId: user.uid,

          studioName:
            studioName.trim(),

          ownerName:
            ownerName.trim(),

          mobile:
            mobile.trim(),

          whatsapp:
            whatsapp.trim(),

          email:
            email.trim(),

          address:
            address.trim(),

          city:
            city.trim(),

          instagram:
            instagram.trim(),

          website:
            website.trim(),

          gstNumber:
            gstNumber.trim(),

          description:
            description.trim(),

          updatedAt:
            new Date(),
        },
        {
          merge: true,
        }
      );

      router.push("/");
    } catch (err) {
      console.error(err);

      setError(
        "Studio details save કરવામાં problem આવી."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f5f6fa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "Arial, sans-serif",
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: "30px",
            borderRadius: "15px",
            boxShadow:
              "0 10px 30px rgba(0,0,0,0.08)",
          }}
        >
          ⏳ Loading Studio...
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f6fa",
        padding: "25px 15px",
        fontFamily:
          "Arial, sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "750px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "25px",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "32px",
              fontWeight: 800,
              color: "#111827",
            }}
          >
            🏢 Studio Profile
          </h1>

          <p
            style={{
              marginTop: "8px",
              color: "#64748b",
            }}
          >
            Add your studio details to
            personalize WedFlow
          </p>
        </div>

        <form
          onSubmit={saveStudio}
          style={{
            background: "#fff",
            padding: "25px",
            borderRadius: "18px",
            boxShadow:
              "0 10px 35px rgba(0,0,0,0.08)",
          }}
        >
          {/* BASIC DETAILS */}
          <h2
            style={{
              margin:
                "0 0 18px",
              fontSize: "19px",
              color: "#111827",
            }}
          >
            🏢 Basic Details
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "15px",
            }}
          >
            <Field
              label="Studio Name *"
              placeholder="Example: Radhe Visuals"
              value={studioName}
              onChange={setStudioName}
            />

            <Field
              label="Owner Name *"
              placeholder="Enter owner name"
              value={ownerName}
              onChange={setOwnerName}
            />

            <Field
              label="Mobile Number *"
              placeholder="Enter mobile number"
              value={mobile}
              onChange={setMobile}
              type="tel"
            />

            <Field
              label="WhatsApp Number"
              placeholder="WhatsApp number"
              value={whatsapp}
              onChange={setWhatsapp}
              type="tel"
            />

            <Field
              label="Email"
              placeholder="Studio email"
              value={email}
              onChange={setEmail}
              type="email"
            />

            <Field
              label="City"
              placeholder="Example: Tharad"
              value={city}
              onChange={setCity}
            />
          </div>

          {/* ADDRESS */}
          <div
            style={{
              marginTop: "15px",
            }}
          >
            <label
              style={{
                display: "block",
                marginBottom: "7px",
                fontWeight: 600,
                color: "#374151",
              }}
            >
              📍 Studio Address
            </label>

            <textarea
              value={address}
              onChange={(e) =>
                setAddress(
                  e.target.value
                )
              }
              placeholder="Enter complete studio address"
              rows={3}
              style={{
                width: "100%",
                padding: "13px",
                border:
                  "1px solid #d1d5db",
                borderRadius: "10px",
                fontSize: "15px",
                boxSizing:
                  "border-box",
                resize: "vertical",
              }}
            />
          </div>

          {/* ONLINE DETAILS */}
          <h2
            style={{
              margin:
                "28px 0 18px",
              fontSize: "19px",
              color: "#111827",
            }}
          >
            🌐 Online Details
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "15px",
            }}
          >
            <Field
              label="Instagram ID"
              placeholder="@yourstudio"
              value={instagram}
              onChange={setInstagram}
            />

            <Field
              label="Website"
              placeholder="https://yourwebsite.com"
              value={website}
              onChange={setWebsite}
            />

            <Field
              label="GST Number"
              placeholder="Optional"
              value={gstNumber}
              onChange={setGstNumber}
            />
          </div>

          {/* DESCRIPTION */}
          <div
            style={{
              marginTop: "15px",
            }}
          >
            <label
              style={{
                display: "block",
                marginBottom: "7px",
                fontWeight: 600,
                color: "#374151",
              }}
            >
              📝 Studio Description
            </label>

            <textarea
              value={description}
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
              placeholder="Example: Wedding Photography & Cinematic Films"
              rows={4}
              style={{
                width: "100%",
                padding: "13px",
                border:
                  "1px solid #d1d5db",
                borderRadius: "10px",
                fontSize: "15px",
                boxSizing:
                  "border-box",
                resize: "vertical",
              }}
            />
          </div>

          {/* ERROR */}
          {error && (
            <div
              style={{
                marginTop: "18px",
                background: "#fee2e2",
                color: "#b91c1c",
                padding: "12px",
                borderRadius: "10px",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          {/* SAVE */}
          <button
            type="submit"
            disabled={saving}
            style={{
              width: "100%",
              marginTop: "22px",
              padding: "14px",
              border: "none",
              borderRadius: "11px",
              background:
                saving
                  ? "#6b7280"
                  : "#111827",
              color: "#fff",
              fontSize: "16px",
              fontWeight: 700,
              cursor: saving
                ? "not-allowed"
                : "pointer",
            }}
          >
            {saving
              ? "Saving..."
              : "✓ Save Studio Profile"}
          </button>

          <p
            style={{
              textAlign: "center",
              margin:
                "15px 0 0",
              color: "#94a3b8",
              fontSize: "12px",
            }}
          >
            🔐 Your studio profile
            belongs only to your account.
          </p>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          marginBottom: "7px",
          fontWeight: 600,
          color: "#374151",
        }}
      >
        {label}
      </label>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) =>
          onChange(
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
        }}
      />
    </div>
  );
}