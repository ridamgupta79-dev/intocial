import { useRef, useState } from "react";
import api from "../services/api";
import "./Multimodal.css";

function Icon({ name }) {
  return (
    <span className="material-symbols-outlined">{name}</span>
  );
}

function riskClass(level) {
  return String(level || "LOW").toLowerCase();
}

function formatConfidence(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return String(value);
  }

  return `${(number * 100).toFixed(1)}%`;
}

function formatPrediction(value) {
  if (value === null || value === undefined) {
    return "—";
  }

  return String(value);
}

function Multimodal() {
  const fileInputRef = useRef(null);

  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAnalyze(event) {
    event.preventDefault();

    if (!text.trim()) {
      setError("Text evidence is required for multimodal analysis.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const formData = new FormData();
      formData.append("text", text.trim());

      if (image) {
        formData.append("image", image);
      }

      const response = await api.post("/analyze", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setResult(response.data);
    } catch (err) {
      console.error("Multimodal analysis failed:", err);

      setError(
        err.response?.data?.detail ||
          "Unable to complete multimodal analysis."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleImageChange(event) {
    const selectedFile = event.target.files?.[0] || null;

    if (!selectedFile) {
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    setError("");
    setImage(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setResult(null);
  }

  function removeImage() {
    setImage(null);
    setPreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setResult(null);
  }

  function resetWorkspace() {
    setText("");
    setImage(null);
    setPreview("");
    setResult(null);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const textAnalysis = result?.text_analysis;
  const multimodalAnalysis = result?.multimodal_analysis;

  const riskScore = textAnalysis?.risk_score;
  const riskLevel = textAnalysis?.risk_level || "LOW";
  const textConfidence = textAnalysis?.confidence;
  const multimodalConfidence = multimodalAnalysis?.confidence;

  const findings = [];

  if (textAnalysis?.prediction) {
    findings.push({
      title: "Text Classification",
      value: textAnalysis.prediction,
    });
  }

  if (textAnalysis?.severity_terms?.length) {
    findings.push({
      title: "Severity Indicators",
      value: textAnalysis.severity_terms.join(", "),
    });
  }

  if (textAnalysis?.urgency_terms?.length) {
    findings.push({
      title: "Urgency Indicators",
      value: textAnalysis.urgency_terms.join(", "),
    });
  }

  if (textAnalysis?.entities?.length) {
    findings.push({
      title: "Detected Entities",
      value: textAnalysis.entities.join(", "),
    });
  }

  return (
    <div className="multimodal-page">
      <header className="multimodal-header">
        <div>
          <div className="multimodal-eyebrow">
            <span className="status-dot" />
            MULTIMODAL INTELLIGENCE
          </div>

          <h1>Multimodal Analysis</h1>

          <p>
            Analyze text and visual evidence together to support richer
            intelligence assessment.
          </p>
        </div>

        <div className="multimodal-header-actions">
          <div className="ready-status">
            <span className="status-dot" />
            {loading ? "ANALYSIS RUNNING" : "ANALYSIS READY"}
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={resetWorkspace}
            disabled={loading}
          >
            <Icon name="restart_alt" />
            Reset Workspace
          </button>
        </div>
      </header>

      {error && (
        <div className="multimodal-error">
          <Icon name="error" />
          <span>{error}</span>
        </div>
      )}

      <div className="multimodal-workspace">
        <section className="multimodal-panel input-panel">
          <div className="panel-heading">
            <div>
              <div className="panel-kicker">
                ANALYSIS INPUT
              </div>

              <div className="panel-title-row">
                <Icon name="upload_file" />
                <h2>Submit Evidence</h2>
              </div>

              <p className="panel-description">
                Multimodal ingestion pipeline · Text signals and visual
                evidence
              </p>
            </div>

            <span className="stage-badge">STAGE 01</span>
          </div>

          <form onSubmit={handleAnalyze}>
            <div className="form-section">
              <div className="field-heading">
                <label htmlFor="multimodal-text">
                  TEXT SIGNAL
                </label>

                <span>{text.length} / 4000 chars</span>
              </div>

              <textarea
                id="multimodal-text"
                value={text}
                maxLength={4000}
                onChange={(event) => {
                  setText(event.target.value);
                  setResult(null);
                  setError("");
                }}
                placeholder="Paste a social-media signal, intelligence report, analyst note, or field narrative..."
                rows={8}
              />
            </div>

            <div className="form-section">
              <div className="field-heading">
                <label>IMAGE EVIDENCE</label>

                <span>
                  {image ? "IMAGE SELECTED" : "OPTIONAL"}
                </span>
              </div>

              {!image ? (
                <button
                  type="button"
                  className="upload-zone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Icon name="add_photo_alternate" />

                  <strong>Choose image evidence</strong>

                  <span>
                    PNG, JPG, JPEG, WEBP · Image evidence only
                  </span>
                </button>
              ) : (
                <div className="image-evidence">
                  <div className="image-preview">
                    <img
                      src={preview}
                      alt="Selected evidence preview"
                    />
                  </div>

                  <div className="image-meta">
                    <div className="image-file-row">
                      <Icon name="image" />

                      <div>
                        <strong>{image.name}</strong>

                        <span>
                          {(image.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    </div>

                    <div className="image-actions">
                      <button
                        type="button"
                        onClick={() =>
                          fileInputRef.current?.click()
                        }
                      >
                        Change
                      </button>

                      <button
                        type="button"
                        className="remove-action"
                        onClick={removeImage}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleImageChange}
                hidden
              />
            </div>

            <div className="analysis-note">
              <div>
                <Icon name="info" />
                <span>
                  Text evidence is required. Image evidence is optional.
                </span>
              </div>

              <span className="analysis-mode">
                TEXT + IMAGE FUSION
              </span>
            </div>

            <button
              className="run-analysis-button"
              type="submit"
              disabled={loading || !text.trim()}
            >
              <Icon name={loading ? "refresh" : "troubleshoot"} />

              {loading
                ? "RUNNING MULTIMODAL ANALYSIS..."
                : "RUN MULTIMODAL ANALYSIS"}
            </button>

            <div className="input-footer">
              <span>
                <span className="footer-dot" />
                API Gateway: Active
              </span>

              <span>
                {image
                  ? "Text + image evidence"
                  : "Text evidence"}
              </span>
            </div>
          </form>
        </section>

        <section className="multimodal-panel result-panel">
          <div className="panel-heading">
            <div>
              <div className="panel-kicker">
                MODEL OUTPUT
              </div>

              <div className="panel-title-row">
                <Icon name="policy" />
                <h2>Intelligence Result</h2>

                {result && (
                  <span className="complete-badge">
                    ANALYSIS COMPLETE
                  </span>
                )}
              </div>

              {result && (
                <p className="panel-description">
                  Assessment generated from submitted evidence
                </p>
              )}
            </div>

            {result && (
              <span className="result-id">
                MULTIMODAL RESULT
              </span>
            )}
          </div>

          {!result ? (
            <div className="result-empty">
              <div className="empty-icon">
                <Icon name="psychology" />
              </div>

              <strong>
                Submit evidence to generate an intelligence assessment.
              </strong>

              <span>
                Add text evidence and optionally attach an image.
              </span>
            </div>
          ) : (
            <div className="result-content">
              <div className="result-metrics">
                <div className={`result-metric risk-${riskClass(riskLevel)}`}>
                  <div className="metric-label">
                    RISK LEVEL
                    <Icon name="warning" />
                  </div>

                  <strong>{riskLevel}</strong>

                  <span>
                    Current text-derived risk assessment
                  </span>
                </div>

                <div className="result-metric">
                  <div className="metric-label">
                    RISK SCORE
                  </div>

                  <strong>
                    {riskScore !== undefined
                      ? Number(riskScore).toFixed(1)
                      : "—"}
                  </strong>

                  <div className="score-track">
                    <span
                      style={{
                        width: `${Math.min(
                          Math.max(Number(riskScore) || 0,
                          0),
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="result-metric">
                  <div className="metric-label">
                    TEXT CONFIDENCE
                  </div>

                  <strong>
                    {formatConfidence(textConfidence)}
                  </strong>

                  <span>
                    Model classification confidence
                  </span>
                </div>

                <div className="result-metric">
                  <div className="metric-label">
                    MULTIMODAL
                  </div>

                  <strong>
                    {multimodalAnalysis
                      ? formatConfidence(multimodalConfidence)
                      : "TEXT"}
                  </strong>

                  <span>
                    {multimodalAnalysis
                      ? "Image + text model confidence"
                      : "No image evidence supplied"}
                  </span>
                </div>
              </div>

              <div className="result-section">
                <div className="result-section-heading">
                  <span>
                    <Icon name="psychology" />
                    INTELLIGENCE ASSESSMENT
                  </span>
                </div>

                <div className="assessment-box">
                  <p>
                    {multimodalAnalysis
                      ? "Multimodal analysis completed using the submitted text and image evidence."
                      : "Text analysis completed using the submitted intelligence signal."}
                  </p>

                  {multimodalAnalysis && (
                    <p>
                      Multimodal model prediction:{" "}
                      <strong>
                        {formatPrediction(
                          multimodalAnalysis.prediction
                        )}
                      </strong>{" "}
                      with{" "}
                      <strong>
                        {formatConfidence(
                          multimodalAnalysis.confidence
                        )}
                      </strong>{" "}
                      confidence.
                    </p>
                  )}
                </div>
              </div>

              <div className="result-section">
                <div className="result-section-heading">
                  <span>
                    <Icon name="fact_check" />
                    KEY FINDINGS
                  </span>

                  <span>
                    {findings.length} INDICATORS
                  </span>
                </div>

                {findings.length === 0 ? (
                  <div className="no-findings">
                    No additional indicators returned by the model.
                  </div>
                ) : (
                  <div className="findings-list">
                    {findings.map((finding, index) => (
                      <div
                        className="finding-row"
                        key={`${finding.title}-${index}`}
                      >
                        <span className="finding-number">
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        <div>
                          <strong>{finding.title}</strong>
                          <p>{finding.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="result-section">
                <div className="result-section-heading">
                  <span>
                    <Icon name="compare" />
                    EVIDENCE INTERPRETATION
                  </span>

                  <span>
                    ACTUAL MODEL OUTPUT
                  </span>
                </div>

                <div className="evidence-grid">
                  <div className="evidence-card">
                    <div className="evidence-card-title">
                      <Icon name="notes" />
                      Text Evidence
                    </div>

                    <p>
                      The submitted narrative was processed through the
                      existing text risk pipeline.
                    </p>

                    <span>
                      Risk: {riskLevel} · Score:{" "}
                      {riskScore ?? "—"}
                    </span>
                  </div>

                  <div className="evidence-card">
                    <div className="evidence-card-title">
                      <Icon name="image" />
                      Visual Evidence
                    </div>

                    <p>
                      {image
                        ? "The selected image was included in the multimodal model input."
                        : "No visual evidence was submitted for this analysis."}
                    </p>

                    <span>
                      {multimodalAnalysis
                        ? `Model confidence: ${formatConfidence(
                            multimodalConfidence
                          )}`
                        : "Image analysis not run"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Multimodal;