const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// --- MONGODB CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected successfully!'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- DATABASE SCHEMAS ---
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'organizer', 'admin'], default: 'student' }
});
const User = mongoose.model('User', UserSchema);

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, enum: ['Technical', 'Cultural', 'Sports'], required: true },
  date: { type: String, required: true },
  spots: { type: Number, required: true },
  totalSpots: { type: Number, required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});
const Event = mongoose.model('Event', EventSchema);

// --- API ROUTES ---

// Login / Auto-Registration
app.post('/api/auth/login', async (req, res) => {
  const { email, password, role } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email, password, role });
    } else if (user.password !== password || user.role !== role) {
      return res.status(401).json({ error: 'Invalid credentials or role mismatch.' });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get All Events
app.get('/api/events', async (req, res) => {
  try {
    const events = await Event.find();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Event
app.post('/api/events', async (req, res) => {
  try {
    const { title, category, date, spots } = req.body;
    const newEvent = await Event.create({ title, category, date, spots, totalSpots: spots });
    res.json(newEvent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register for Event (Student)
app.post('/api/events/:id/register', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const alreadyRegistered = event.participants.map(p => p.toString()).includes(req.body.userId);
    if (!alreadyRegistered && event.spots > 0) {
      event.participants.push(req.body.userId);
      event.spots -= 1;
      await event.save();
    }
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Event (Admin)
app.delete('/api/events/:id', async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
