"use client";

import { useState } from "react";

export default function TestAuthPage() {
  const [message, setMessage] = useState("Page loaded");

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f7fb",
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "30px",
          borderRadius: "16px",
          textAlign: "center",
        }}
      >
        <h1>WedFlow Test</h1>

        <p>{message}</p>

        <button
          onClick={() =>
            setMessage("JavaScript is working!")
          }
          style={{
            padding: "12px 20px",
            border: "none",
            borderRadius: "8px",
            background: "#2563eb",
            color: "white",
            fontSize: "16px",
          }}
        >
          Test JavaScript
        </button>
      </div>
    </main>
  );
}