import { useState } from "react";

import { ingestYouTube } from "../services/api";


function YouTubeIngestion() {
  const [videoId, setVideoId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");


  async function handleIngest(event) {
    event.preventDefault();

    const trimmedVideoId = videoId.trim();

    if (!trimmedVideoId) {
      setError("Enter a YouTube video ID.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setError("");

      const data = await ingestYouTube(
        trimmedVideoId,
        20
      );

      setMessage(
        `Fetched ${data.comments_fetched} comments. ` +
        `${data.new_signals} new signals stored. ` +
        `${data.duplicates_skipped} duplicates skipped.`
      );

      setVideoId("");

    } catch (err) {
      console.error(
        "YouTube ingestion failed:",
        err
      );

      setError(
        err.response?.data?.detail ||
        "Unable to ingest YouTube comments."
      );

    } finally {
      setLoading(false);
    }
  }


  return (
    <section className="panel">

      <div className="panel-header">

        <div>
          <p className="eyebrow">
            EXTERNAL SOURCE
          </p>

          <h2>
            YouTube Ingestion
          </h2>
        </div>

        <span className="panel-meta">
          LIVE SOURCE
        </span>

      </div>


      <form
        className="multimodal-form"
        onSubmit={handleIngest}
      >

        <div className="form-group">

          <label htmlFor="youtube-video-id">
            YOUTUBE VIDEO ID
          </label>

          <input
            id="youtube-video-id"
            type="text"
            value={videoId}
            onChange={(event) =>
              setVideoId(event.target.value)
            }
            placeholder="Enter a YouTube video ID..."
          />

        </div>


        {error && (
          <div className="form-error">
            {error}
          </div>
        )}


        {message && (
          <div className="form-success">
            {message}
          </div>
        )}


        <button
          className="analyze-button"
          type="submit"
          disabled={loading}
        >
          {loading
            ? "INGESTING..."
            : "INGEST YOUTUBE COMMENTS"}
        </button>

      </form>

    </section>
  );
}


export default YouTubeIngestion;