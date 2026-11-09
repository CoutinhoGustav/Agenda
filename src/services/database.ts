import * as SQLite from 'expo-sqlite';
import { Task, TaskInput, Subtask } from '../types';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase() {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('agenda-inteligente.db');
    await dbInstance.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT 'Pessoal',
        priority TEXT NOT NULL DEFAULT 'media',
        dueAt TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        notificationId TEXT,
        notificationIds TEXT NOT NULL DEFAULT '[]',
        reminderOffsets TEXT NOT NULL DEFAULT '[10]',
        repeat TEXT NOT NULL DEFAULT 'nenhuma',
        repeatDays TEXT NOT NULL DEFAULT '[]',
        createdAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS subtasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        taskId INTEGER NOT NULL,
        title TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    `);
    const cols = await dbInstance.getAllAsync<{name:string}>('PRAGMA table_info(tasks)');
    const names = cols.map(c => c.name);
    if (!names.includes('notificationIds')) await dbInstance.execAsync("ALTER TABLE tasks ADD COLUMN notificationIds TEXT NOT NULL DEFAULT '[]'");
    if (!names.includes('reminderOffsets')) await dbInstance.execAsync("ALTER TABLE tasks ADD COLUMN reminderOffsets TEXT NOT NULL DEFAULT '[10]'");
    if (!names.includes('repeatDays')) await dbInstance.execAsync("ALTER TABLE tasks ADD COLUMN repeatDays TEXT NOT NULL DEFAULT '[]'");
    if (!names.includes('notificationId')) await dbInstance.execAsync('ALTER TABLE tasks ADD COLUMN notificationId TEXT');
    try {
      await dbInstance.execAsync("UPDATE tasks SET notificationIds = json_array(notificationId) WHERE notificationId IS NOT NULL AND notificationIds = '[]'");
    } catch {}
  }
  return dbInstance;
}

export async function getTasks(): Promise<Task[]> {
  return (await getDatabase()).getAllAsync<Task>('SELECT * FROM tasks ORDER BY completed ASC, dueAt ASC');
}

export async function createTask(input: TaskInput, ids: string[]) {
  const db = await getDatabase();
  const r = await db.runAsync(`INSERT INTO tasks(title,description,category,priority,dueAt,notificationIds,reminderOffsets,repeat,repeatDays,createdAt)
    VALUES(?,?,?,?,?,?,?,?,?,?)`, input.title.trim(), input.description.trim(), input.category, input.priority,
    input.dueAt, JSON.stringify(ids), JSON.stringify(input.reminders), input.repeat, JSON.stringify(input.repeatDays), new Date().toISOString());
  return r.lastInsertRowId;
}

export async function updateTask(id: number, input: TaskInput, ids: string[]) {
  await (await getDatabase()).runAsync(`UPDATE tasks SET title=?,description=?,category=?,priority=?,dueAt=?,notificationIds=?,reminderOffsets=?,repeat=?,repeatDays=? WHERE id=?`,
    input.title.trim(), input.description.trim(), input.category, input.priority, input.dueAt,
    JSON.stringify(ids), JSON.stringify(input.reminders), input.repeat, JSON.stringify(input.repeatDays), id);
}

export async function setTaskCompleted(id:number, done:boolean) {
  await (await getDatabase()).runAsync('UPDATE tasks SET completed=? WHERE id=?', done ? 1 : 0, id);
}

export async function deleteTask(id:number) {
  const db=await getDatabase();
  await db.runAsync('DELETE FROM subtasks WHERE taskId=?',id);
  await db.runAsync('DELETE FROM tasks WHERE id=?',id);
}

export async function getSubtasks(taskId:number):Promise<Subtask[]> {
  return (await getDatabase()).getAllAsync<Subtask>('SELECT * FROM subtasks WHERE taskId=? ORDER BY id',taskId);
}

export async function addSubtask(taskId:number,title:string) {
  await (await getDatabase()).runAsync('INSERT INTO subtasks(taskId,title) VALUES(?,?)',taskId,title.trim());
}

export async function toggleSubtask(id:number,done:boolean) {
  await (await getDatabase()).runAsync('UPDATE subtasks SET completed=? WHERE id=?',done?1:0,id);
}

export async function removeSubtask(id:number) {
  await (await getDatabase()).runAsync('DELETE FROM subtasks WHERE id=?',id);
}

export async function getDailyGoal() {
  const row=await (await getDatabase()).getFirstAsync<{value:string}>("SELECT value FROM app_settings WHERE key='daily_goal'");
  return row ? Number(row.value) : 5;
}

export async function setDailyGoal(n:number) {
  await (await getDatabase()).runAsync("INSERT OR REPLACE INTO app_settings(key,value) VALUES('daily_goal',?)",String(n));
}

export async function getSetting(key: string): Promise<string | null> {
  const row = await (await getDatabase()).getFirstAsync<{value:string}>("SELECT value FROM app_settings WHERE key=?", key);
  return row ? row.value : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await (await getDatabase()).runAsync("INSERT OR REPLACE INTO app_settings(key,value) VALUES(?,?)", key, value);
}
