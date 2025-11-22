import Database from 'better-sqlite3';
import type { Student, Quest, Progress, SMSLog, Question, Answer, QuestPlayMode, QuestionType } from '../types';

interface StudentRow {
  id: string;
  name: string;
  avatar: string | null;
  level: number;
  xp: number;
  parent_phone: string | null;
  created_at: string;
  updated_at: string;
}

interface QuestRow {
  id: string;
  title: string;
  type: string;
  difficulty: number;
  description: string | null;
  max_score: number;
  time_limit: number;
  completion_score: number;
  levels: string | null;
  play_mode: string | null;
  created_at: string;
}

interface QuestionRow {
  id: string;
  quest_id: string;
  prompt: string;
  order: number;
  type: string | null;
  payload: string | null;
}

interface AnswerRow {
  id: string;
  question_id: string;
  label: string;
  value: string;
  is_correct: number;
}

interface ProgressRow {
  id: string;
  student_id: string;
  quest_id: string;
  completed: number;
  score: number;
  attempts: number;
  completed_at: string | null;
}

interface SMSLogRow {
  id: string;
  student_id: string;
  phone_number: string;
  message: string;
  type: string;
  sent_at: string;
  status: string;
}

interface SMSTemplateRow {
    id: string;
    type: string;
    template: string;
}

const db = new Database('./learnquest.db');

// Students
const insertStudent = db.prepare(`INSERT INTO students (id, name, avatar, level, xp, parent_phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
const getStudents = db.prepare(`SELECT * FROM students`);
const getStudentById = db.prepare(`SELECT * FROM students WHERE id = ?`);
const updateStudent = db.prepare(`UPDATE students SET name = ?, avatar = ?, level = ?, xp = ?, parent_phone = ?, updated_at = ? WHERE id = ?`);
const deleteStudent = db.prepare(`DELETE FROM students WHERE id = ?`);

// Quests
const insertQuest = db.prepare(`INSERT OR REPLACE INTO quests (id, title, type, difficulty, description, max_score, time_limit, completion_score, levels, play_mode, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const getQuests = db.prepare(`SELECT * FROM quests`);
const getQuestById = db.prepare(`SELECT * FROM quests WHERE id = ?`);
const deleteQuest = db.prepare(`DELETE FROM quests WHERE id = ?`);

// Questions
const insertQuestion = db.prepare(`INSERT OR REPLACE INTO questions (id, quest_id, prompt, "order", type, payload) VALUES (?, ?, ?, ?, ?, ?)`);
const getQuestionsByQuest = db.prepare(`SELECT * FROM questions WHERE quest_id = ? ORDER BY "order" ASC`);
const deleteQuestionsByQuest = db.prepare(`DELETE FROM questions WHERE quest_id = ?`);

// Answers
const insertAnswer = db.prepare(`INSERT OR REPLACE INTO answers (id, question_id, label, value, is_correct) VALUES (?, ?, ?, ?, ?)`);
const getAnswersByQuestion = db.prepare(`SELECT * FROM answers WHERE question_id = ?`);
const deleteAnswersByQuest = db.prepare(`DELETE FROM answers WHERE question_id IN (SELECT id FROM questions WHERE quest_id = ?)`);

// Progress
const insertProgress = db.prepare(`INSERT INTO progress (id, student_id, quest_id, completed, score, attempts, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
const getProgress = db.prepare(`SELECT * FROM progress`);
const getProgressByStudent = db.prepare(`SELECT * FROM progress WHERE student_id = ?`);
const updateProgress = db.prepare(`UPDATE progress SET completed = ?, score = ?, attempts = ?, completed_at = ? WHERE id = ?`);

// SMS Logs
const insertSMSLog = db.prepare(`INSERT INTO sms_logs (id, student_id, phone_number, message, type, sent_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)`);
const getSMSLogs = db.prepare(`SELECT * FROM sms_logs`);

// SMS Templates
const insertSMSTemplate = db.prepare(`INSERT OR IGNORE INTO sms_templates (id, type, template) VALUES (?, ?, ?)`);
const getSMSTemplateByType = db.prepare(`SELECT * FROM sms_templates WHERE type = ?`);

export function createStudent(student: Omit<Student, 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString();
  insertStudent.run(student.id, student.name, student.avatar, student.level, student.xp, student.parentPhone, now, now);
}

export function getAllStudents(): Student[] {
  return getStudents.all().map(row => {
    const r = row as StudentRow;
    return {
      id: r.id,
      name: r.name,
      avatar: r.avatar || undefined,
      level: r.level,
      xp: r.xp,
      parentPhone: r.parent_phone || undefined,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at)
    };
  });
}

export function getStudent(id: string): Student | undefined {
  const row = getStudentById.get(id) as StudentRow | undefined;
  if (!row) return undefined;
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar || undefined,
    level: row.level,
    xp: row.xp,
    parentPhone: row.parent_phone || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

export function updateStudentData(id: string, updates: Partial<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>) {
  const now = new Date().toISOString();
  console.log('Updating student:', id, 'with', updates);
  
  // Get current student data first
  const currentStudent = getStudent(id);
  if (!currentStudent) {
    throw new Error(`Student with id ${id} not found`);
  }
  
  // Merge updates with current data
  const mergedData = {
    name: updates.name ?? currentStudent.name,
    avatar: updates.avatar ?? currentStudent.avatar ?? '',
    level: updates.level ?? currentStudent.level,
    xp: updates.xp ?? currentStudent.xp,
    parentPhone: updates.parentPhone ?? currentStudent.parentPhone ?? ''
  };
  
  updateStudent.run(mergedData.name, mergedData.avatar, mergedData.level, mergedData.xp, mergedData.parentPhone, now, id);
}

export function deleteStudentById(id: string) {
  deleteStudent.run(id);
}

export function createQuest(quest: Omit<Quest, 'createdAt'>) {
  const existing = getQuest(quest.id);
  const createdTimestamp = existing ? existing.createdAt.toISOString() : new Date().toISOString();
  const levelsJson = JSON.stringify(quest.levels);
  const payload = quest.playMode ?? null;
  const transaction = db.transaction(() => {
    insertQuest.run(
      quest.id,
      quest.title,
      quest.type,
      quest.difficulty,
      quest.description,
      quest.maxScore,
      quest.timeLimit,
      quest.completionScore,
      levelsJson,
      payload,
      createdTimestamp
    );

    if (quest.questions) {
      deleteAnswersByQuest.run(quest.id);
      deleteQuestionsByQuest.run(quest.id);

      for (const q of quest.questions) {
        insertQuestion.run(
          q.id,
          quest.id,
          q.prompt,
          q.order ?? 0,
          q.type ?? 'text',
          q.payload ? JSON.stringify(q.payload) : null
        );

        for (const answer of q.answers) {
          insertAnswer.run(
            answer.id,
            q.id,
            answer.label,
            answer.value,
            answer.isCorrect ? 1 : 0
          );
        }
      }
    }
  });

  transaction();
}

export function getAllQuests(): Quest[] {
  return getQuests.all().map(row => {
    const r = row as QuestRow;
    const quest: Quest = {
      id: r.id,
      title: r.title,
      type: r.type as 'math' | 'reading',
      difficulty: r.difficulty as 1 | 2 | 3,
      description: r.description || undefined,
      maxScore: r.max_score,
      timeLimit: r.time_limit,
      completionScore: r.completion_score,
      levels: r.levels ? JSON.parse(r.levels) : [],
      playMode: (r.play_mode as QuestPlayMode | null) ?? undefined,
      createdAt: new Date(r.created_at)
    };

    const questions = getQuestionsByQuest.all(r.id) as QuestionRow[];
    if (questions.length) {
      quest.questions = questions.map(questionRow => {
        const answers = getAnswersByQuestion.all(questionRow.id) as AnswerRow[];
        return {
          id: questionRow.id,
          questId: questionRow.quest_id,
          prompt: questionRow.prompt,
          order: questionRow.order ?? 0,
          type: (questionRow.type as QuestionType | null) ?? 'text',
          payload: questionRow.payload ? JSON.parse(questionRow.payload) : undefined,
          answers: answers.map(a => ({
            id: a.id,
            questionId: a.question_id,
            label: a.label,
            value: a.value,
            isCorrect: !!a.is_correct
          }))
        };
      });
    }

    return quest;
  });
}

export function getQuest(id: string): Quest | undefined {
  const row = getQuestById.get(id) as QuestRow | undefined;
  if (!row) return undefined;
  const quest: Quest = {
    id: row.id,
    title: row.title,
    type: row.type as 'math' | 'reading',
    difficulty: row.difficulty as 1 | 2 | 3,
    description: row.description || undefined,
    maxScore: row.max_score,
    timeLimit: row.time_limit,
    completionScore: row.completion_score,
    levels: row.levels ? JSON.parse(row.levels) : [],
    playMode: (row.play_mode as QuestPlayMode | null) ?? undefined,
    createdAt: new Date(row.created_at)
  };

  const questions = getQuestionsByQuest.all(id) as QuestionRow[];
  if (questions.length) {
    quest.questions = questions.map(questionRow => {
      const answers = getAnswersByQuestion.all(questionRow.id) as AnswerRow[];
      return {
        id: questionRow.id,
        questId: questionRow.quest_id,
        prompt: questionRow.prompt,
        order: questionRow.order ?? 0,
        type: (questionRow.type as QuestionType | null) ?? 'text',
        payload: questionRow.payload ? JSON.parse(questionRow.payload) : undefined,
        answers: answers.map(a => ({
          id: a.id,
          questionId: a.question_id,
          label: a.label,
          value: a.value,
          isCorrect: !!a.is_correct
        }))
      };
    });
  }

  return quest;
}

export function deleteQuestById(id: string) {
  const transaction = db.transaction(() => {
    deleteAnswersByQuest.run(id);
    deleteQuestionsByQuest.run(id);
    deleteQuest.run(id);
  });

  transaction();
}

export function createProgress(progress: Omit<Progress, 'id'>) {
  const id = Date.now().toString();
  insertProgress.run(id, progress.studentId, progress.questId, progress.completed ? 1 : 0, progress.score, progress.attempts, progress.completedAt?.toISOString());
}

export function getAllProgress(): Progress[] {
  return getProgress.all().map(row => {
    const r = row as ProgressRow;
    return {
      id: r.id,
      studentId: r.student_id,
      questId: r.quest_id,
      completed: !!r.completed,
      score: r.score,
      attempts: r.attempts,
      completedAt: r.completed_at ? new Date(r.completed_at) : undefined
    };
  });
}

export function getProgressForStudent(studentId: string): Progress[] {
  return getProgressByStudent.all(studentId).map(row => {
    const r = row as ProgressRow;
    return {
      id: r.id,
      studentId: r.student_id,
      questId: r.quest_id,
      completed: !!r.completed,
      score: r.score,
      attempts: r.attempts,
      completedAt: r.completed_at ? new Date(r.completed_at) : undefined
    };
  });
}

export function updateProgressRecord(id: string, updates: Partial<Omit<Progress, 'id' | 'studentId' | 'questId'>>) {
  updateProgress.run(updates.completed ? 1 : 0, updates.score, updates.attempts, updates.completedAt?.toISOString(), id);
}

export function createSMSLog(log: Omit<SMSLog, 'sentAt'>) {
  const now = new Date().toISOString();
  insertSMSLog.run(log.id, log.studentId, log.phoneNumber, log.message, log.type, now, log.status);
}

export function getAllSMSLogs(): SMSLog[] {
  return getSMSLogs.all().map(row => {
    const r = row as SMSLogRow;
    return {
      id: r.id,
      studentId: r.student_id,
      phoneNumber: r.phone_number,
      message: r.message,
      type: r.type as 'welcome' | 'progress' | 'achievement' | 'weekly',
      sentAt: new Date(r.sent_at),
      status: r.status as 'pending' | 'sent' | 'failed'
    };
  });
}

export function createSmsTemplate(id: string, type: string, template: string) {
    insertSMSTemplate.run(id, type, template);
}

export function getSmsTemplate(type: string): { id: string, type: string, template: string} | undefined {
    const row = getSMSTemplateByType.get(type) as SMSTemplateRow | undefined;
    if (!row) return undefined;
    return row;
}

export function addXP(studentId: string, xpGained: number): boolean {
  const student = getStudent(studentId);
  if (!student) return false;
  console.log('Adding XP:', xpGained, 'to student:', student.name);

  const newXp = student.xp + xpGained;
  let newLevel = student.level;
  const xpForNextLevel = newLevel * 100; // Simple: 100 XP per level
  let leveledUp = false;

  if (newXp >= xpForNextLevel) {
    newLevel += 1;
    leveledUp = true;
  }

  updateStudentData(studentId, { xp: newXp, level: newLevel });
  return leveledUp;
}
