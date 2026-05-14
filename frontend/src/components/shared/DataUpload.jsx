import { useState, useRef } from "react";
import { API_URL } from "../../api/client";

export default function DataUpload({ onUploadComplete }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      setError("Only CSV files are supported");
      return;
    }
    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_URL}/api/upload/schedule`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Upload failed (${res.status})`);
      }
      const data = await res.json();
      setResult(data);
      onUploadComplete?.(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer?.files?.[0];
    handleFile(file);
  }

  function onFileSelect(e) {
    handleFile(e.target.files?.[0]);
  }

  return (
    <div className="card">
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Upload schedule data</div>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 12 }}>
        Upload a CSV with your dock appointment schedule. Required columns: date, scheduled_time, carrier_name, dock_door, destination_zone, pallet_count, expected_duration_mins, priority.
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "var(--accent-blue)" : "var(--border-strong)"}`,
          borderRadius: 12,
          padding: "24px 16px",
          textAlign: "center",
          cursor: "pointer",
          background: dragging ? "var(--accent-blue-dim)" : "var(--bg-surface)",
          transition: "all 200ms ease",
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={onFileSelect}
          style={{ display: "none" }}
        />
        {uploading ? (
          <div>
            <div style={{
              width: 32, height: 32,
              border: "3px solid var(--border)", borderTopColor: "var(--accent-blue)",
              borderRadius: "50%", animation: "spin 0.8s linear infinite",
              margin: "0 auto 8px",
            }} />
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Processing…</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📁</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
              Drop CSV here or click to browse
            </div>
            <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 4 }}>
              Supports dock_appointments.csv format
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          marginTop: 10, padding: "8px 12px",
          background: "var(--bg-danger)", border: "1px solid var(--border-danger)",
          borderRadius: 8, fontSize: 11, color: "var(--text-danger)",
        }}>
          {error}
        </div>
      )}

      {/* Success */}
      {result && (
        <div style={{
          marginTop: 10, padding: "10px 14px",
          background: "var(--bg-success)", border: "1px solid var(--border-success)",
          borderRadius: 8, fontSize: 11, color: "var(--text-success)",
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Upload successful</div>
          <div>{result.appointments_loaded || 0} appointments loaded for {result.date || "unknown date"}</div>
          {result.message && (
            <div style={{ marginTop: 4, fontStyle: "italic" }}>{result.message}</div>
          )}
          {result.warnings?.length > 0 && (
            <div style={{ marginTop: 4, color: "var(--text-warning)" }}>
              {result.warnings.length} warning{result.warnings.length > 1 ? "s" : ""}: {result.warnings[0]}
            </div>
          )}
        </div>
      )}

      {/* Template download + revert */}
      <div style={{ marginTop: 10, fontSize: 10, color: "var(--text-tertiary)", display: "flex", gap: 8 }}>
        <button
          onClick={async () => {
            try {
              const res = await fetch(`${API_URL}/api/upload/template`);
              if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "schedule_template.csv";
                a.click();
                URL.revokeObjectURL(url);
              }
            } catch { /* silent */ }
          }}
          style={{
            background: "transparent", border: "1px solid var(--border)",
            padding: "4px 10px", borderRadius: 6, fontSize: 10,
            color: "var(--accent-blue)", cursor: "pointer",
          }}
        >
          Download CSV template
        </button>
        <button
          onClick={async () => {
            await fetch(`${API_URL}/api/upload/schedule`, { method: "DELETE" });
            setResult(null);
            setError(null);
            window.location.reload();
          }}
          style={{
            background: "transparent", border: "1px solid var(--border)",
            padding: "4px 10px", borderRadius: 6, fontSize: 10,
            color: "var(--text-tertiary)", cursor: "pointer",
          }}
        >
          Revert to synthetic data
        </button>
      </div>
    </div>
  );
}
