// DOM Elements
const amountInput = document.getElementById('amount');
const fromCurrencySelect = document.getElementById('from-currency');
const toCurrencySelect = document.getElementById('to-currency');
const swapBtn = document.getElementById('swap-btn');
const convertBtn = document.getElementById('convert-btn');

// Status & Result Elements
const loadingState = document.getElementById('loading');
const errorState = document.getElementById('error');
const errorMessage = document.getElementById('error-message');
const resultContainer = document.getElementById('result');
const resultValue = document.getElementById('result-value');
const resultCurrency = document.getElementById('result-currency');
const rateText = document.getElementById('rate-text');
const updateTime = document.getElementById('update-time');
const inputSymbol = document.getElementById('input-symbol');

// We'll use the open.er-api which is free and requires no auth
const API_BASE = 'https://open.er-api.com/v6/latest';

// Major currency flags mapping (Fallback to basic mapping for emojis)
const flagMap = {
    'USD': '🇺🇸', 'EUR': '🇪🇺', 'GBP': '🇬🇧', 'JPY': '🇯🇵', 'AUD': '🇦🇺',
    'CAD': '🇨🇦', 'CHF': '🇨🇭', 'CNY': '🇨🇳', 'HKD': '🇭🇰', 'NZD': '🇳🇿',
    'SEK': '🇸🇪', 'KRW': '🇰🇷', 'SGD': '🇸🇬', 'NOK': '🇳🇴', 'MXN': '🇲🇽',
    'INR': '🇮🇳', 'RUB': '🇷🇺', 'ZAR': '🇿🇦', 'TRY': '🇹🇷', 'BRL': '🇧🇷',
    'AED': '🇦🇪', 'SAR': '🇸🇦', 'ILS': '🇮🇱', 'PHP': '🇵🇭'
};

/**
 * Initialize Application
 */
async function initApp() {
    try {
        showLoading();
        // Fetch to populate our lists (Base USD)
        const res = await fetch(`${API_BASE}/USD`);
        if (!res.ok) throw new Error('Failed to load currency list.');
        
        const data = await res.json();
        const currencies = Object.keys(data.rates).sort();
        
        populateSelect(fromCurrencySelect, currencies, 'USD');
        populateSelect(toCurrencySelect, currencies, 'EUR');
        
        updateSymbol();
        hideLoading();
        
        // Initial conversion
        convertCurrency();
        
    } catch (err) {
        showError("Initialization failed: " + err.message);
    }
}

/**
 * Populate <select> with currency options
 */
function populateSelect(selectElem, currencies, defaultCurrency) {
    currencies.forEach(currency => {
        const option = document.createElement('option');
        option.value = currency;
        option.textContent = `${getFlag(currency)} ${currency}`;
        selectElem.appendChild(option);
    });
    selectElem.value = defaultCurrency;
}

/**
 * Perform Currency Conversion
 */
async function convertCurrency() {
    const amount = parseFloat(amountInput.value);
    const from = fromCurrencySelect.value;
    const to = toCurrencySelect.value;

    // Validate Input
    if (isNaN(amount) || amount < 0) {
        showError("Please enter a valid positive amount.");
        resultContainer.classList.add('hidden');
        return;
    }

    try {
        hideError();
        showLoading();
        resultContainer.classList.add('hidden');

        // Fetch latest data for 'from' currency base
        const response = await fetch(`${API_BASE}/${from}`);
        if (!response.ok) throw new Error('API request failed');

        const data = await response.json();
        
        if (data.result === 'error') {
            throw new Error(data['error-type'] || 'API Error');
        }

        const rate = data.rates[to];
        if (rate === undefined) {
             throw new Error(`Exchange rate for ${to} not found.`);
        }

        // Calculate and Format
        const converted = amount * rate;
        
        // Format numbers intuitively
        const formattedAmount = formatCurrency(converted, to);
        
        // Update DOM
        resultValue.textContent = formattedAmount;
        resultCurrency.textContent = to;
        rateText.textContent = `1 ${from} = ${rate.toFixed(4)} ${to}`;
        
        // Use the API timestamp if available
        if (data.time_last_update_utc) {
            const dateObj = new Date(data.time_last_update_utc);
            updateTime.textContent = 'Last updated: ' + dateObj.toLocaleString();
        } else {
            updateTime.textContent = 'Last updated: Just now';
        }

        hideLoading();
        resultContainer.classList.remove('hidden');

    } catch (err) {
        showError("Failed to convert: " + err.message);
    }
}

/**
 * Helpers
 */

function formatCurrency(value, currencyCode) {
    // Uses native browser Intl API to format numbers cleanly based on locale and currency
    return new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

function getCurrencySymbol(currencyCode) {
    try {
        const parts = new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).formatToParts(0);
        const p = parts.find(p => p.type === 'currency');
        return p ? p.value : currencyCode;
    } catch(e) {
        return currencyCode;
    }
}

function updateSymbol() {
    const code = fromCurrencySelect.value;
    inputSymbol.textContent = getCurrencySymbol(code);
}

function getFlag(currencyCode) {
    return flagMap[currencyCode] || '🏳️';
}

function swapCurrencies() {
    const temp = fromCurrencySelect.value;
    fromCurrencySelect.value = toCurrencySelect.value;
    toCurrencySelect.value = temp;
    updateSymbol();
    // Trigger auto convert
    convertCurrency();
}

/**
 * UI State Controllers
 */
function showLoading() {
    loadingState.classList.remove('hidden');
    errorState.classList.add('hidden');
}

function hideLoading() {
    loadingState.classList.add('hidden');
}

function showError(msg) {
    hideLoading();
    resultContainer.classList.add('hidden');
    errorState.classList.remove('hidden');
    errorMessage.textContent = msg;
}

function hideError() {
    errorState.classList.add('hidden');
}

/**
 * Event Listeners Registration
 */
// Debounce for input typing to prevent spamming API on every keystroke
let debounceTimer;
amountInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    hideError(); // clear any previous "invalid amount" errors while typing
    debounceTimer = setTimeout(() => {
        if (amountInput.value !== '') {
            convertCurrency();
        } else {
             resultContainer.classList.add('hidden');
        }
    }, 500);
});

// Dropdown changes
fromCurrencySelect.addEventListener('change', () => {
    updateSymbol();
    convertCurrency();
});
toCurrencySelect.addEventListener('change', convertCurrency);

// Buttons
swapBtn.addEventListener('click', swapCurrencies);
convertBtn.addEventListener('click', convertCurrency);

// Run init
initApp();
