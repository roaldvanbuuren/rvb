import { route, HttpError, checkPassword, setSession } from './_lib.js';

export default route({ methods: ['POST'], auth: false }, async (req, res) => {
  // Slow down guessing. (Serverless instances do not share memory, so this is a speed bump,
  // not a lockout. Use a long random ADMIN_PASSWORD.)
  await new Promise((r) => setTimeout(r, 500 + Math.random() * 300));
  const password = req.body?.password;
  if (typeof password !== 'string' || !checkPassword(password)) {
    throw new HttpError(401, 'Wrong password.');
  }
  setSession(res);
  return { ok: true };
});
