const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(express.json());
app.use(cors()); // Allow requests from browser
app.use(express.static(__dirname)); // serve static files (open http://localhost:3000/index.html)

// --- Tasks CRUD ---
app.get('/tasks', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, task_text AS text, completed FROM tasks ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('GET /tasks error', err);
    // If schema mismatch, helpfully return columns to aid debugging
    if (err && err.code === 'ER_BAD_FIELD_ERROR') {
      try {
        const [cols] = await pool.query('SHOW COLUMNS FROM tasks');
        return res.status(500).json({ error: 'DB schema mismatch (missing column)', columns: cols.map(c => c.Field) });
      } catch (err2) {
        console.error('Error fetching columns', err2);
      }
    }
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/tasks', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    const [result] = await pool.query('INSERT INTO tasks (task_text) VALUES (?)', [text]);
    const [rows] = await pool.query('SELECT id, task_text AS text, completed FROM tasks WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /tasks error', err);
    if (err && err.code === 'ER_BAD_FIELD_ERROR') {
      try {
        const [cols] = await pool.query('SHOW COLUMNS FROM tasks');
        return res.status(500).json({ error: 'DB schema mismatch (missing column)', columns: cols.map(c => c.Field) });
      } catch (err2) {
        console.error('Error fetching columns', err2);
      }
    }
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/tasks/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });

    const { text, completed } = req.body;
    await pool.query('UPDATE tasks SET task_text = ?, completed = ? WHERE id = ?', [text, completed ? 1 : 0, id]);
    const [rows] = await pool.query('SELECT id, task_text AS text, completed FROM tasks WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Task not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /tasks/:id error', err);
    if (err && err.code === 'ER_BAD_FIELD_ERROR') {
      try {
        const [cols] = await pool.query('SHOW COLUMNS FROM tasks');
        return res.status(500).json({ error: 'DB schema mismatch (missing column)', columns: cols.map(c => c.Field) });
      } catch (err2) {
        console.error('Error fetching columns', err2);
      }
    }
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/tasks/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });

    await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
    res.status(204).end();
  } catch (err) {
    console.error('DELETE /tasks/:id error', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(3000, () => console.log('API listening on :3000'));