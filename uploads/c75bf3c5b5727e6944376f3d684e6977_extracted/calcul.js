// This function adds two numbers and returns the result
function add(a, b) {
    return a + b;
}

/**
 * Subtract two numbers.
 * 
 * This function takes two arguments and returns their difference.
 */
function subtract(a, b) {
    return a - b;
}

// Multiplies two numbers
const multiply = (a, b) => a * b;

// Divides two numbers and handles division by zero
function divide(a, b) {
    if (b === 0) {
        return 'Cannot divide by zero';
    }
    return a / b;
}
