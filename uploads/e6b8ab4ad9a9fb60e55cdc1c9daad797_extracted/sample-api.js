// sample-api.js
const express = require('express');
const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.json()); // Middleware to parse JSON bodies

// Sample data
let items = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' }
];

// GET endpoint to fetch all items
app.get('/api/items', (req, res) => {
    res.status(200).json(items);
});

// POST endpoint to add a new item
app.post('/api/items', (req, res) => {
    const { id, name } = req.body;
    if (!id || !name) {
        return res.status(400).json({ message: 'ID and name are required' });
    }
    const newItem = { id, name };
    items.push(newItem);
    res.status(201).json(newItem);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API is running on port ${PORT}`);
});

module.exports = app; // Export the app for testing
