/**
 * store.js
 *
 * A very small in-memory store that holds a generated WhatsApp SESSION_ID
 * for a short amount of time so the website can show it to the user.
 *
 * Lifecycle of an entry:
 *   1. createEntry(id)   -> status: "pending"   (waiting for the phone to link)
 *   2. setReady(id, txt) -> status: "ready"      (session generated, not yet shown)
 *   3. consume(id)       -> returns the session ONCE, then deletes it forever
 *
 * If a user never opens/copies it, the entry auto-expires after TTL_MS so
 * nothing is kept around longer than necessary.
 */

const sessions = new Map();
const TTL_MS = 10 * 60 * 1000; // 10 minutes

function createEntry(id) {
    const entry = {
        status: 'pending', // pending | ready | failed
        session: null,
        error: null,
        createdAt: Date.now(),
    };
    entry.timer = setTimeout(() => sessions.delete(id), TTL_MS);
    sessions.set(id, entry);
}

function setReady(id, sessionText) {
    const entry = sessions.get(id);
    if (!entry) return;
    entry.status = 'ready';
    entry.session = sessionText;
}

function setFailed(id, reason) {
    const entry = sessions.get(id);
    if (!entry) return;
    entry.status = 'failed';
    entry.error = reason || 'Something went wrong while generating your session.';
}

/** Cheap status check, never exposes the session content. */
function peekStatus(id) {
    const entry = sessions.get(id);
    if (!entry) return { status: 'not_found' };
    return { status: entry.status, error: entry.error || null };
}

/** Reads the session ONE time, then permanently removes it from memory. */
function consume(id) {
    const entry = sessions.get(id);
    if (!entry) return { status: 'not_found' };
    if (entry.status !== 'ready') return { status: entry.status, error: entry.error || null };
    clearTimeout(entry.timer);
    sessions.delete(id);
    return { status: 'ready', session: entry.session };
}

module.exports = { createEntry, setReady, setFailed, peekStatus, consume };

