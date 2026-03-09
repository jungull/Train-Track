import Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const db = new Database('./fitness.db');

async function migrate() {
    console.log('Starting migration...');

    // 1. Migrate Settings (upsert id=1)
    console.log('Migrating settings...');
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    if (settings) {
        const { error } = await supabase.from('settings').upsert(settings);
        if (error) console.error('Error migrating settings:', error);
    }

    // 2. Migrate Program Days
    console.log('Migrating program days...');
    const days = db.prepare('SELECT * FROM program_days').all();
    if (days.length > 0) {
        const { error } = await supabase.from('program_days').upsert(days);
        if (error) console.error('Error migrating program days:', error);
    }

    // 3. Migrate Sessions
    console.log('Migrating sessions...');
    const sessions = db.prepare('SELECT * FROM sessions').all();
    if (sessions.length > 0) {
        const { error } = await supabase.from('sessions').upsert(sessions);
        if (error) console.error('Error migrating sessions:', error);
    }

    // 4. Migrate Set Entries
    console.log('Migrating set entries...');
    const setEntries = db.prepare('SELECT * FROM set_entries').all();
    if (setEntries.length > 0) {
        const { error } = await supabase.from('set_entries').upsert(setEntries);
        if (error) console.error('Error migrating set entries:', error);
    }

    // 5. Migrate Run Entries
    console.log('Migrating run entries...');
    const runEntries = db.prepare('SELECT * FROM run_entries').all();
    if (runEntries.length > 0) {
        const { error } = await supabase.from('run_entries').upsert(runEntries);
        if (error) console.error('Error migrating run entries:', error);
    }

    // 6. Migrate EMOM Entries
    console.log('Migrating EMOM entries...');
    const emomEntries = db.prepare('SELECT * FROM emom_entries').all();
    if (emomEntries.length > 0) {
        const { error } = await supabase.from('emom_entries').upsert(emomEntries);
        if (error) console.error('Error migrating EMOM entries:', error);
    }

    // 7. Migrate GTG Events
    console.log('Migrating GTG events...');
    const gtgEvents = db.prepare('SELECT * FROM gtg_events').all();
    if (gtgEvents.length > 0) {
        const { error } = await supabase.from('gtg_events').upsert(gtgEvents);
        if (error) console.error('Error migrating GTG events:', error);
    }

    console.log('Migration complete!');
}

migrate().catch(console.error);
