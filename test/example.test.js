// Example api function to test
function add(a, b) {
    if (typeof a !== 'number' || typeof b !== 'number') {
      throw new Error('Invalid input');
    }
    return a + b;
  }
function subtract(a, b) {
  return a - b;
}

function divide(a, b) {
  if (b === 0) {
      throw new Error('Cannot divide by zero');
  }
  return a / b;
}

module.exports = { subtract, divide };

//   // Test case 1
// test('add', () => {
//   // Description is optional and can be used for documentation
//   console.log("This function adds two numbers and returns the result");
//   const result = add(1, 2);
//   expect(result).toBe(3);
// });
      

// // Test case 2
// test('subtract', () => {
//   // Description is optional and can be used for documentation
//   console.log("*\n * Subtract two numbers.\n *");
//   const result = subtract(5, 3);
//   expect(result).toBe(2);
// });
      

// // Test case 3
// test('divide', () => {
//   // Description is optional and can be used for documentation
//   console.log("Divides two numbers and handles division by zero");
//   const result = divide(4, 2);
//   expect(result).toBe(2);
// });
  // Example api test cases using Jest or Mocha
  describe('add function', () => {
    it('should return correct sum for positive numbers', () => {
      expect(add(1, 2)).toBe(3);
    });
  
    it('should return correct sum for negative numbers', () => {
      expect(add(-1, -2)).toBe(-3);
    });
  
    it('should return correct sum for zero', () => {
      expect(add(0, 0)).toBe(0);
    });
  
    it('should handle large numbers', () => {
      expect(add(1000000, 2000000)).toBe(3000000);
    });
  
    it('should throw an error for invalid input', () => {
      expect(() => add('a', 2)).toThrow('Invalid input');
      expect(() => add(1, {})).toThrow('Invalid input');
    });
  
    it('should handle null and undefined inputs', () => {
      expect(() => add(null, 2)).toThrow('Invalid input');
      expect(() => add(1, undefined)).toThrow('Invalid input');
    });
  });
  
  // api.test.js
// const request = require('supertest');
// const app = require('express'); // Import your Express app

// describe('API Endpoints', () => {
//     jest.setTimeout(30000);
//   it('should return a list of items', async () => {
//     const response = await request(app).get('/api/items'); // Replace with your API endpoint
//     expect(response.statusCode).toBe(200);
//     expect(response.body).toBeInstanceOf(Array);
//   });

// //   it('should create a new item', async () => {
// //     const response = await request(app)
// //       .post('/api/items') // Replace with your API endpoint
// //       .send({ name: 'New Item' }); // Replace with your request payload
// //     expect(response.statusCode).toBe(201);
// //     expect(response.body.name).toBe('New Item');
// //   });

//   it('should return 404 for an unknown endpoint', async () => {
//     const response = await request(app).get('/api/unknown'); // Replace with an unknown endpoint
//     expect(response.statusCode).toBe(404);
//   });
// });
