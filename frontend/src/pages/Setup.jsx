import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setupProfile } from '../api';
import '../styles/Setup.css';

export default function Setup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ funderUsername: '', continent: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const CONTINENT_OPTIONS = [
    { value: 'Africa', label: 'Africa' },
    { value: 'Asia', label: 'Asia' },
    { value: 'Europe', label: 'Europe' },
    { value: 'North America', label: 'North America' },
    { value: 'South America', label: 'South America' },
    { value: 'Oceania', label: 'Oceania' },
    { value: 'Antarctica', label: 'Antarctica' },
  ];

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.funderUsername.trim() || !formData.continent.trim()) {
      setError('Please fill both fields');
      return;
    }

    setLoading(true);
    try {
      const { data } = await setupProfile(formData.funderUsername.trim(), formData.continent.trim());
      if (data?.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      setShowWelcome(true);
      // Allow fade-in, then trigger fade-out before navigation
      setTimeout(() => setFadeOut(true), 2100);
      setTimeout(() => navigate('/'), 2700);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  if (showWelcome) {
    return (
      <div className={`welcome-loading ${fadeOut ? 'fade-out' : ''}`}>
        <p className="fade-text">Welcome to FundMe where everything will be saved in good hands</p>
      </div>
    );
  }

  return (
    <div className="setup-container">
      <div className="setup-box">
        <h2>Complete Your Profile</h2>
        <p className="muted">We just need a couple details to get started.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="funderUsername"
            placeholder="Funder username"
            value={formData.funderUsername}
            onChange={handleChange}
            disabled={loading}
            required
          />
          <div className="continent-picker">
            <div className="continent-picker-label">Select your continent</div>
            <div className="continent-grid" role="radiogroup" aria-label="Continent">
              {CONTINENT_OPTIONS.map((opt) => {
                const selected = formData.continent === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`continent-card ${selected ? 'selected' : ''}`}
                    onClick={() => setFormData((p) => ({ ...p, continent: opt.value }))}
                    aria-pressed={selected}
                    role="radio"
                    aria-checked={selected}
                    disabled={loading}
                    title={opt.label}
                  >
                    <span className="continent-label">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}
