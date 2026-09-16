import { useState } from "react";
import { registerUser } from "../services/api";
import "./Login.css";
import "./Register.css";

function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await registerUser(username, email, password);
      window.location.href = "/login";
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        "Unable to create account. Please try again.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card register-card">
        <div className="auth-brand">
          <img
            src="/intocial-logo.png"
            alt="INTOCIAL"
            className="auth-logo"
          />

          <div className="auth-brand-name">
            INTOCIAL
          </div>

          <h1>Create your account</h1>

          <p>
            Create an analyst account to access your
            social intelligence workspace.
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <div className="auth-field">
            <label htmlFor="username">
              Username
            </label>

            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              placeholder="Enter your username"
              autoComplete="username"
              disabled={loading}
              required
              minLength={3}
              maxLength={100}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="register-email">
              Email
            </label>

            <input
              id="register-email"
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
            <label htmlFor="register-password">
              Password
            </label>

            <div className="auth-password-wrapper">
              <input
                id="register-password"
                type={
                  showPassword ? "text" : "password"
                }
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Create a password"
                autoComplete="new-password"
                disabled={loading}
                required
                minLength={8}
                maxLength={72}
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

          <div className="auth-field">
            <label htmlFor="confirm-password">
              Confirm Password
            </label>

            <div className="auth-password-wrapper">
              <input
                id="confirm-password"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Confirm your password"
                autoComplete="new-password"
                disabled={loading}
                required
                minLength={8}
                maxLength={72}
              />

              <button
                type="button"
                className="auth-password-toggle"
                onClick={() =>
                  setShowConfirmPassword(
                    (value) => !value
                  )
                }
                aria-label={
                  showConfirmPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                <span className="material-symbols-outlined">
                  {showConfirmPassword
                    ? "visibility_off"
                    : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "Creating account..."
              : "Create Account"}
          </button>
        </form>

        <div className="auth-footer">
          <span>Already have an account?</span>

          <a href="/login">
            Sign in
          </a>
        </div>
      </section>
    </main>
  );
}

export default Register;