const expressionEl = document.querySelector('#expression');
const resultEl = document.querySelector('#result');
const historyListEl = document.querySelector('#historyList');
const buttons = document.querySelectorAll('.btn');

const MAX_HISTORY_ITEMS = 10;
const history = [];

const state = {
    currentValue: '0',
    previousValue: null,
    operator: null,
    expression: '0',
    waitingForOperand: false,
    justEvaluated: false,
    error: false,
};

function formatValue(value) {
    if (!Number.isFinite(value)) {
        return 'Error';
    }

    const result = Number(value.toFixed(12)).toString();
    return result === '0' ? '0' : result;
}

function buildExpression() {
    if (state.error) {
        return 'Error';
    }

    if (state.operator && state.previousValue !== null) {
        if (state.waitingForOperand) {
            return `${formatValue(state.previousValue)} ${state.operator}`;
        }

        return `${formatValue(state.previousValue)} ${state.operator} ${formatValue(Number(state.currentValue))}`;
    }

    return state.currentValue;
}

function updateDisplay() {
    expressionEl.textContent = buildExpression();
    resultEl.textContent = state.error ? 'Error' : state.currentValue;
}

function renderHistory() {
    historyListEl.innerHTML = '';

    if (history.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'history-empty';
        emptyItem.textContent = 'No recent calculations';
        historyListEl.appendChild(emptyItem);
        return;
    }

    history.forEach((entry) => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'history-item';
        button.textContent = entry;
        button.setAttribute('aria-label', `Use calculation ${entry}`);

        button.addEventListener('click', () => {
            const match = entry.match(/^(.*) = (.*)$/);
            if (!match) {
                return;
            }

            state.currentValue = match[2];
            state.previousValue = null;
            state.operator = null;
            state.expression = match[1];
            state.waitingForOperand = false;
            state.justEvaluated = true;
            state.error = false;
            updateDisplay();
        });

        item.appendChild(button);
        historyListEl.appendChild(item);
    });
}

function addToHistory(expressionText, resultText) {
    const entry = `${expressionText} = ${resultText}`;
    history.unshift(entry);

    if (history.length > MAX_HISTORY_ITEMS) {
        history.pop();
    }

    renderHistory();
}

function clearCalculator() {
    state.currentValue = '0';
    state.previousValue = null;
    state.operator = null;
    state.expression = '0';
    state.waitingForOperand = false;
    state.justEvaluated = false;
    state.error = false;
    updateDisplay();
}

function deleteLast() {
    if (state.error) {
        clearCalculator();
        return;
    }

    if (state.justEvaluated || state.waitingForOperand) {
        clearCalculator();
        return;
    }

    if (state.currentValue.length <= 1) {
        state.currentValue = '0';
    } else {
        state.currentValue = state.currentValue.slice(0, -1);
    }

    if (state.operator && state.previousValue !== null) {
        state.expression = `${formatValue(state.previousValue)} ${state.operator} ${state.currentValue}`;
    } else {
        state.expression = state.currentValue;
    }

    updateDisplay();
}

function appendNumber(value) {
    if (state.error) {
        clearCalculator();
    }

    if (state.justEvaluated) {
        clearCalculator();
        state.justEvaluated = false;
    }

    if (state.waitingForOperand) {
        state.currentValue = value;
        state.waitingForOperand = false;
    } else if (state.currentValue === '0') {
        state.currentValue = value;
    } else {
        state.currentValue += value;
    }

    updateDisplay();
}

function appendDecimal() {
    if (state.error) {
        clearCalculator();
    }

    if (state.justEvaluated) {
        clearCalculator();
    }

    if (state.waitingForOperand) {
        state.currentValue = '0.';
        state.waitingForOperand = false;
    } else if (!state.currentValue.includes('.')) {
        state.currentValue += '.';
    }

    updateDisplay();
}

function calculateBinaryOperation(firstValue, secondValue, selectedOperator) {
    const left = Number(firstValue);
    const right = Number(secondValue);

    switch (selectedOperator) {
        case '+':
            return left + right;
        case '-':
            return left - right;
        case '*':
            return left * right;
        case '/':
            if (right === 0) {
                throw new Error('Division by zero');
            }
            return left / right;
        default:
            throw new Error('Invalid operator');
    }
}

function applyOperator(symbol) {
    if (state.error) {
        return;
    }

    if (state.waitingForOperand && state.previousValue !== null) {
        state.operator = symbol;
        state.expression = `${formatValue(state.previousValue)} ${state.operator}`;
        updateDisplay();
        return;
    }

    if (state.previousValue !== null && state.operator !== null && !state.waitingForOperand) {
        try {
            const result = calculateBinaryOperation(state.previousValue, state.currentValue, state.operator);
            state.currentValue = formatValue(result);
            state.previousValue = Number(state.currentValue);
        } catch (error) {
            state.error = true;
            state.currentValue = 'Error';
            state.expression = 'Error';
            updateDisplay();
            return;
        }
    } else {
        state.previousValue = Number(state.currentValue);
    }

    state.operator = symbol;
    state.waitingForOperand = true;
    state.justEvaluated = false;
    state.expression = `${formatValue(state.previousValue)} ${state.operator}`;
    updateDisplay();
}

function evaluateExpression() {
    if (state.error || state.operator === null || state.previousValue === null) {
        return;
    }

    try {
        const result = calculateBinaryOperation(state.previousValue, state.currentValue, state.operator);
        const left = formatValue(state.previousValue);
        const right = formatValue(Number(state.currentValue));
        const finalResult = formatValue(result);

        addToHistory(`${left} ${state.operator} ${right}`, finalResult);
        state.expression = `${left} ${state.operator} ${right}`;
        state.currentValue = finalResult;
        state.previousValue = null;
        state.operator = null;
        state.waitingForOperand = false;
        state.justEvaluated = true;
    } catch (error) {
        state.error = true;
        state.currentValue = 'Error';
        state.expression = 'Error';
    }

    updateDisplay();
}

function applyPercentage() {
    if (state.error) {
        return;
    }

    const current = Number(state.currentValue);

    if (!Number.isFinite(current)) {
        state.error = true;
        state.currentValue = 'Error';
        state.expression = 'Error';
        updateDisplay();
        return;
    }

    if (state.operator && state.previousValue !== null && !state.waitingForOperand) {
        const result = (Number(state.previousValue) * current) / 100;
        state.currentValue = formatValue(result);
        state.expression = `${formatValue(state.previousValue)} ${state.operator} ${formatValue(current)}%`;
    } else {
        const result = current / 100;
        state.currentValue = formatValue(result);
        state.expression = `${formatValue(current)}%`;
    }

    state.previousValue = null;
    state.operator = null;
    state.waitingForOperand = false;
    state.justEvaluated = false;
    updateDisplay();
}

function handleButtonClick(event) {
    const button = event.currentTarget;
    const action = button.dataset.action;
    const value = button.dataset.value;

    if (action === 'number') {
        appendNumber(value);
        return;
    }

    if (action === 'decimal') {
        appendDecimal();
        return;
    }

    if (action === 'operator') {
        applyOperator(value);
        return;
    }

    if (action === 'equals') {
        evaluateExpression();
        return;
    }

    if (action === 'delete') {
        deleteLast();
        return;
    }

    if (action === 'percent') {
        applyPercentage();
        return;
    }

    if (action === 'clear') {
        clearCalculator();
    }
}

buttons.forEach((button) => {
    button.addEventListener('click', handleButtonClick);
    button.addEventListener('pointerdown', () => button.classList.add('is-pressed'));
    button.addEventListener('pointerup', () => button.classList.remove('is-pressed'));
    button.addEventListener('pointerleave', () => button.classList.remove('is-pressed'));
    button.addEventListener('pointercancel', () => button.classList.remove('is-pressed'));
});

function handleKeyboard(event) {
    const { key } = event;

    if (/^[0-9]$/.test(key)) {
        appendNumber(key);
        return;
    }

    if (key === '.') {
        event.preventDefault();
        appendDecimal();
        return;
    }

    if (['+', '-', '*', '/'].includes(key)) {
        event.preventDefault();
        applyOperator(key);
        return;
    }

    if (key === '%') {
        event.preventDefault();
        applyPercentage();
        return;
    }

    if (key === 'Enter' || key === '=') {
        event.preventDefault();
        evaluateExpression();
        return;
    }

    if (key === 'Backspace') {
        event.preventDefault();
        deleteLast();
        return;
    }

    if (key === 'Escape') {
        event.preventDefault();
        clearCalculator();
    }
}

document.addEventListener('keydown', handleKeyboard);
renderHistory();
updateDisplay();