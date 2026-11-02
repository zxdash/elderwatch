
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { onValue, ref } from "firebase/database";
import { database } from "./firebase";

export default function DashboardHome() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const recordsRef = ref(database, "seniorRecords");

    const unsubscribe = onValue(
      recordsRef,
      (snapshot) => {
        const data = snapshot.val() || {};

        const list = Object.entries(data).map(
          ([id, values]) => ({
            id,
            ...values,
          })
        );

        setRecords(list);
        setLoading(false);
        setError("");
      },
      (err) => {
        setError(`Unable to load records: ${err.message}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const withHealthHistory = records.filter(
    (record) => record.medicalHistory?.trim()
  ).length;

  const withContactNumbers = records.filter(
    (record) => record.contactNumber?.trim()
  ).length;

  const recentRecords = [...records]
    .sort(
      (a, b) =>
        Number(b.createdAt || 0) -
        Number(a.createdAt || 0)
    )
    .slice(0, 5);

  return (
    <div className="dashboard-home">
      <div className="page-heading">
        <div>
          <h1>Dashboard</h1>
          <p>
            Overview of ElderWatch senior citizen records.
          </p>
        </div>

        <Link to="/records" className="primary-link">
          Manage Records
        </Link>
      </div>

      {error && <p role="alert" className="error">{error}</p>}

      {loading ? (
        <p>Loading dashboard information...</p>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <span>Total Senior Citizens</span>
              <strong>{records.length}</strong>
              <small>Registered records</small>
            </div>

            <div className="stat-card">
              <span>With Medical History</span>
              <strong>{withHealthHistory}</strong>
              <small>Records with medical history entered</small>
            </div>

            <div className="stat-card">
              <span>With Contact Numbers</span>
              <strong>{withContactNumbers}</strong>
              <small>Records with contact information</small>
            </div>
          </div>

          <section className="recent-panel">
            <div className="panel-heading">
              <h2>Recently Added Seniors</h2>
              <Link to="/records">View All Records</Link>
            </div>

            {recentRecords.length === 0 ? (
              <p>No records have been added yet.</p>
            ) : (
              <ul className="recent-list">
                {recentRecords.map((record) => (
                  <li key={record.id}>
                    <div>
                      <strong>{record.fullName}</strong>
                      <p>{record.address || "No address"}</p>
                    </div>
                    <span>Registered</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
