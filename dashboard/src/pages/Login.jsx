import { useState } from "react";
import { loginUser } from "../services/api";
import "./Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      await loginUser(email, password);
      window.location.href = "/";
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        "Unable to sign in. Please check your credentials.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <img
            src="/intocial-logo.png"
            alt="INTOCIAL"
            className="auth-logo"
          />

          <div className="auth-brand-name">
            INTOCIAL
          </div>

          <h1>Sign in to INTOCIAL</h1>

          <p>
            Access your social intelligence workspace and
            investigations.
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <div className="auth-field">
            <label htmlFor="email">
              Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="Enter your email"
              autoComplete="email"
              disabled={loading}
              required
            />
          </div>

          <div className="auth-field">
            <div className="auth-field-header">
              <label htmlFor="password">
                Password
              </label>

              <button
                type="button"
                className="auth-link auth-forgot"
                onClick={() =>
                  setError(
                    "Password recovery is not available yet."
                  )
                }
              >
                Forgot password?
              </button>
            </div>

            <div className="auth-password-wrapper">
              <input
                id="password"
                name="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={loading}
                required
              />

              <button
                type="button"
                className="auth-password-toggle"
                onClick={() =>
                  setShowPassword((value) => !value)
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                <span className="material-symbols-outlined">
                  {showPassword
                    ? "visibility_off"
                    : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {error && (
            <div
              className="auth-error"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="auth-footer">
          <span>Don't have an account?</span>

          <a href="/register">
            Create account
          </a>
        </div>
      </section>
    </main>
  );
}

export default Login;