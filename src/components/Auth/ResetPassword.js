// ResetPassword.js - TITANTRACK PASSWORD RESET PAGE
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './ResetPassword.css';
import { FaSpinner } from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Clear error when user types
  useEffect(() => {
    if (error) setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password, confirmPassword]);

  // No token = invalid link
  if (!token) {
    return (
      <div className="reset-overlay">
        <div className="reset-modal">
          <div className="reset-header">
            <h2>Invalid Link</h2>
            <p>This password reset link is invalid or has expired.</p>
          </div>
          <button className="reset-submit" onClick={() => navigate('/')}>
            Back to TitanTrack
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password.trim()) {
      setError('Please enter a new password');
      return;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="reset-overlay">
        <div className="reset-modal">
          <div className="reset-header">
            <h2>Password Reset</h2>
            <p>Your password has been updated. You can now sign in.</p>
          </div>
          <button className="reset-submit" onClick={() => navigate('/')}>
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-overlay">
      <div className="reset-modal">
        <div className="reset-header">
          <h2>Reset Password</h2>
          <p>Enter your new password below.</p>
        </div>

        {error && (
          <div className="reset-error">{error}</div>
        )}

        <form className="reset-form" onSubmit={handleSubmit}>
          <div className="reset-field">
            <label htmlFor="new-password">New Password</label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              autoComplete="new-password"
              disabled={isLoading}
            />
          </div>

          <div className="reset-field">
            <label htmlFor="confirm-new-password">Confirm Password</label>
            <input
              id="confirm-new-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
              disabled={isLoading}
            />
          </div>

          <button type="submit" className="reset-submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <FaSpinner className="reset-spinner" />
                <span>Resetting...</span>
              </>
            ) : (
              <span>Reset Password</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
