import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Home.css';
import { getMyFunds, removeFund, removeCountryFunds } from '../api';

export default function FundingStats() {
  const navigate = useNavigate();
  const [fundsByCountry, setFundsByCountry] = useState({});
  const [individualFunds, setIndividualFunds] = useState({});
  const [animatingValues, setAnimatingValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasFetched, setHasFetched] = useState(false);
  const [sortBy, setSortBy] = useState('amount'); // 'amount' or 'date'
  const [totalFunded, setTotalFunded] = useState(0);
  const [totalByCurrency, setTotalByCurrency] = useState({}); // { USD: 120, EUR: 40 }
  const [removeInputs, setRemoveInputs] = useState({}); // { country: { amount: '', currency: 'USD' } }
  const [removing, setRemoving] = useState({}); // { country: boolean }
  const [removingCountry, setRemovingCountry] = useState({}); // { country: boolean }
  const [primaryCurrencyByCountry, setPrimaryCurrencyByCountry] = useState({});

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };
const CURRENCY_ICONS = {
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'JPY': '¥',
  'CAD': 'C$',
  'AUD': 'A$',
  'CHF': 'CHF',
  'CNY': '¥',
  'INR': '₹',
  'TND': 'د.ت',
  'ZAR': 'R',
  'NGN': '₦',
  'EGP': 'E£',
  'SGD': 'S$',
  'KRW': '₩',
  'THB': '฿',
  'SEK': 'kr',
  'NOK': 'kr',
  'DKK': 'kr',
  'MXN': '$',
  'BRL': 'R$',
  'ARS': '$',
  'CLP': '$',
  'NZD': 'NZ$'
};
  const refreshData = () => {
    setLoading(true);
    setError('');
    fetchFundsData();
  };

  const fetchFundsData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      setError('Login required');
      return;
    }

    try {
      const startTime = Date.now();
      const response = await getMyFunds();
      const funds = response?.data?.funds ?? response?.data ?? [];

      if (!Array.isArray(funds)) {
        throw new Error('Unexpected response format');
      }

      // Group funds by destination (country) and keep individual entries
      const grouped = {};
      const totalsPerCurrency = {};
      const individuals = {};
      const latestCurrencyForCountry = {};
      const latestTimePerCountry = {};
      let totalAmount = 0;
      
      funds.forEach((fund) => {
        const country = fund.destination;
        const amt = parseFloat(fund.amount) || 0;
        const currency = (fund.currency || 'USD').toUpperCase();
        const createdTs = new Date(fund.createdAt || Date.now()).getTime();

        if (!grouped[country]) {
          grouped[country] = {};
          individuals[country] = [];
        }
        grouped[country][currency] = (grouped[country][currency] || 0) + amt;
        totalsPerCurrency[currency] = (totalsPerCurrency[currency] || 0) + amt;
        if (!latestTimePerCountry[country] || createdTs > latestTimePerCountry[country]) {
          latestTimePerCountry[country] = createdTs;
          latestCurrencyForCountry[country] = currency;
        }
        totalAmount += amt;
        individuals[country].push({
          amount: amt,
          currency: fund.currency,
          createdAt: fund.createdAt,
          funderName: fund.funderName,
        });
      });

      setTotalFunded(totalAmount);
      setTotalByCurrency(totalsPerCurrency);
      setFundsByCountry(grouped);
      setIndividualFunds(individuals);

      // Initialize animating values at half the primary currency amount (or 0 if mixed)
      const initialValues = {};
      Object.keys(grouped).forEach((country) => {
        const currencies = Object.keys(grouped[country]);
        if (currencies.length === 1) {
          const amt = grouped[country][currencies[0]];
          initialValues[country] = Math.floor(amt / 2);
        } else {
          initialValues[country] = 0;
        }
      });
      setAnimatingValues(initialValues);

      setHasFetched(true);
      setPrimaryCurrencyByCountry(latestCurrencyForCountry);

      // Set default remove currency per country to the latest submitted currency
      setRemoveInputs((prev) => {
        const next = { ...prev };
        Object.keys(grouped).forEach((country) => {
          const defaultCurrency = latestCurrencyForCountry[country] || 'USD';
          const existing = next[country];
          if (!existing || !existing.currency || (existing.currency === 'USD' && !existing.amount)) {
            next[country] = { amount: existing?.amount || '', currency: defaultCurrency };
          }
        });
        return next;
      });
      
      // Ensure minimum loading time of 5000ms
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, 9000 - elapsed);
      
      setTimeout(() => {
        setLoading(false);
        
        // Animate to full amounts after loading is done
        const animationDuration = 2000; // 2 seconds
        const animStartTime = Date.now();

        const animateNumbers = () => {
          const elapsed = Date.now() - animStartTime;
          const progress = Math.min(elapsed / animationDuration, 1);

          const newValues = {};
          Object.keys(grouped).forEach((country) => {
            const currencies = Object.keys(grouped[country]);
            if (currencies.length === 1) {
              const endVal = grouped[country][currencies[0]];
              const startVal = Math.floor(endVal / 2);
              newValues[country] = Math.floor(startVal + (endVal - startVal) * progress);
            } else {
              newValues[country] = 0;
            }
          });
          
          setAnimatingValues(newValues);

          if (progress < 1) {
            requestAnimationFrame(animateNumbers);
          }
        };

        requestAnimationFrame(animateNumbers);
      }, remainingTime);
    } catch (err) {
      console.error('Failed to fetch funds:', err);
      setError(err?.response?.status === 401 ? 'Session expired. Please log in again.' : (err.message || 'Failed to load data'));
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFundsData();
  }, []);

  const handleBack = () => {
    navigate('/');
  };
  const getConvertedTxAmount = (tx) => {
    const base = tx.currency || 'USD';
    const key = `${base}->${converterToCurrency}`;
    const rate = ratesCacheRef.current.get(key) ?? 1;
    const amt = (Number(tx.amount) || 0) * rate;
    return `${CURRENCY_ICONS[converterToCurrency]} ${amt.toFixed(2)} ${converterToCurrency}`;
  };

  const renderAnimatedNumber = (current) => {
    const currentStr = Math.floor(current).toLocaleString();
    const currentDigits = currentStr.split('');

    return currentDigits.map((digit, index) => (
      <span key={`${index}-${digit}`} className="digit-wrapper">
        <span className="digit">{digit}</span>
      </span>
    ));
  };

  const formatDate = (dateString) => {
    const options = { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const formatAmountWithCurrency = (amt, currency) => {
    const curr = (currency || 'USD').toUpperCase();
    const symbol = CURRENCY_ICONS[curr] || '';
    return `${symbol} ${Number(amt).toFixed(2)} ${curr}`;
  };

  const getCountryTotal = (country) => {
    const totals = fundsByCountry[country] || {};
    return Object.values(totals).reduce((sum, val) => sum + val, 0);
  };

  const getSortedCountries = () => {
    const entries = Object.entries(fundsByCountry);
    if (sortBy === 'amount') {
      return entries.sort((a, b) => getCountryTotal(b[0]) - getCountryTotal(a[0]));
    }
    // Sort by latest date
    return entries.sort((a, b) => {
      const latestA = Math.max(...individualFunds[a[0]].map(f => new Date(f.createdAt).getTime()));
      const latestB = Math.max(...individualFunds[b[0]].map(f => new Date(f.createdAt).getTime()));
      return latestB - latestA;
    });
  };

  const handleRemoveChange = (country, field, value) => {
    setRemoveInputs((prev) => ({
      ...prev,
      [country]: {
        amount: prev[country]?.amount || '',
        currency: prev[country]?.currency || 'USD',
        [field]: value,
      },
    }));
  };

  const handleRemoveSubmit = async (country) => {
    const user = JSON.parse(localStorage.getItem('user'));
    const input = removeInputs[country] || { amount: '', currency: 'USD' };
    const amt = parseFloat(input.amount);
    if (!amt || amt <= 0) {
      alert('Please enter a positive amount to remove.');
      return;
    }
    const curr = (input.currency || 'USD').toUpperCase();
    try {
      setRemoving((p) => ({ ...p, [country]: true }));
      await removeFund(country, user?.name || 'Withdrawal', amt, curr);
      // Refresh UI
      await fetchFundsData();
      setRemoveInputs((p) => ({ ...p, [country]: { amount: '', currency: curr } }));
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to remove amount');
    } finally {
      setRemoving((p) => ({ ...p, [country]: false }));
    }
  };

  const getRemovePreview = (country) => {
    const input = removeInputs[country];
    if (!input) return null;
    const amt = parseFloat(input.amount);
    if (!Number.isFinite(amt) || amt <= 0) return null;
    const curr = (input.currency || 'USD').toUpperCase();
    const currentTotal = Number(fundsByCountry[country]?.[curr] || 0);
    const newTotal = currentTotal - amt;
    return { amt, currency: curr, newTotal };
  };

  const handleRemoveCountry = async (country) => {
    const confirmed = window.confirm(`Remove all funds for ${country}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setRemovingCountry((p) => ({ ...p, [country]: true }));
      await removeCountryFunds(country);
      await fetchFundsData();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to remove country funds');
    } finally {
      setRemovingCountry((p) => ({ ...p, [country]: false }));
    }
  };

  const renderCountryCurrencyTotals = (country) => {
    const totals = fundsByCountry[country] || {};
    const entries = Object.entries(totals);
    if (!entries.length) return null;
    return (
      <div className="currency-totals">
        {entries.map(([currency, amt]) => (
          <span key={currency} className="currency-chip">
            {(CURRENCY_ICONS[currency] || '')} {amt.toFixed(2)} {currency}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="home-container">
      <header className="header">
        <div className="header-bar" />
        <div className="header-content bar-done content-in">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="back-btn" onClick={handleBack}>
              ← Back
            </button>
            <h1>Funding Statistics</h1>
          </div>
        </div>
      </header>

      <main className="main-content">
        <section className="stats-section">
          <div className="stats-header">
            <div>
              <h2 className="section-heading">Your Funding Journey</h2>
              <p className="stats-subtitle">Track your contributions across destinations</p>
            </div>
            <div className="stats-controls">
              <button className="refresh-btn" onClick={refreshData} title="Refresh data">
                ↻
              </button>
              <div className="sort-controls">
                <label>Sort by:</label>
                <button 
                  className={`sort-btn ${sortBy === 'amount' ? 'active' : ''}`}
                  onClick={() => setSortBy('amount')}
                >
                  Amount
                </button>
                <button 
                  className={`sort-btn ${sortBy === 'date' ? 'active' : ''}`}
                  onClick={() => setSortBy('date')}
                >
                  Recent
                </button>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="loading">Loading your funding data...</div>
          ) : error ? (
            <div className="empty-state">
              <p>⚠️ {error}</p>
            </div>
          ) : Object.keys(fundsByCountry).length === 0 && hasFetched ? (
            <div className="empty-state">
              <p>🌍 No funding data yet</p>
              <p>Submit a fund to see your statistics!</p>
            </div>
          ) : (
            <>
              <div className="total-funded">
                <span className="total-label">Total Funded</span>
                <div className="total-amounts">
                  {Object.entries(totalByCurrency).map(([currency, amt]) => (
                    <span key={currency} className="total-chip">
                      {(CURRENCY_ICONS[currency] || '')} {amt.toFixed(2)} {currency}
                    </span>
                  ))}
                  {!Object.keys(totalByCurrency).length && (
                    <span className="total-chip">0</span>
                  )}
                </div>
              </div>
              <div className="funding-cards">
                {getSortedCountries().map(([country]) => (
                  <div key={country} className="funding-card">
                    <div className="card-header">
                      <h3 className="country-name">{country}</h3>
                      <span className="contribution-count">
                        {individualFunds[country]?.length || 0} contribution{individualFunds[country]?.length !== 1 ? 's' : ''}
                      </span>
                      <button
                        className="remove-country-btn"
                        onClick={() => handleRemoveCountry(country)}
                        disabled={!!removingCountry[country]}
                        title="Remove all funds for this destination"
                      >
                        {removingCountry[country] ? 'Removing…' : 'Remove Country'}
                      </button>
                    </div>
                    <div className="funding-total">
                      {(() => {
                        const totals = fundsByCountry[country] || {};
                        const currencies = Object.keys(totals);
                        if (currencies.length === 1) {
                          const curr = currencies[0];
                          const symbol = CURRENCY_ICONS[curr] || '';
                          return (
                            <div className="single-currency-total">
                              <span className="currency-symbol">{symbol}</span>
                              <span className="amount-value">
                                {renderAnimatedNumber(animatingValues[country] || 0)}
                              </span>
                              <span className="currency-code">{curr}</span>
                            </div>
                          );
                        }
                        return (
                          <div>
                            <div className="mixed-currency-label">Multiple currencies</div>
                            {renderCountryCurrencyTotals(country)}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="remove-section">
                      <div className="amount-row">
                        <input
                          type="number"
                          className="form-input amount-input remove-input"
                          placeholder="Amount to remove"
                          value={removeInputs[country]?.amount || ''}
                          onChange={(e) => handleRemoveChange(country, 'amount', e.target.value)}
                          min="0"
                          step="0.01"
                        />
                        <select
                          className="form-input remove-currency"
                          value={(removeInputs[country]?.currency || 'USD')}
                          onChange={(e) => handleRemoveChange(country, 'currency', e.target.value)}
                        >
                          {Object.keys(CURRENCY_ICONS).map((c) => (
                            <option key={c} value={c}>{CURRENCY_ICONS[c]} {c}</option>
                          ))}
                        </select>
                        <button
                          className="remove-btn"
                          onClick={() => handleRemoveSubmit(country)}
                          disabled={!!removing[country] || !(parseFloat(removeInputs[country]?.amount) > 0)}
                          title="Remove amount from this destination"
                        >
                          {!removing[country] ? (
                            <span className="remove-btn-content">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14" />
                              </svg>
                              <span>Remove</span>
                            </span>
                          ) : (
                            'Removing…'
                          )}
                        </button>
                      </div>

                      {getRemovePreview(country) && (
                        <div className="remove-preview">
                          {(() => {
                            const prev = getRemovePreview(country);
                            return (
                              <>
                                <span className="label">Will remove:</span>
                                <span className="preview-amount">
                                  - {CURRENCY_ICONS[prev.currency]} {prev.amt.toFixed(2)} {prev.currency}
                                </span>
                                <span className={`preview-newtotal ${prev.newTotal < 0 ? 'negative' : ''}`}>
                                  New total: {(CURRENCY_ICONS[prev.currency] || '')} {prev.newTotal.toFixed(2)} {prev.currency}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                    
                    {individualFunds[country] && individualFunds[country].length > 0 && (
                      <div className="funding-history">
                        <p className="history-title">Contributions</p>
                        <div className="history-items">
                          {individualFunds[country]
                            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                            .map((fund, index) => (
                            <div key={index} className="history-item">
                              <div className="history-item-left">
                                <div className={`history-item-amount ${fund.amount < 0 ? 'negative' : ''}`}>
                                  {formatAmountWithCurrency(fund.amount, fund.currency)} <span className="currency-badge">{fund.currency}</span>
                                </div>
                                <div className="history-item-meta">
                                  {fund.funderName}
                                </div>
                              </div>
                              <div className="history-item-date">
                                {formatDate(fund.createdAt)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
