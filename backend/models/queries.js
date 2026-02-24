// This file now re-exports from the Supabase-based queries
// Keeping this file as the entry point so all controllers that import '../models/queries' still work
module.exports = require('./queries.supabase');
