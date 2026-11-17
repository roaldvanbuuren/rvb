import { route, clearSession } from './_lib.js';

export default route({ methods: ['POST'], auth: false }, async (req, res) => {
  clearSession(res);
  return { ok: true };
});
