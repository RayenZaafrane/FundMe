import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Home.css';
import { submitFund, getMyFunds, deleteAccount } from '../api';
import dollarSvg from '../assets/dollar.svg';
import calculatorPng from '../assets/calculator.png';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'TND'];

// Map continents to their primary currencies
const CONTINENT_CURRENCIES = {
  'Africa': ['TND', 'ZAR', 'NGN', 'EGP', 'USD', 'EUR'],
  'Asia': ['CNY', 'INR', 'JPY', 'SGD', 'KRW', 'THB', 'USD'],
  'Europe': ['EUR', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK'],
  'North America': ['USD', 'CAD', 'MXN'],
  'South America': ['BRL', 'ARS', 'CLP', 'USD'],
  'Oceania': ['AUD', 'NZD', 'USD'],
  'Antarctica': ['USD', 'EUR']
};

// Example destination suggestions by continent
const CONTINENT_DESTINATIONS = {
  'Africa': ['Morocco', 'Tunisia', 'Egypt', 'South Africa', 'Kenya', 'Nigeria'],
  'Asia': ['Japan', 'China', 'India', 'Singapore', 'Thailand', 'South Korea', 'United Arab Emirates'],
  'Europe': ['France', 'Germany', 'Spain', 'Italy', 'United Kingdom', 'Netherlands', 'Sweden', 'Norway'],
  'North America': ['United States', 'Canada', 'Mexico'],
  'South America': ['Brazil', 'Argentina', 'Chile', 'Peru'],
  'Oceania': ['Australia', 'New Zealand', 'Fiji'],
  'Antarctica': ['Antarctica']
};

// Map currencies to their symbols/icons
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

function DollarIcon() {
  return (
    <img
      src={dollarSvg}
      alt="Dollar icon"
      width="100%"
      height="100%"
      style={{ display: 'block' }}
    />
  );
}

function CalculatorIcon() {
  return (
    <img
      src={calculatorPng}
      alt="Calculator icon"
      width="100%"
      height="100%"
      style={{ display: 'block' }}
    />
  );
}

function CurrencyDropdown({ value, onChange, options, label }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (currency) => {
    onChange(currency);
    setIsOpen(false);
  };

  return (
    <div className="currency-dropdown-wrapper" ref={dropdownRef}>
      {label && <label className="currency-dropdown-label">{label}</label>}
      <button
        className="currency-dropdown-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="currency-dropdown-selected">
          {CURRENCY_ICONS[value]} {value}
        </span>
        <svg
          className={`currency-dropdown-arrow ${isOpen ? 'open' : ''}`}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {isOpen && (
        <div className="currency-dropdown-menu">
          {options.map((currency) => (
            <button
              key={currency}
              className={`currency-dropdown-item ${value === currency ? 'selected' : ''}`}
              onClick={() => handleSelect(currency)}
            >
              <span className="currency-dropdown-icon">{CURRENCY_ICONS[currency]}</span>
              <span className="currency-dropdown-code">{currency}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CurrencyWidget({ onUploadConverted, userContinent, onCurrencyChange }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState('TND');
  const [to, setTo] = useState('USD');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  // Get filtered currencies based on user's continent, but always include TND
  const availableCurrencies = useMemo(() => {
    let currencies = [];
    
    if (userContinent && CONTINENT_CURRENCIES[userContinent]) {
      const continentCurrencies = CONTINENT_CURRENCIES[userContinent];
      // Filter to only include currencies that are in both the continent list and CURRENCIES array
      currencies = continentCurrencies.filter(c => CURRENCIES.includes(c));
    } else {
      currencies = CURRENCIES;
    }
    
    // Always ensure TND is available as an option
    if (!currencies.includes('TND')) {
      currencies = ['TND', ...currencies];
    }
    
    return currencies;
  }, [userContinent]);

  // Ensure 'to' currency is valid for the continent and not the same as 'from'
  useEffect(() => {
    if (availableCurrencies.length > 0) {
      // If current 'to' is not in available currencies, switch to first available that's not 'from'
      if (!availableCurrencies.includes(to)) {
        const validOptions = availableCurrencies.filter(c => c !== from);
        setTo(validOptions.length > 0 ? validOptions[0] : availableCurrencies[0]);
      }
    }
  }, [availableCurrencies, from]);

  const converted = useMemo(() => {
    const val = parseFloat(amount);
    if (!rate || Number.isNaN(val)) return '';
    return (val * rate).toFixed(2);
  }, [amount, rate]);

  const fetchRate = async () => {
    try {
      setError('');
      setLoading(true);
      let r = null;
      
      // Try exchangerate-api.com first (supports TND)
      try {
        const res1 = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
        if (res1.ok) {
          const data1 = await res1.json();
          r = data1?.rates?.[to] ?? null;
        }
      } catch {}
      
      // Fallback to Frankfurter
      if (!r) {
        try {
          const res2 = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
          if (res2.ok) {
            const data2 = await res2.json();
            r = data2?.rates?.[to] ?? null;
          }
        } catch {}
      }
      
      // Final fallback to exchangerate.host
      if (!r) {
        const res3 = await fetch(`https://api.exchangerate.host/latest?base=${from}&symbols=${to}`);
        if (!res3.ok) throw new Error(`Rate fetch failed: ${res3.status}`);
        const data3 = await res3.json();
        r = data3?.rates?.[to] ?? null;
      }
      
      if (!r) throw new Error('Rate unavailable');
      setRate(r);
      setLastUpdated(new Date());
      // Notify parent component of currency change
      if (onCurrencyChange) {
        onCurrencyChange(to, r);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial + on currency change
  useEffect(() => {
    fetchRate();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(fetchRate, 30000); // refresh every 30s
    return () => pollRef.current && clearInterval(pollRef.current);
  }, [from, to]);

  const handleUploadConverted = () => {
    if (converted && onUploadConverted) {
      onUploadConverted(parseFloat(converted), to);
    }
  };

  return (
    <div className="currency-widget">
      <div
        role="button"
        tabIndex={0}
        aria-pressed={open}
        aria-label="Toggle currency converter"
        className={`toggle-control ${open ? 'open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        title={open ? 'Hide converter' : 'Show converter'}
      >
        <span className="icon-stack">
          <span className={`icon-layer ${open ? 'fade-out' : 'fade-in'}`}>
            <CalculatorIcon />
          </span>
          <span className={`icon-layer ${open ? 'fade-in' : 'fade-out'}`}>
            <DollarIcon />
          </span>
        </span>
      </div>

      <div className={`panel ${open ? 'panel-open' : ''}`}>
        <div className="panel-inner">
          <div className="row">
            <CurrencyDropdown
              label="From"
              value={from}
              onChange={setFrom}
              options={availableCurrencies}
            />
            <CurrencyDropdown
              label="To"
              value={to}
              onChange={setTo}
              options={availableCurrencies}
            />
          </div>

          <div className="row budget-row">
            <label className="label">Budget</label>
            <input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="1"
              inputMode="numeric"
            />
          </div>

          <div className="result">
            <div className="rate-line">
              <span className="muted">Rate:</span>
              {loading ? (
                <span className="value">Loading…</span>
              ) : error ? (
                <span className="value error">{error}</span>
              ) : (
                <span className="value">1 {from} = {rate ? rate.toFixed(4) : '--'} {to}</span>
              )}
            </div>
            <div className="converted-line">
              <span className="muted">Converted:</span>
              <span className="value strong">{converted ? `${converted} ${to}` : '--'}</span>
            </div>
            {converted && (
              <div className="upload-row">
                <span className="upload-label">Upload in the fund form</span>
                <button
                  type="button"
                  className="upload-btn"
                  onClick={handleUploadConverted}
                  title="Upload converted amount to fund form"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4z" />
                    <path d="M9 9h6" />
                    <path d="M9 14h6" />
                  </svg>
                </button>
              </div>
            )}
            {lastUpdated && (
              <div className="updated">Updated {lastUpdated.toLocaleTimeString()}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownClosing, setDropdownClosing] = useState(false);
  const [barDone, setBarDone] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [verificationWord, setVerificationWord] = useState('');
  const [verificationInput, setVerificationInput] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const isAnimating = useRef(false);
  const dropdownRef = useRef(null);
  const toggleButtonRef = useRef(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  // Converter state (shared between CurrencyWidget and fund widget)
  const [converterToCurrency, setConverterToCurrency] = useState('USD');
  const [converterRate, setConverterRate] = useState(1);

  // Fund form state
  const [destination, setDestination] = useState('');
  const [funderName, setFunderName] = useState(user?.name || '');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [activeFunders, setActiveFunders] = useState(12400);
  const [prevActiveFunders, setPrevActiveFunders] = useState(12400);
  const [destinationMenuOpen, setDestinationMenuOpen] = useState(false);
  
  // Destination suggestions based on user's continent only
  const userContinent = user?.continent || '';
  const continentExamples = useMemo(() => CONTINENT_DESTINATIONS[userContinent] || [], [userContinent]);
  const destinationSuggestions = useMemo(() => {
    const typed = destination.trim().toLowerCase();
    const out = [];
    for (const d of continentExamples) {
      if (!d) continue;
      if (typed && !d.toLowerCase().includes(typed)) continue;
      out.push(d);
      if (out.length >= 10) break;
    }
    return out;
  }, [continentExamples, destination]);

  const destinationPlaceholder = useMemo(() => {
    const ex = continentExamples[0];
    return ex ? `e.g., ${ex}` : 'e.g., France, United States';
  }, [continentExamples]);

  // Fund total widget state
  const [totalFundRaised, setTotalFundRaised] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [fundMenuOpen, setFundMenuOpen] = useState(false);
  const fundWidgetRef = useRef(null);
  const [fundsList, setFundsList] = useState([]);
  const [convertedTotalRaised, setConvertedTotalRaised] = useState(0);
  const ratesCacheRef = useRef(new Map());

  useEffect(() => {
    const barTimer = setTimeout(() => setBarDone(true), 750);
    const contentTimer = setTimeout(() => setContentVisible(true), 1050);
    return () => {
      clearTimeout(barTimer);
      clearTimeout(contentTimer);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Ignore clicks on the toggle button itself
      if (toggleButtonRef.current && toggleButtonRef.current.contains(event.target)) {
        return;
      }
      
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && dropdownOpen && !isAnimating.current) {
        isAnimating.current = true;
        setDropdownClosing(true);
        setTimeout(() => {
          setDropdownOpen(false);
          setDropdownClosing(false);
          isAnimating.current = false;
        }, 280);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [dropdownOpen]);

  // Fetch user's funds and calculate totals
  useEffect(() => {
    const fetchFunds = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await getMyFunds();
        const funds = response.data.funds || response.data || [];
        
        // Calculate total fund raised
        const total = funds.reduce((sum, fund) => sum + (fund.amount || 0), 0);
        setTotalFundRaised(total);
        setFundsList(funds);
        
        // Get last 3 transactions in reverse chronological order
        const recent = [...funds].reverse().slice(0, 3);
        setRecentTransactions(recent);
        
      } catch (error) {
        // Quietly handle missing/expired token or offline API
        if (error?.response?.status !== 401) {
          console.warn('Failed to fetch previous destinations:', error?.message || error);
        }
        setDestinationMenuOpen(false);
        setTotalFundRaised(0);
        setRecentTransactions([]);
      }
    };

    if (user) {
      fetchFunds();
    }
  }, [user]);

  // Helper: fetch rate from base->target with fallbacks and cache
  const fetchPairRate = async (base, target) => {
    const key = `${base}->${target}`;
    if (ratesCacheRef.current.has(key)) return ratesCacheRef.current.get(key);

    if (base === target) {
      ratesCacheRef.current.set(key, 1);
      return 1;
    }

    let r = null;
    try {
      // Try exchangerate-api.com
      try {
        const res1 = await fetch(`https://api.exchangerate-api.com/v4/latest/${base}`);
        if (res1.ok) {
          const data1 = await res1.json();
          r = data1?.rates?.[target] ?? null;
        }
      } catch {}

      // Frankfurter fallback
      if (!r) {
        try {
          const res2 = await fetch(`https://api.frankfurter.app/latest?from=${base}&to=${target}`);
          if (res2.ok) {
            const data2 = await res2.json();
            r = data2?.rates?.[target] ?? null;
          }
        } catch {}
      }

      // exchangerate.host fallback
      if (!r) {
        const res3 = await fetch(`https://api.exchangerate.host/latest?base=${base}&symbols=${target}`);
        if (res3.ok) {
          const data3 = await res3.json();
          r = data3?.rates?.[target] ?? null;
        }
      }
    } catch {}

    if (!r) r = 1; // Graceful fallback to 1 to avoid NaN
    ratesCacheRef.current.set(key, r);
    return r;
  };

  // Compute precise converted total using per-currency rates
  useEffect(() => {
    const compute = async () => {
      try {
        const target = converterToCurrency;
        if (!fundsList || fundsList.length === 0 || !target) {
          setConvertedTotalRaised(0);
          return;
        }

        // Unique base currencies in funds
        const bases = Array.from(new Set(fundsList.map(f => f.currency || 'USD')));
        // Fetch rates in parallel
        const entries = await Promise.all(
          bases.map(async (base) => [base, await fetchPairRate(base, target)])
        );
        const ratesMap = new Map(entries);

        const sum = fundsList.reduce((acc, f) => {
          const base = f.currency || 'USD';
          const rate = ratesMap.get(base) ?? 1;
          return acc + (Number(f.amount) || 0) * rate;
        }, 0);
        setConvertedTotalRaised(sum);
      } catch (e) {
        // Fallback: approximate using converterRate
        setConvertedTotalRaised(totalFundRaised * converterRate);
      }
    };
    compute();
  }, [fundsList, converterToCurrency, converterRate, totalFundRaised]);

  // Helper to format converted transaction amount
  const getConvertedTxAmount = (tx) => {
    const base = tx.currency || 'USD';
    const key = `${base}->${converterToCurrency}`;
    const rate = ratesCacheRef.current.get(key) ?? 1;
    const amt = (Number(tx.amount) || 0) * rate;
    return `${CURRENCY_ICONS[converterToCurrency]} ${amt.toFixed(2)} ${converterToCurrency}`;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const increment = Math.floor(Math.random() * 5) + 1; // Random 1-5
      setActiveFunders((prev) => {
        setPrevActiveFunders(prev);
        return prev + increment;
      });
    }, 3000); // Every 3 seconds

    return () => clearInterval(interval);
  }, []);

  // Close destination menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (destinationMenuOpen && !e.target.closest('.destination-input-container')) {
        setDestinationMenuOpen(false);
      }
    };

    if (destinationMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [destinationMenuOpen]);

  const renderAnimatedNumber = (current, previous) => {
    const currentStr = current.toLocaleString();
    const previousStr = previous.toLocaleString();
    const currentDigits = currentStr.split('');
    const previousDigits = previousStr.split('');

    // Pad arrays to same length
    while (currentDigits.length < previousDigits.length) currentDigits.unshift('');
    while (previousDigits.length < currentDigits.length) previousDigits.unshift('');

    return currentDigits.map((digit, index) => {
      const changed = digit !== previousDigits[index];
      const prevDigit = previousDigits[index];
      
      return (
        <span key={`${index}-${current}`} className="digit-wrapper">
          {changed && prevDigit && (
            <span className="digit digit-slide-out">{prevDigit}</span>
          )}
          <span className={changed ? 'digit digit-slide-in' : 'digit'}>
            {digit}
          </span>
        </span>
      );
    });
  };

  const handleNav = (path) => {
    setDropdownClosing(true);
    setTimeout(() => {
      setDropdownOpen(false);
      setDropdownClosing(false);
    }, 280);
    navigate(path);
  };

  const generateVerificationWord = () => {
    const words = ['CONFIRM', 'DELETE', 'REMOVE', 'ERASE', 'VERIFY', 'PROCEED', 'DESTROY', 'CANCEL'];
    return words[Math.floor(Math.random() * words.length)];
  };

  const handleLogout = () => {
    setDropdownClosing(true);
    setTimeout(() => {
      setDropdownOpen(false);
      setDropdownClosing(false);
    }, 280);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleDeleteAccountClick = () => {
    setDropdownClosing(true);
    setTimeout(() => {
      setDropdownOpen(false);
      setDropdownClosing(false);
    }, 280);
    setVerificationWord(generateVerificationWord());
    setVerificationInput('');
    setDeleteError('');
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (verificationInput.toUpperCase() !== verificationWord) {
      setDeleteError('Verification word does not match');
      return;
    }
    
    try {
      // Call the delete account API
      await deleteAccount();
      
      // Clear local storage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setDeleteModalOpen(false);
      navigate('/login');
    } catch (error) {
      setDeleteError(error.response?.data?.message || 'Failed to delete account');
      console.error('Delete account error:', error);
    }
  };

  const toggleDropdown = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (isAnimating.current || dropdownClosing) return;
    
    if (dropdownOpen) {
      isAnimating.current = true;
      setDropdownClosing(true);
      setTimeout(() => {
        setDropdownOpen(false);
        setDropdownClosing(false);
        isAnimating.current = false;
      }, 280);
    } else if (!dropdownClosing) {
      setDropdownOpen(true);
    }
  };

  const handleUploadConvertedAmount = (convertedAmount, convertedCurrency) => {
    setAmount(convertedAmount.toString());
    setCurrency(convertedCurrency);
  };

  const handleSubmitFund = async (e) => {
    e.preventDefault();
    setSubmitMessage('');
    
    if (!destination.trim() || !funderName.trim() || !amount || parseFloat(amount) <= 0) {
      setSubmitMessage('Please fill all fields with valid values');
      return;
    }

    try {
      setSubmitting(true);
      const response = await submitFund(destination, funderName, parseFloat(amount), currency);
      setSubmitMessage('Fund submitted successfully! ✓');
      
      // Clear form
      setDestination('');
      setAmount('');
      setDestinationMenuOpen(false);
      setTimeout(() => setSubmitMessage(''), 3000);
    } catch (error) {
      setSubmitMessage(error.response?.data?.message || 'Failed to submit fund');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="home-container">
      <header className={`header`}>
        <div className="header-bar" />
        <div className={`header-content ${barDone ? 'bar-done' : ''} ${contentVisible ? 'content-in' : ''}`}>
          <h1>FundMe</h1>
          <div className="menu-rail rail-open header-actions">
            {user ? (
              <div className="rail-row">
                <div className="fund-widget-container" ref={fundWidgetRef} onMouseEnter={() => setFundMenuOpen(true)} onMouseLeave={() => setFundMenuOpen(false)}>
                  <div className="fund-widget">
                    <span className="fund-label">Total raised</span>
                    <span className="fund-amount">{CURRENCY_ICONS[converterToCurrency]} {convertedTotalRaised.toFixed(2)} {converterToCurrency}</span>
                  </div>
                  {fundMenuOpen && recentTransactions.length > 0 && (
                    <div className="fund-transactions-menu">
                      <div className="transactions-title">Last 3 transactions</div>
                      {recentTransactions.map((transaction, index) => (
                        <div key={index} className="transaction-item">
                          <span className="transaction-destination">{transaction.destination}</span>
                          <span className="transaction-amount">{getConvertedTxAmount(transaction)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="user-info">
                  <div className="user-avatar">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-details">
                    <span className="user-greeting">Welcome back,</span>
                    <span className="user-name">{user.name}</span>
                  </div>
                </div>
                <div className="menu-dropdown-container" ref={dropdownRef}>
                  <button className="menu-btn" ref={toggleButtonRef} onClick={toggleDropdown}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1"/>
                      <circle cx="12" cy="5" r="1"/>
                      <circle cx="12" cy="19" r="1"/>
                    </svg>
                  </button>
                  {(dropdownOpen || dropdownClosing) && (
                    <div className={`dropdown-menu ${dropdownClosing ? 'closing' : ''}`}>
                      <button className="dropdown-item" onClick={() => handleNav('/funding-stats')}>
                        Funding statistics
                      </button>
                      <button className="dropdown-item" onClick={() => handleNav('/activity-log')}>
                        Activity log
                      </button>
                      <button className="dropdown-item" onClick={handleLogout}>
                        Logout
                      </button>
                      <button className="dropdown-item danger" onClick={handleDeleteAccountClick}>
                        Delete account
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rail-row">
                <button className="rail-btn" onClick={() => handleNav('/login')}>Login</button>
                <button className="rail-btn" onClick={() => handleNav('/register')}>Register</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="main-content">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">FundME</p>
            <h2>Fund yourself, Travel anywhere.</h2>
            <p className="subtext">
              Fund yourself easier for your travels. No borders, no hassle, just seamless funding to your destination of choice.
            </p>
          </div>
          <div className="hero-panel">
            <div className="stat">
              <span className="stat-label">Active funders</span>
              <span className="stat-value stat-value-container">
                {renderAnimatedNumber(activeFunders, prevActiveFunders)}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Countries reached</span>
              <span className="stat-value">87</span>
            </div>
            <div className="stat muted-pill">Secure • Instant • Borderless</div>
          </div>
        </section>

        <div className="content-wrapper">
          <section className="travel-resources">
            <div className="resource-card">
              <div className="resource-content">
                <div className="resource-icon">✈️</div>
                <h4 className="resource-title">Travel Agencies</h4>
                <p className="resource-desc">Find trusted agencies for your journey</p>
              </div>
              <div className="resource-links">
                <a href="https://www.viator.com" target="_blank" rel="noopener noreferrer" className="resource-link">Viator</a>
                <a href="https://www.expedia.com" target="_blank" rel="noopener noreferrer" className="resource-link">Expedia</a>
                <a href="https://www.travelzoo.com" target="_blank" rel="noopener noreferrer" className="resource-link">Travelzoo</a>
              </div>
            </div>

            <div className="resource-card">
              <div className="resource-content">
                <div className="resource-icon">🗺️</div>
                <h4 className="resource-title">Tour Guides</h4>
                <p className="resource-desc">Connect with local experts</p>
              </div>
              <div className="resource-links">
                <a href="https://www.withlocals.com" target="_blank" rel="noopener noreferrer" className="resource-link">WithLocals</a>
                <a href="https://www.withlocals.com" target="_blank" rel="noopener noreferrer" className="resource-link">Airbnb Experiences</a>
                <a href="https://www.toursbylocals.com" target="_blank" rel="noopener noreferrer" className="resource-link">Tours by Locals</a>
              </div>
            </div>

            <div className="social-container">
              <h4 className="social-title">Connect with FundMe</h4>
              <div className="social-links">
                <a href="https://twitter.com\FundMe" target="_blank" rel="noopener noreferrer" className="social-link">
                  <span className="social-icon">𝕏</span>
                  <span>Twitter</span>
                </a>
                <a href="https://linkedin.com\FundMe" target="_blank" rel="noopener noreferrer" className="social-link">
                  <span className="social-icon">in</span>
                  <span>LinkedIn</span>
                </a>
                <a href="https://instagram.com\FundMe" target="_blank" rel="noopener noreferrer" className="social-link">
                  <span className="social-icon">📷</span>
                  <span>Instagram</span>
                </a>
                <a href="mailto:team@fundme.com" className="social-link">
                  <span className="social-icon">✉</span>
                  <span>Email</span>
                </a>
              </div>
            </div>
          </section>

          <section className="fund-section">
            <h3 className="section-title">Submit a Fund</h3>
            <form className="fund-form" onSubmit={handleSubmitFund}>
            <div className="form-group">
              <label className="form-label">Destination (Country's name)</label>
              <div className="destination-input-container">
                <input
                  type="text"
                  className="form-input"
                  placeholder={destinationPlaceholder}
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  onFocus={() => setDestinationMenuOpen(true)}
                  disabled={submitting}
                />
                {destinationMenuOpen && destinationSuggestions.length > 0 && (
                  <div className="destination-dropdown">
                    {destinationSuggestions.map((dest) => (
                      <button
                        key={dest}
                        type="button"
                        className="destination-option"
                        onClick={() => {
                          setDestination(dest);
                          setDestinationMenuOpen(false);
                        }}
                      >
                        {dest}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Current Funder</label>
              <input
                type="text"
                className="form-input"
                placeholder="Your name"
                value={funderName}
                onChange={(e) => setFunderName(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Fund Amount</label>
              <div className="amount-row">
                <input
                  type="number"
                  className="form-input amount-input"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  disabled={submitting}
                />
                <div className="currency-selector">
                  <button
                    type="button"
                    className="currency-btn"
                    onClick={() => setCurrencyMenuOpen(!currencyMenuOpen)}
                    disabled={submitting}
                  >
                    {currency} ▾
                  </button>
                  {currencyMenuOpen && (
                    <div className="currency-dropdown">
                      {CURRENCIES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`currency-option ${c === currency ? 'active' : ''}`}
                          onClick={() => {
                            setCurrency(c);
                            setCurrencyMenuOpen(false);
                          }}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Fund'}
            </button>

            {submitMessage && (
              <p className={`submit-message ${submitMessage.includes('✓') ? 'success' : 'error'}`}>
                {submitMessage}
              </p>
            )}
          </form>
        </section>
        </div>
      </main>
      <CurrencyWidget 
        onUploadConverted={handleUploadConvertedAmount} 
        userContinent={user?.continent}
        onCurrencyChange={(currency, rate) => {
          setConverterToCurrency(currency);
          setConverterRate(rate);
        }}
      />

      {deleteModalOpen && (
        <div className="modal-overlay" onClick={() => setDeleteModalOpen(false)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Account</h3>
            <p className="modal-warning">This action cannot be undone. All your data will be permanently deleted.</p>
            <div className="verification-section">
              <p className="verification-label">Type <strong>{verificationWord}</strong> to confirm:</p>
              <input
                type="text"
                className="verification-input"
                value={verificationInput}
                onChange={(e) => setVerificationInput(e.target.value)}
                placeholder="Type the word above"
                autoFocus
              />
              {deleteError && <p className="del
              ete-error">{deleteError}</p>}
            </div>
            <div className="modal-actions">
              <button
                className="confirm-delete-btn"
                onClick={handleDeleteConfirm}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
