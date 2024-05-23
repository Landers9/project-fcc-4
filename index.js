const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
require('dotenv').config()
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

mongoose.connect("mongodb+srv://test:test@cluster0.awgi7dd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", { useNewUrlParser: true, useUnifiedTopology: true });

// Schéma pour les utilisateurs
const userSchema = new Schema({
  username: { type: String, required: true, unique: true }
});

// Schéma pour les exercices
const exerciseSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});

// Schéma pour les logs d'exercice
const logSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  count: { type: Number, required: true },
  log: [
    {
      description: { type: String, required: true },
      duration: { type: Number, required: true },
      date: { type: String, required: true }
    }
  ]
});

// Route pour créer un nouvel utilisateur
app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    const newUser = new User({ username });
    await newUser.save();
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (err) {
    res.json({ error: 'Username already taken' });
  }
});

// Route pour obtenir tous les utilisateurs
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, 'username _id');
  res.json(users);
});

// Route pour ajouter un exercice à un utilisateur
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  const exerciseDate = date ? new Date(date) : new Date();

  try {
    const newExercise = new Exercise({
      userId: _id,
      description,
      duration,
      date: exerciseDate.toDateString()
    });
    await newExercise.save();

    const user = await User.findById(_id);
    if (!user) {
      return res.json({ error: 'User not found' });
    }

    // Update user's log
    let userLog = await Log.findOne({ userId: _id });
    if (!userLog) {
      userLog = new Log({
        userId: _id,
        count: 0,
        log: []
      });
    }
    userLog.count += 1;
    userLog.log.push({
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date
    });
    await userLog.save();

    res.json({
      username: user.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date.toDateString(),
      _id: user._id
    });
  } catch (err) {
    res.json({ error: 'Error saving exercise' });
  }
});

// Route pour obtenir les logs d'exercices d'un utilisateur
app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(_id);
    if (!user) return res.json({ error: 'User not found' });

    let userLog = await Log.findOne({ userId: _id });
    if (!userLog) return res.json({ error: 'No logs found for this user' });

    let logs = userLog.log;

    if (from) {
      const fromDate = new Date(from);
      logs = logs.filter(log => new Date(log.date) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      logs = logs.filter(log => new Date(log.date) <= toDate);
    }
    if (limit) {
      logs = logs.slice(0, parseInt(limit));
    }

    logs = logs.map(log => ({
      description: log.description,
      duration: log.duration,
      date: new Date(log.date).toDateString()
    }));

    res.json({
      username: user.username,
      count: logs.length,
      _id: user._id,
      log: logs
    });
  } catch (err) {
    res.json({ error: 'Error retrieving logs' });
  }
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);
const Log = mongoose.model('Log', logSchema);

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

module.exports = { User, Exercise, Log };
