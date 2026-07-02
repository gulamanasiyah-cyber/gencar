const { Database } = require('better-sqlite3');
const db = new Database('./sqlite.db');

console.log("ROOMS:", db.prepare("SELECT id, nama, assigned_caller_id, assigned_caller_2_id, assigned_guard_id FROM mandiri_rooms").all());
console.log("STAFF:", db.prepare("SELECT id, nama, tipe FROM tim_gambuh").all());

db.close();
