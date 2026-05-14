import React, { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const styles = {
  toolbar: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 600,
    border: '1px solid var(--border)',
    borderRadius: 6,
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  btnPrimary: {
    background: 'var(--accent-blue)',
    color: '#fff',
    borderColor: 'var(--accent-blue)',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 9998,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'fadeIn 0.15s',
  },
  modal: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '24px 28px',
    width: 380,
    maxWidth: '90vw',
    boxShadow: 'var(--shadow-lg)',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: 16,
  },
  field: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 4,
    display: 'block',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    fontSize: 13,
    border: '1px solid var(--border)',
    borderRadius: 6,
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '8px 10px',
    fontSize: 13,
    border: '1px solid var(--border)',
    borderRadius: 6,
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 20,
  },
  spinner: {
    width: 14,
    height: 14,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ExportToolbar({ contentRef }) {
  const [exporting, setExporting] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [email, setEmail] = useState('');
  const [day, setDay] = useState('Monday');
  const [time, setTime] = useState('08:00');
  const [scheduled, setScheduled] = useState(false);

  const handleExportPDF = async () => {
    const target = contentRef?.current || document.getElementById('analytics-content');
    if (!target) return;

    setExporting(true);
    try {
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f4f5f7',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      if (pdfHeight <= pageHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      } else {
        while (position < pdfHeight) {
          if (position > 0) pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, -position, pdfWidth, pdfHeight);
          position += pageHeight;
        }
      }

      pdf.save('analytics-report.pdf');
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleSchedule = () => {
    if (!email.trim()) return;
    // In production this would hit an API endpoint
    console.log('Scheduled weekly email:', { email, day, time });
    setScheduled(true);
    setTimeout(() => {
      setShowSchedule(false);
      setScheduled(false);
    }, 1500);
  };

  return (
    <>
      <div style={styles.toolbar}>
        <button
          style={{ ...styles.btn, opacity: exporting ? 0.7 : 1 }}
          onClick={handleExportPDF}
          disabled={exporting}
          onMouseEnter={(e) => { if (!exporting) e.currentTarget.style.borderColor = 'var(--accent-blue)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          {exporting ? (
            <>
              <div style={styles.spinner} />
              Exporting...
            </>
          ) : (
            <>
              <span style={{ fontSize: 14 }}>&#128196;</span>
              Export PDF
            </>
          )}
        </button>
        <button
          style={styles.btn}
          onClick={() => setShowSchedule(true)}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          <span style={{ fontSize: 14 }}>&#128231;</span>
          Schedule Weekly Email
        </button>
      </div>

      {showSchedule && (
        <div style={styles.overlay} onClick={() => setShowSchedule(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>
              {scheduled ? 'Scheduled!' : 'Schedule Weekly Report'}
            </div>

            {scheduled ? (
              <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 13, color: 'var(--accent-green)' }}>
                Weekly report scheduled for {day}s at {time} to {email}
              </div>
            ) : (
              <>
                <div style={styles.field}>
                  <label style={styles.fieldLabel}>Recipient Email</label>
                  <input
                    type="email"
                    style={styles.input}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ops-team@company.com"
                  />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ ...styles.field, flex: 1 }}>
                    <label style={styles.fieldLabel}>Day of Week</label>
                    <select
                      style={styles.select}
                      value={day}
                      onChange={(e) => setDay(e.target.value)}
                    >
                      {DAYS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ ...styles.field, flex: 1 }}>
                    <label style={styles.fieldLabel}>Time</label>
                    <input
                      type="time"
                      style={styles.input}
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                </div>
                <div style={styles.modalActions}>
                  <button
                    style={styles.btn}
                    onClick={() => setShowSchedule(false)}
                  >
                    Cancel
                  </button>
                  <button
                    style={{
                      ...styles.btn,
                      ...styles.btnPrimary,
                      opacity: email.trim() ? 1 : 0.5,
                    }}
                    onClick={handleSchedule}
                    disabled={!email.trim()}
                  >
                    Schedule
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
