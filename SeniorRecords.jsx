
import { useEffect, useState } from "react";
import {
  ref,
  onValue,
  push,
  set,
  update,
  remove,
  serverTimestamp,
} from "firebase/database";

import { database } from "./firebase";
import "./SeniorRecords.css";

const emptyForm = {
  fullName: "",
  birthDate: "",
  address: "",
  contactNumber: "",
  allergies: "",
  medicalHistory: "",
};

export default function SeniorRecords() {
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // READ: Automatically retrieve updated records from Firebase.
  useEffect(() => {
    const recordsRef = ref(database, "seniorRecords");

    const unsubscribe = onValue(
      recordsRef,
      (snapshot) => {
        const data = snapshot.val() || {};

        const recordList = Object.entries(data).map(
          ([id, values]) => ({
            ...values,
            id,
          })
        );

        recordList.sort((a, b) =>
          (a.fullName || "").localeCompare(b.fullName || "")
        );

        setRecords(recordList);
        setLoading(false);
      },
      (err) => {
        setError(`Failed to load records: ${err.message}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // CREATE and UPDATE
  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    const cleaned = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [
        key,
        value.trim(),
      ])
    );

    if (!cleaned.fullName || !cleaned.birthDate || !cleaned.address) {
      setError("Please complete all required fields.");
      return;
    }

    if (
      new Date(`${cleaned.birthDate}T00:00:00`) > new Date()
    ) {
      setError("Birth date cannot be in the future.");
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        await update(
          ref(database, `seniorRecords/${editingId}`),
          {
            ...cleaned,
            updatedAt: serverTimestamp(),
          }
        );

        setMessage("Senior record updated successfully!");
      } else {
        const newRecord = push(ref(database, "seniorRecords"));

        await set(newRecord, {
          ...cleaned,
          createdAt: serverTimestamp(),
        });

        setMessage("Senior record added successfully!");
      }

      setForm({ ...emptyForm });
      setEditingId(null);
    } catch (err) {
      setError(`Could not save record: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  // Load an existing record into the form.
  function handleEdit(record) {
    const updatedForm = {};

    Object.keys(emptyForm).forEach((key) => {
      updatedForm[key] = record[key] || "";
    });

    setForm(updatedForm);
    setEditingId(record.id);
    setMessage("");
    setError("");
  }

  // DELETE: Remove a test record.
  async function handleDelete(record) {
    const confirmed = window.confirm(
      `Delete the record for ${record.fullName}? This cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await remove(
        ref(database, `seniorRecords/${record.id}`)
      );

      if (editingId === record.id) {
        setEditingId(null);
        setForm({ ...emptyForm });
      }

      setMessage("Record deleted successfully!");
    } catch (err) {
      setError(`Could not delete record: ${err.message}`);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError("");
  }

  const filteredRecords = records.filter((record) => {
    const term = search.toLowerCase();

    return (
      (record.fullName || "").toLowerCase().includes(term) ||
      (record.address || "").toLowerCase().includes(term)
    );
  });

  return (
    <section className="records-section">
      <div className="records-heading">
        <div>
          <h2>Senior Citizen Records</h2>
          <p>Manage registered senior citizen information.</p>
        </div>

        <strong>Total Records: {records.length}</strong>
      </div>

      {message && (
        <p className="records-success" role="status">
          {message}
        </p>
      )}

      {error && (
        <p className="records-error" role="alert">
          {error}
        </p>
      )}

      <form className="record-form" onSubmit={handleSubmit}>
        <h3>
          {editingId ? "Edit Senior Citizen" : "Add Senior Citizen"}
        </h3>

        <div className="record-form-grid">
          <label>
            Full Name *
            <input
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              placeholder="e.g. Maria Santos"
              required
            />
          </label>

          <label>
            Birth Date *
            <input
              type="date"
              name="birthDate"
              value={form.birthDate}
              onChange={handleChange}
              max={new Date().toLocaleDateString("en-CA")}
              required
            />
          </label>

          <label>
            Address *
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Barangay / Street"
              required
            />
          </label>

          <label>
            Contact Number
            <input
              type="tel"
              name="contactNumber"
              value={form.contactNumber}
              onChange={handleChange}
              placeholder="09XXXXXXXXX"
            />
          </label>

          <label>
            Allergies
            <input
              name="allergies"
              value={form.allergies}
              onChange={handleChange}
              placeholder="e.g. Penicillin"
            />
          </label>

          <label>
            Medical History
            <input
              name="medicalHistory"
              value={form.medicalHistory}
              onChange={handleChange}
              placeholder="e.g. Hypertension"
            />
          </label>
        </div>

        <div className="record-actions">
          <button type="submit" disabled={saving}>
            {saving
              ? "Saving..."
              : editingId
                ? "Save Changes"
                : "Add Record"}
          </button>

          {editingId && (
            <button
              type="button"
              className="secondary-action"
              onClick={cancelEdit}
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <div className="records-list">
        <h3>Registered Senior Citizens</h3>

        <label htmlFor="record-search">Search Records</label>
        <input
          id="record-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or address"
        />

        {loading ? (
          <p>Loading records...</p>
        ) : filteredRecords.length === 0 ? (
          <p>No matching senior citizen records found.</p>
        ) : (
          <div className="record-table-wrapper">
            <table className="record-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Birth Date</th>
                  <th>Address</th>
                  <th>Details</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{record.fullName}</td>
                    <td>{record.birthDate}</td>
                    <td>{record.address}</td>

                    <td>
                      <details>
                        <summary>View</summary>
                        <p>
                          <strong>Contact:</strong>{" "}
                          {record.contactNumber || "N/A"}
                        </p>
                        <p>
                          <strong>Allergies:</strong>{" "}
                          {record.allergies || "None recorded"}
                        </p>
                        <p>
                          <strong>Medical History:</strong>{" "}
                          {record.medicalHistory || "None recorded"}
                        </p>
                      </details>
                    </td>

                    <td>
                      <div className="record-actions">
                        <button
                          type="button"
                          onClick={() => handleEdit(record)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="delete-action"
                          onClick={() => handleDelete(record)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
