const express = require('express');
const store = require('./store');

const router = express.Router();

/** GET /session/:id  -> cheap poll, never returns the session content itself */
router.get('/:id', (req, res) => {
    const result = store.peekStatus(req.params.id);
    res.json(result);
});

/** GET /session/:id/fetch -> single-use read. After this call the session is gone forever. */
router.get('/:id/fetch', (req, res) => {
    const result = store.consume(req.params.id);
    res.json(result);
});

module.exports = router;
