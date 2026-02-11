const sqlite3 = require('sqlite3');
const { promisify } = require('util');

const db = new sqlite3.Database(':memory:');

// Wrapper für Promisify, um async/await mit SQLite3 zu nutzen
const runAsync = promisify(db.run.bind(db));

sync function setupDB() {
  try {
    // Tabelle für Benutzer erstellen
    await runAsync(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
      )
    `);

    // Beispielbenutzer hinzufügen
    const adminPassword = await bcrypt.hash('admin123', 10);
	console.log(adminPassword);
    const userPassword = await bcrypt.hash('userpass', 10);
	console.log(userPassword);

    await runAsync(
      `INSERT INTO users (username, password, email) VALUES (?, ?, ?)`,
      ['admin', adminPassword, 'admin@example.com']
    );
    await runAsync(
      `INSERT INTO users (username, password, email) VALUES (?, ?, ?)`,
      ['user', userPassword, 'user@example.com']
    );

    // Tabelle für Gesundheitsdaten erstellen
    await runAsync(`
      CREATE TABLE health_data (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL,
        data TEXT NOT NULL,
        category TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Beispiel-Gesundheitsdaten hinzufügen
    await runAsync(
      `INSERT INTO health_data (user_id, data, category) VALUES (?, ?, ?)`,
      [1, 'Admin health report', 'Befunde']
    );
    await runAsync(
      `INSERT INTO health_data (user_id, data, category) VALUES (?, ?, ?)`,
      [2, 'User health report', 'Medikation']
    );

    // Tabelle für Zugriffscodes erstellen
    await runAsync(`
      CREATE TABLE access_links (
        id INTEGER PRIMARY KEY,
        health_data_id INTEGER NOT NULL,
        access_code TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        FOREIGN KEY (health_data_id) REFERENCES health_data (id) ON DELETE CASCADE
      )
    `);

    console.log('Datenbank erfolgreich eingerichtet');
  } catch (error) {
    console.error('Fehler beim Einrichten der Datenbank:', error);
  }
  console.log('SQLite-Datenbank initialisiert.');
}

setupDB();