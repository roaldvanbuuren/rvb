import { route, isAuthed } from './_lib.js';

export default route({ methods: ['GET'], auth: false }, async (req) => ({ authed: isAuthed(req) }));
