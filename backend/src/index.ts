import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { getAllStudents, createStudent, getAllProgress, createSMSLog, getAllQuests, createProgress, addXP, getProgressForStudent, getStudent, getQuest, getSmsTemplate, getAllSMSLogs, createQuest, deleteQuestById } from './database';
import { sendSMS } from './sms';
import { RecommendationEngine } from './recommendationEngine';
import type { Quest, Question, Answer, QuestPlayMode, QuestionType } from '../types';

config();

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow *.marcosvictos.com
    if (origin.endsWith('.marcosvictos.com') || origin === 'https://marcosvictos.com') {
      return callback(null, true);
    }
    
    // Allow localhost for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/students', (req, res) => {
  const students = getAllStudents();
  res.json(students);
});

app.post('/api/students', (req, res) => {
  const { id, name, avatar, level, xp, parentPhone } = req.body;
  createStudent({ id, name, avatar, level, xp, parentPhone });
  res.json({ success: true });
});

app.get('/api/progress', (req, res) => {
    const progress = getAllProgress();
    res.json(progress);
});

app.get('/api/progress/:studentId', (req, res) => {
  const { studentId } = req.params;
  const progress = getProgressForStudent(studentId);
  res.json(progress);
});

app.post('/api/progress', async (req, res) => {
    const { studentId, questId, completed, score, attempts } = req.body;
    createProgress({ studentId, questId, completed, score, attempts, completedAt: new Date() });
    
    // Award XP for completing the quest
    if (completed) {
        const leveledUp = addXP(studentId, score);

        const student = getStudent(studentId);
        if (leveledUp && student && student.parentPhone) {
            const template = getSmsTemplate('achievement');
            if (template) {
                const message = template.template
                    .replace('{studentName}', student.name)
                    .replace('{level}', student.level.toString());
                await sendSMS(student.parentPhone, message);
                createSMSLog({id: Date.now().toString(), studentId, phoneNumber: student.parentPhone, message, type: 'achievement', status: 'sent'});
            }
        }

        const allProgress = getProgressForStudent(studentId);
        if (student && student.parentPhone && allProgress.filter(p => p.completed).length === 1) {
            const template = getSmsTemplate('welcome');
            if (template) {
                const message = template.template.replace('{studentName}', student.name);
                await sendSMS(student.parentPhone, message);
                createSMSLog({id: Date.now().toString(), studentId, phoneNumber: student.parentPhone, message, type: 'welcome', status: 'sent'});
            }
        }
    }

    res.json({ success: true });
});

app.get('/api/quests', (req, res) => {
  const quests = getAllQuests();
  res.json(quests);
});

app.get('/api/quests/:id', (req, res) => {
  const quest = getQuest(req.params.id);
  if (!quest) {
    return res.status(404).json({ error: 'Quest not found' });
  }
  res.json(quest);
});

const ALLOWED_PLAY_MODES: QuestPlayMode[] = ['multiple-choice', 'fraction-visual', 'market-arithmetic'];
const ALLOWED_QUESTION_TYPES: QuestionType[] = ['text', 'numeric', 'fraction', 'custom'];

const sanitizeAnswer = (answer: any, fallbackId: string, questionId: string): Answer => {
  const raw = answer?.isCorrect;
  let isCorrect = false;

  if (typeof raw === 'boolean') {
    isCorrect = raw;
  } else if (typeof raw === 'string') {
    isCorrect = ['true', '1', 'yes'].includes(raw.toLowerCase());
  } else if (typeof raw === 'number') {
    isCorrect = raw === 1;
  }

  return {
    id: String(answer?.id ?? fallbackId),
    questionId,
    label: String(answer?.label ?? ''),
    value: String(answer?.value ?? ''),
    isCorrect
  };
};

const sanitizeQuestion = (question: any, questId: string, index: number): Question => {
  const questionId = String(question?.id ?? `${questId}-q-${index + 1}`);
  const answersArray = Array.isArray(question?.answers) ? question.answers : [];
  const rawType = typeof question?.type === 'string' ? (question.type as string).toLowerCase() : undefined;
  const normalizedType = rawType && ALLOWED_QUESTION_TYPES.includes(rawType as QuestionType)
    ? (rawType as QuestionType)
    : 'text';

  return {
    id: questionId,
    questId,
    prompt: String(question?.prompt ?? ''),
    order: Number.isFinite(Number(question?.order)) ? Number(question.order) : index,
    type: normalizedType,
    payload: question?.payload && typeof question.payload === 'object' ? question.payload : undefined,
    answers: answersArray.map((answer: any, answerIndex: number) =>
      sanitizeAnswer(answer, `${questionId}-a-${answerIndex + 1}`, questionId)
    )
  };
};

const buildQuestPayload = (body: any): Omit<Quest, 'createdAt'> => {
  if (!body?.id) {
    throw new Error('Quest id is required');
  }

  const questId = String(body.id);
  const levels = Array.isArray(body?.levels)
    ? body.levels.map((level: any, index: number) => ({
        level: Number.isFinite(Number(level?.level)) ? Number(level.level) : index + 1,
        scoreToLevelUp: Number.isFinite(Number(level?.scoreToLevelUp)) ? Number(level.scoreToLevelUp) : 0
      }))
    : [];

  const questions = Array.isArray(body?.questions)
    ? body.questions.map((question: any, index: number) =>
        sanitizeQuestion(question, questId, index)
      )
    : undefined;

  return {
    id: questId,
    title: String(body?.title ?? ''),
    type: body?.type === 'reading' ? 'reading' : 'math',
    difficulty: [1, 2, 3].includes(Number(body?.difficulty)) ? (Number(body.difficulty) as 1 | 2 | 3) : 1,
    description: body?.description ? String(body.description) : undefined,
    maxScore: Number.isFinite(Number(body?.maxScore)) ? Number(body.maxScore) : 100,
    timeLimit: Number.isFinite(Number(body?.timeLimit)) ? Number(body.timeLimit) : 60,
    completionScore: Number.isFinite(Number(body?.completionScore)) ? Number(body.completionScore) : 80,
    levels,
    playMode: typeof body?.playMode === 'string' && ALLOWED_PLAY_MODES.includes(body.playMode as QuestPlayMode)
      ? (body.playMode as QuestPlayMode)
      : undefined,
    questions
  };
};

app.post('/api/quests', (req, res) => {
  try {
    const questPayload = buildQuestPayload(req.body);
    createQuest(questPayload);
    const quest = getQuest(questPayload.id);
    res.status(201).json(quest);
  } catch (error) {
    console.error('Failed to create quest', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create quest' });
  }
});

app.put('/api/quests/:id', (req, res) => {
  try {
    const questPayload = buildQuestPayload({ ...req.body, id: req.params.id });
    createQuest(questPayload);
    const quest = getQuest(questPayload.id);
    res.json(quest);
  } catch (error) {
    console.error('Failed to update quest', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update quest' });
  }
});

app.delete('/api/quests/:id', (req, res) => {
  try {
    deleteQuestById(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete quest', error);
    res.status(500).json({ error: 'Failed to delete quest' });
  }
});
app.get('/api/smslogs', (req, res) => {
    const logs = getAllSMSLogs();
    res.json(logs);
});

app.post('/api/sms/send', async (req, res) => {
  const { phoneNumber, message, studentId, type } = req.body;
  const success = await sendSMS(phoneNumber, message);
  if (success) {
    createSMSLog({ id: Date.now().toString(), studentId, phoneNumber, message, type, status: 'sent' });
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

app.post('/api/sms/progress', async (req, res) => {
    const { studentId, questId, score } = req.body;
    const student = getStudent(studentId);
    const quest = getQuest(questId);
    if (student && student.parentPhone && quest) {
        const template = getSmsTemplate('progress');
        if (template) {
            const message = template.template
                .replace('{studentName}', student.name)
                .replace('{questName}', quest.title)
                .replace('{score}', score.toString());
            await sendSMS(student.parentPhone, message);
            createSMSLog({id: Date.now().toString(), studentId, phoneNumber: student.parentPhone, message, type: 'progress', status: 'sent'});
        }
    }
    res.json({ success: true });
});

app.post('/api/sms/achievement', async (req, res) => {
    const { studentId, level } = req.body;
    const student = getStudent(studentId);
    if (student && student.parentPhone) {
        const template = getSmsTemplate('achievement');
        if (template) {
            const message = template.template
                .replace('{studentName}', student.name)
                .replace('{level}', level.toString());
            await sendSMS(student.parentPhone, message);
            createSMSLog({id: Date.now().toString(), studentId, phoneNumber: student.parentPhone, message, type: 'achievement', status: 'sent'});
        }
    }
    res.json({ success: true });
});

// AI Recommendation Endpoints
const recommendationEngine = new RecommendationEngine();

app.get('/api/recommendations/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const recommendations = await recommendationEngine.generateRecommendations(studentId);
    res.json(recommendations);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

app.post('/api/ai/config', (req, res) => {
  try {
    const config = req.body;
    recommendationEngine.updateConfig(config);
    res.json({ success: true, message: 'AI configuration updated' });
  } catch (error) {
    console.error('Error updating AI config:', error);
    res.status(400).json({ error: 'Invalid configuration' });
  }
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
