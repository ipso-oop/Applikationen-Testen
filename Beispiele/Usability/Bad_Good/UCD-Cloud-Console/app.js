const express = require('express');
const expressLayouts = require('express-ejs-layouts'); // ✅
const { MongoClient, ObjectId } = require('mongodb');
const app = express();

app.set('view engine', 'ejs');
app.use(expressLayouts); // ✅
app.set('layout', 'layout'); // Standardlayout definieren (views/layout.ejs)
app.use(express.urlencoded({ extended: false }));

const uri = 'mongodb+srv://romancamenzind:mongodb123@testcluster.w0fai.mongodb.net/?retryWrites=true&w=majority&appName=TestCluster';
const dbName = 'cloud_console';

async function getDb() {
  const client = await MongoClient.connect(uri);
  return client.db(dbName);
}

app.get('/', async (req, res) => {
  const db = await getDb();
  const vms = await db.collection('vms').find().toArray();
  res.render('index_optimized', { vms, success: null });
});

app.post('/action', async (req, res) => {
  const db = await getDb();
  const { id, op } = req.body;
  const operations = {
    start: { status: 'running' },
    stop: { status: 'stopped' },
    delete: null
  };

  if (op === 'delete') {
    await db.collection('vms').deleteOne({ _id: new ObjectId(id) });
    return res.redirect('/?success=VM gelöscht');
  }

  if (operations[op]) {
    await db.collection('vms').updateOne(
      { _id: new ObjectId(id) },
      { $set: operations[op] }
    );
    return res.redirect(`/?success=VM ${op}ed`);
  }

  res.redirect('/');
});

// Dummy initialisierung
app.get('/init', async (req, res) => {
  const db = await getDb();
  await db.collection('vms').deleteMany({});
  await db.collection('vms').insertMany([
    { name: 'WebServer-1', status: 'running' },
    { name: 'DB-Node-2', status: 'stopped' },
    { name: 'Backup-Node', status: 'stopped' },
	{ name: 'WebServer-2', status: 'running' },
    { name: 'DB-Node-3', status: 'stopped' },
    { name: 'Backup-Node-2', status: 'stopped' }
  ]);
  res.send('Init completed.');
});

app.listen(3000, () => console.log('Cloud Console running on http://localhost:3000'));
