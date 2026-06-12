import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_EXPIRY = '180d';

let clientPromise = null;
function getDb() {
  if (!clientPromise) {
    clientPromise = new MongoClient(process.env.MONGODB_URI).connect();
  }
  return clientPromise.then((c) => c.db());
}

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function authUser(req) {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

export default async (req) => {
  const path = new URL(req.url).pathname.replace(/^\/api/, '');
  const db = await getDb();
  const users = db.collection('users');

  if (req.method === 'POST' && (path === '/register' || path === '/login')) {
    let body;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: 'Invalid JSON' });
    }
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: 'Invalid email' });

    if (path === '/register') {
      if (password.length < 8) return json(400, { error: 'Password must be at least 8 characters' });
      const existing = await users.findOne({ email });
      if (existing) return json(409, { error: 'An account with this email already exists' });
      const { insertedId } = await users.insertOne({
        email,
        passwordHash: await bcrypt.hash(password, 10),
        progress: null,
        updatedAt: 0,
        createdAt: new Date(),
      });
      const token = jwt.sign({ uid: insertedId.toString(), email }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRY });
      return json(200, { token, email, progress: null, updatedAt: 0 });
    }

    // login
    const user = await users.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return json(401, { error: 'Wrong email or password' });
    }
    const token = jwt.sign({ uid: user._id.toString(), email }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRY });
    return json(200, { token, email, progress: user.progress, updatedAt: user.updatedAt || 0 });
  }

  if (path === '/progress') {
    const auth = authUser(req);
    if (!auth) return json(401, { error: 'Not logged in' });
    const _id = new ObjectId(auth.uid);

    if (req.method === 'GET') {
      const user = await users.findOne({ _id }, { projection: { progress: 1, updatedAt: 1 } });
      if (!user) return json(401, { error: 'Account not found' });
      return json(200, { progress: user.progress, updatedAt: user.updatedAt || 0 });
    }

    if (req.method === 'PUT') {
      let body;
      try {
        body = await req.json();
      } catch {
        return json(400, { error: 'Invalid JSON' });
      }
      if (!body.progress || typeof body.progress !== 'object') return json(400, { error: 'Missing progress' });
      const updatedAt = Number(body.updatedAt) || Date.now();
      // Refuse to clobber newer data (e.g. a stale tab pushing old state).
      const current = await users.findOne({ _id }, { projection: { updatedAt: 1 } });
      if (!current) return json(401, { error: 'Account not found' });
      if ((current.updatedAt || 0) > updatedAt) {
        return json(409, { error: 'Server has newer progress', updatedAt: current.updatedAt });
      }
      await users.updateOne({ _id }, { $set: { progress: body.progress, updatedAt } });
      return json(200, { ok: true, updatedAt });
    }
  }

  return json(404, { error: 'Not found' });
};

export const config = { path: '/api/*' };
