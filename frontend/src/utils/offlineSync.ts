
import type { Student, Quest, Progress, SMSLog, Question, Answer, QuestPlayMode, QuestionType, RecommendationResponse } from '../types';
import { API_BASE_URL } from '../config';

const CACHE_KEY_STUDENT = 'learnquest-student';
const CACHE_KEY_STUDENTS = 'learnquest-students';
const CACHE_KEY_QUESTS = 'learnquest-quests';
const CACHE_KEY_PROGRESS = 'learnquest-progress';
const CACHE_KEY_SMS_LOGS = 'learnquest-sms-logs';
const CACHE_TIMESTAMP_PREFIX = 'learnquest-cache-timestamp-';

// Cache TTL in milliseconds (1 hour)
const CACHE_TTL = 60 * 60 * 1000;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const ALLOWED_PLAY_MODES: QuestPlayMode[] = ['multiple-choice', 'fraction-visual', 'market-arithmetic'];
const ALLOWED_QUESTION_TYPES: QuestionType[] = ['text', 'numeric', 'fraction', 'custom'];

const generateLocalId = (prefix: string) => {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return `${prefix}-${crypto.randomUUID()}`;
    }
  } catch {
    // ignore and fall back
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

const toBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', '1', 'yes'].includes(value.toLowerCase());
  if (typeof value === 'number') return value === 1;
  return false;
};

const normalizeAnswer = (answer: any, questionId: string): Answer => ({
  id: String(answer?.id ?? generateLocalId('ans')),
  questionId,
  label: String(answer?.label ?? ''),
  value: String(answer?.value ?? ''),
  isCorrect: toBoolean(answer?.isCorrect)
});

const normalizeQuestion = (question: any, questId: string, index: number): Question => {
  const questionId = String(question?.id ?? generateLocalId('question'));
  const rawType = typeof question?.type === 'string' ? question.type.toLowerCase() : undefined;
  const normalizedType = rawType && ALLOWED_QUESTION_TYPES.includes(rawType as QuestionType)
    ? (rawType as QuestionType)
    : 'text';
  const answersArray = Array.isArray(question?.answers) ? question.answers : [];

  return {
    id: questionId,
    questId,
    prompt: String(question?.prompt ?? ''),
    order: Number.isFinite(Number(question?.order)) ? Number(question.order) : index,
    type: normalizedType,
    payload: question?.payload && typeof question.payload === 'object' ? question.payload : undefined,
    answers: answersArray.map((answer: any) => normalizeAnswer(answer, questionId))
  };
};

const normalizeQuest = (quest: any): Quest => {
  const questId = String(quest?.id ?? generateLocalId('quest'));
  const playMode = typeof quest?.playMode === 'string' && ALLOWED_PLAY_MODES.includes(quest.playMode as QuestPlayMode)
    ? (quest.playMode as QuestPlayMode)
    : undefined;

  const levelsArray = Array.isArray(quest?.levels) ? quest.levels : [];
  const questionsArray = Array.isArray(quest?.questions) ? quest.questions : [];

  return {
    id: questId,
    title: String(quest?.title ?? ''),
    type: quest?.type === 'reading' ? 'reading' : 'math',
    difficulty: [1, 2, 3].includes(Number(quest?.difficulty)) ? (Number(quest.difficulty) as 1 | 2 | 3) : 1,
    description: quest?.description ? String(quest.description) : undefined,
    maxScore: Number.isFinite(Number(quest?.maxScore)) ? Number(quest.maxScore) : 100,
    timeLimit: Number.isFinite(Number(quest?.timeLimit)) ? Number(quest.timeLimit) : 60,
    completionScore: Number.isFinite(Number(quest?.completionScore)) ? Number(quest.completionScore) : 80,
    levels: levelsArray.map((level: any, index: number) => ({
      level: Number.isFinite(Number(level?.level)) ? Number(level.level) : index + 1,
      scoreToLevelUp: Number.isFinite(Number(level?.scoreToLevelUp)) ? Number(level.scoreToLevelUp) : 0
    })),
    playMode,
    questions: questionsArray.map((question: any, index: number) => normalizeQuestion(question, questId, index)),
    createdAt: quest?.createdAt ? new Date(quest.createdAt) : new Date()
  };
};

const serializeAnswer = (answer: Answer, questionId: string) => ({
  ...answer,
  questionId: answer.questionId || questionId
});

const serializeQuestion = (question: Question) => ({
  ...question,
  answers: question.answers.map(answer => serializeAnswer(answer, question.id))
});

const serializeQuest = (quest: Quest) => ({
  ...quest,
  createdAt: quest.createdAt instanceof Date ? quest.createdAt.toISOString() : quest.createdAt,
  questions: quest.questions ? quest.questions.map(serializeQuestion) : []
});

const buildQuestRequestPayload = (quest: Quest) => {
  const serialized = serializeQuest(quest);
  const { createdAt, ...rest } = serialized;
  return rest;
};

const upsertQuestInCache = (quest: Quest) => {
  const cached = getCachedQuests();
  const index = cached.findIndex(q => q.id === quest.id);
  if (index >= 0) {
    cached[index] = quest;
  } else {
    cached.push(quest);
  }
  cacheQuests(cached);
  return cached;
};

const removeQuestFromCache = (questId: string) => {
  const cached = getCachedQuests().filter(q => q.id !== questId);
  cacheQuests(cached);
  return cached;
};

const mergeQuestUpdates = (original: Quest, updates: Partial<Quest>): Quest => {
  const base = serializeQuest(original);
  const patch: any = { ...base, ...updates };

  if (updates.questions) {
    patch.questions = updates.questions.map(serializeQuestion);
  }
  if (updates.levels) {
    patch.levels = updates.levels;
  }

  const normalized = normalizeQuest(patch);
  normalized.createdAt = original.createdAt;
  return normalized;
};

const syncQuestCreate = async (data: any) => {
  if (!data) {
    throw new Error('Quest data missing for create');
  }
  const quest = normalizeQuest(data);
  const response = await fetch(`${API_BASE_URL}/quests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildQuestRequestPayload(quest)),
  });

  if (!response.ok) {
    throw new Error('Failed to sync quest creation');
  }

  const savedQuest = normalizeQuest(await response.json());
  upsertQuestInCache(savedQuest);
};

const syncQuestUpdate = async (questId: string, data: any) => {
  if (!questId) {
    throw new Error('Quest id missing for update');
  }
  const quest = normalizeQuest({ ...(data || {}), id: questId });
  const response = await fetch(`${API_BASE_URL}/quests/${questId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildQuestRequestPayload(quest)),
  });

  if (!response.ok) {
    throw new Error('Failed to sync quest update');
  }

  const savedQuest = normalizeQuest(await response.json());
  upsertQuestInCache(savedQuest);
};

const syncQuestDelete = async (questId: string) => {
  if (!questId) {
    throw new Error('Quest id missing for delete');
  }

  const response = await fetch(`${API_BASE_URL}/quests/${questId}`, {
    method: 'DELETE',
  });

  if (!response.ok && response.status !== 404) {
    throw new Error('Failed to sync quest deletion');
  }

  removeQuestFromCache(questId);
};

// --- Cache Timestamp Management ---
const setCacheTimestamp = (cacheKey: string) => {
  localStorage.setItem(CACHE_TIMESTAMP_PREFIX + cacheKey, Date.now().toString());
};

const isCacheStale = (cacheKey: string): boolean => {
  const timestamp = localStorage.getItem(CACHE_TIMESTAMP_PREFIX + cacheKey);
  if (!timestamp) return true; // No timestamp means cache is stale
  
  const age = Date.now() - parseInt(timestamp);
  return age > CACHE_TTL;
};

// --- Student Cache ---
export const cacheStudent = (student: Student) => {
  localStorage.setItem(CACHE_KEY_STUDENT, JSON.stringify(student));
  setCacheTimestamp(CACHE_KEY_STUDENT);
};

export const getCachedStudent = (): Student | null => {
  const cached = localStorage.getItem(CACHE_KEY_STUDENT);
  return cached ? JSON.parse(cached) : null;
};

export const cacheStudents = (students: Student[]) => {
    localStorage.setItem(CACHE_KEY_STUDENTS, JSON.stringify(students));
    setCacheTimestamp(CACHE_KEY_STUDENTS);
};

export const getCachedStudents = (): Student[] => {
    const cached = localStorage.getItem(CACHE_KEY_STUDENTS);
    return cached ? JSON.parse(cached) : [];
};

// --- Quests Cache ---
export const cacheQuests = (quests: Quest[]) => {
  localStorage.setItem(CACHE_KEY_QUESTS, JSON.stringify(quests.map(serializeQuest)));
  setCacheTimestamp(CACHE_KEY_QUESTS);
};

export const getCachedQuests = (): Quest[] => {
  const cached = localStorage.getItem(CACHE_KEY_QUESTS);
  if (!cached) return [];

  try {
    const parsed = JSON.parse(cached);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeQuest);
  } catch {
    return [];
  }
};

// --- Progress Cache ---
export const cacheProgress = (progress: Progress[]) => {
  localStorage.setItem(CACHE_KEY_PROGRESS, JSON.stringify(progress));
  setCacheTimestamp(CACHE_KEY_PROGRESS);
};

export const getCachedProgress = (): Progress[] => {
  const cached = localStorage.getItem(CACHE_KEY_PROGRESS);
  return cached ? JSON.parse(cached) : [];
};

// --- SMS Logs Cache ---
export const cacheSmsLogs = (smsLogs: SMSLog[]) => {
    localStorage.setItem(CACHE_KEY_SMS_LOGS, JSON.stringify(smsLogs));
    setCacheTimestamp(CACHE_KEY_SMS_LOGS);
};

export const getCachedSmsLogs = (): SMSLog[] => {
    const cached = localStorage.getItem(CACHE_KEY_SMS_LOGS);
    return cached ? JSON.parse(cached) : [];
};

// --- Retry Function ---
const retryWithBackoff = async <T>(operation: () => Promise<T>, maxRetries: number = MAX_RETRIES): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error; // Final attempt failed
      }
      console.log(`Attempt ${attempt} failed, retrying in ${RETRY_DELAY * attempt}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
    }
  }
  throw new Error('Max retries exceeded');
};

// --- Cleanup Functions ---
export const cleanupFailedOperations = async (): Promise<void> => {
  console.log('Cleaning up failed operations...');
  
  // Clean up temporary students that failed to sync
  const students = getCachedStudents();
  const validStudents = students.filter(student => !student.id.startsWith('temp-'));
  
  if (validStudents.length < students.length) {
    console.log(`Removed ${students.length - validStudents.length} temporary students`);
    cacheStudents(validStudents);
  }
  
  // Clean up old failed sync attempts (older than 24 hours)
  const offlineUpdates = JSON.parse(localStorage.getItem('offline-updates') || '[]');
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  const recentUpdates = offlineUpdates.filter((update: any) => {
    // Keep updates that don't have timestamps or are recent
    return !update.timestamp || update.timestamp > oneDayAgo;
  });
  
  if (recentUpdates.length < offlineUpdates.length) {
    console.log(`Cleaned up ${offlineUpdates.length - recentUpdates.length} old failed updates`);
    localStorage.setItem('offline-updates', JSON.stringify(recentUpdates));
  }
};

// --- Cache Refresh Functions ---
export const refreshCacheIfStale = async (cacheKey: string, fetchFunction: () => Promise<any>): Promise<any> => {
  if (isCacheStale(cacheKey)) {
    console.log(`Cache for ${cacheKey} is stale, refreshing...`);
    try {
      const freshData = await fetchFunction();
      return freshData;
    } catch (error) {
      console.warn(`Failed to refresh cache for ${cacheKey}, using stale data`, error);
      // Return stale data if refresh fails
      switch (cacheKey) {
        case CACHE_KEY_STUDENT: return getCachedStudent();
        case CACHE_KEY_STUDENTS: return getCachedStudents();
        case CACHE_KEY_QUESTS: return getCachedQuests();
        case CACHE_KEY_PROGRESS: return getCachedProgress();
        case CACHE_KEY_SMS_LOGS: return getCachedSmsLogs();
        default: return null;
      }
    }
  }
  
  // Return cached data if not stale
  switch (cacheKey) {
    case CACHE_KEY_STUDENT: return getCachedStudent();
    case CACHE_KEY_STUDENTS: return getCachedStudents();
    case CACHE_KEY_QUESTS: return getCachedQuests();
    case CACHE_KEY_PROGRESS: return getCachedProgress();
    case CACHE_KEY_SMS_LOGS: return getCachedSmsLogs();
    default: return null;
  }
};

// --- Syncing logic ---

export const fetchStudent = async (studentId: string): Promise<Student | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const student = await response.json();
    cacheStudent(student);
    return student;
  } catch (error) {
    console.warn('Failed to fetch student from network, using cache.', error);
    const cachedStudent = await refreshCacheIfStale(CACHE_KEY_STUDENT, () => fetch(`${API_BASE_URL}/students/${studentId}`).then(r => r.json()));
    if (cachedStudent && cachedStudent.id === studentId) {
      return cachedStudent;
    }
    return null;
  }
};

export const fetchStudents = async (): Promise<Student[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/students`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const students = await response.json();
        cacheStudents(students);
        return students;
    } catch (error) {
        console.warn('Failed to fetch students from network, using cache.', error);
        return await refreshCacheIfStale(CACHE_KEY_STUDENTS, () => fetch(`${API_BASE_URL}/students`).then(r => r.json()));
    }
};


export const fetchQuests = async (): Promise<Quest[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/quests`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    const quests = Array.isArray(data) ? data.map(normalizeQuest) : [];
    cacheQuests(quests);
    return quests;
  } catch (error) {
    console.warn('Failed to fetch quests from network, using cache.', error);
    return getCachedQuests();
  }
};

export const fetchQuest = async (questId: string): Promise<Quest | undefined> => {
  try {
    const response = await fetch(`${API_BASE_URL}/quests/${questId}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    const quest = normalizeQuest(data);
    const cached = getCachedQuests();
    const existingIndex = cached.findIndex(q => q.id === questId);
    if (existingIndex >= 0) {
      cached[existingIndex] = quest;
    } else {
      cached.push(quest);
    }
    cacheQuests(cached);
    return quest;
  } catch (error) {
    console.warn(`Failed to fetch quest ${questId} from network, using cache.`, error);
    return getCachedQuests().find(q => q.id === questId);
  }
};

export const fetchProgress = async (studentId: string): Promise<Progress[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/progress/${studentId}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const progress = await response.json();
    cacheProgress(progress);
    return progress;
  } catch (error) {
    console.warn('Failed to fetch progress from network, using cache.', error);
    return await refreshCacheIfStale(CACHE_KEY_PROGRESS, () => fetch(`${API_BASE_URL}/progress/${studentId}`).then(r => r.json()));
  }
};

export const fetchAllProgress = async (): Promise<Progress[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/progress`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const progress = await response.json();
        cacheProgress(progress);
        return progress;
    } catch (error) {
        console.warn('Failed to fetch all progress from network, using cache.', error);
        return await refreshCacheIfStale(CACHE_KEY_PROGRESS, () => fetch(`${API_BASE_URL}/progress`).then(r => r.json()));
    }
};

export const fetchSmsLogs = async (): Promise<SMSLog[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/smslogs`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const smsLogs = await response.json();
        cacheSmsLogs(smsLogs);
        return smsLogs;
    } catch (error) {
        console.warn('Failed to fetch sms logs from network, using cache.', error);
        return await refreshCacheIfStale(CACHE_KEY_SMS_LOGS, () => fetch(`${API_BASE_URL}/smslogs`).then(r => r.json()));
    }
};

export const updateProgress = async (progress: Progress): Promise<void> => {
    try {
        await retryWithBackoff(async () => {
            const res = await fetch(`${API_BASE_URL}/progress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(progress),
            });
            if (!res.ok) {
                throw new Error('Network response was not ok');
            }
            return res;
        });
        
        // Optimistically update student's XP in cache
        const student = getCachedStudent();
        if (student && student.id === progress.studentId) {
            student.xp += progress.score;
            cacheStudent(student);

            // Update students array in cache
            const students = getCachedStudents();
            const studentIndex = students.findIndex(s => s.id === progress.studentId);
            if (studentIndex !== -1) {
                students[studentIndex].xp += progress.score;
                cacheStudents(students);
            }
        }

    } catch (error) {
        console.error('Failed to update progress to network.', error);
        // Here you would queue the update for later when online
        // For the hackathon, we can maybe just store it and have a "sync" button
        alert('You are offline. Progress will be saved when you are back online.');
        
        // simple queue for offline updates
        const offlineUpdates = JSON.parse(localStorage.getItem('offline-updates') || '[]');
        offlineUpdates.push(progress);
        localStorage.setItem('offline-updates', JSON.stringify(offlineUpdates));

        // Optimistically update student's XP in cache even when offline
        const student = getCachedStudent();
        if (student && student.id === progress.studentId) {
            student.xp += progress.score;
            cacheStudent(student);

            // Update students array in cache
            const students = getCachedStudents();
            const studentIndex = students.findIndex(s => s.id === progress.studentId);
            if (studentIndex !== -1) {
                students[studentIndex].xp += progress.score;
                cacheStudents(students);
            }
        }
    }
};

export const syncOfflineUpdates = async () => {
    const offlineUpdates = JSON.parse(localStorage.getItem('offline-updates') || '[]');
    if (offlineUpdates.length > 0) {
        console.log('Syncing offline updates...');
        const successfulUpdates = [];
        const failedUpdates = [];
        
        for (const update of offlineUpdates) {
            try {
                if (update?.type === 'create-quest') {
                    await syncQuestCreate(update.data);
                    successfulUpdates.push(update);
                } else if (update?.type === 'update-quest') {
                    await syncQuestUpdate(update.id, update.data);
                    successfulUpdates.push(update);
                } else if (update?.type === 'delete-quest') {
                    await syncQuestDelete(update.id);
                    successfulUpdates.push(update);
                } else if (update?.type) {
                    console.warn('Unsupported offline update type, keeping in queue:', update.type);
                    failedUpdates.push(update);
                } else {
                    await updateProgress(update);
                    successfulUpdates.push(update);
                }
            } catch (error) {
                console.error('Failed to sync update:', update, error);
                failedUpdates.push(update);
                // Continue with other updates instead of stopping
            }
        }
        
        // Save failed updates for retry
        localStorage.setItem('offline-updates', JSON.stringify(failedUpdates));
        
        if (successfulUpdates.length > 0) {
            console.log(`Successfully synced ${successfulUpdates.length} updates. ${failedUpdates.length} failed.`);
            if (failedUpdates.length === 0) {
                alert('Offline progress has been synced!');
            } else {
                alert(`Synced ${successfulUpdates.length} updates. ${failedUpdates.length} failed and will retry.`);
            }
        }
    }
};

// --- Student CRUD Operations ---
export const createStudent = async (studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student> => {
  try {
    const response = await fetch(`${API_BASE_URL}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(studentData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create student');
    }
    
    const newStudent = await response.json();
    
    // Update cache
    const cachedStudents = getCachedStudents();
    cacheStudents([...cachedStudents, newStudent]);
    
    return newStudent;
  } catch (error) {
    console.error('Failed to create student:', error);
    
    // Create offline student with temporary ID
    const tempStudent: Student = {
      id: `temp-${Date.now()}`,
      ...studentData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const cachedStudents = getCachedStudents();
    cacheStudents([...cachedStudents, tempStudent]);
    
    // Queue for sync when online
    const offlineUpdates = JSON.parse(localStorage.getItem('offline-updates') || '[]');
    offlineUpdates.push({ type: 'create-student', data: studentData });
    localStorage.setItem('offline-updates', JSON.stringify(offlineUpdates));
    
    return tempStudent;
  }
};

export const updateStudent = async (studentId: string, studentData: Partial<Student>): Promise<Student> => {
  try {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(studentData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update student');
    }
    
    const updatedStudent = await response.json();
    
    // Update cache
    const cachedStudents = getCachedStudents();
    const updatedStudents = cachedStudents.map(s => 
      s.id === studentId ? updatedStudent : s
    );
    cacheStudents(updatedStudents);
    
    return updatedStudent;
  } catch (error) {
    console.error('Failed to update student:', error);
    
    // Update cache optimistically
    const cachedStudents = getCachedStudents();
    const studentIndex = cachedStudents.findIndex(s => s.id === studentId);
    
    if (studentIndex !== -1) {
      const updatedStudent = {
        ...cachedStudents[studentIndex],
        ...studentData,
        updatedAt: new Date(),
      };
      
      cachedStudents[studentIndex] = updatedStudent;
      cacheStudents(cachedStudents);
      
      // Queue for sync when online
      const offlineUpdates = JSON.parse(localStorage.getItem('offline-updates') || '[]');
      offlineUpdates.push({ type: 'update-student', id: studentId, data: studentData });
      localStorage.setItem('offline-updates', JSON.stringify(offlineUpdates));
      
      return updatedStudent;
    }
    
    throw error;
  }
};

export const deleteStudent = async (studentId: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete student');
    }
    
    // Update cache
    const cachedStudents = getCachedStudents();
    const updatedStudents = cachedStudents.filter(s => s.id !== studentId);
    cacheStudents(updatedStudents);
    
  } catch (error) {
    console.error('Failed to delete student:', error);
    
    // Update cache optimistically
    const cachedStudents = getCachedStudents();
    const updatedStudents = cachedStudents.filter(s => s.id !== studentId);
    cacheStudents(updatedStudents);
    
    // Queue for sync when online
    const offlineUpdates = JSON.parse(localStorage.getItem('offline-updates') || '[]');
    offlineUpdates.push({ type: 'delete-student', id: studentId });
    localStorage.setItem('offline-updates', JSON.stringify(offlineUpdates));
  }
};

// --- Quest CRUD Operations ---
export const createQuest = async (questData: Omit<Quest, 'id' | 'createdAt'>): Promise<Quest> => {
  const questId = generateLocalId('quest');
  const payload = {
    ...questData,
    id: questId,
    levels: questData.levels ?? [],
    questions: questData.questions ? questData.questions.map(serializeQuestion) : []
  };

  try {
    const response = await fetch(`${API_BASE_URL}/quests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create quest');
    }
    
    const newQuest = normalizeQuest(await response.json());
    upsertQuestInCache(newQuest);
    return newQuest;
  } catch (error) {
    console.error('Failed to create quest:', error);
    
    const tempQuest = normalizeQuest({
      ...questData,
      id: questId,
      createdAt: new Date().toISOString(),
    });
    
    upsertQuestInCache(tempQuest);
    
    const offlineUpdates = JSON.parse(localStorage.getItem('offline-updates') || '[]');
    offlineUpdates.push({ type: 'create-quest', data: serializeQuest(tempQuest) });
    localStorage.setItem('offline-updates', JSON.stringify(offlineUpdates));
    
    return tempQuest;
  }
};

export const updateQuest = async (questId: string, questData: Partial<Quest>): Promise<Quest> => {
  try {
    const response = await fetch(`${API_BASE_URL}/quests/${questId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...questData,
        questions: questData.questions ? questData.questions.map(serializeQuestion) : undefined,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update quest');
    }
    
    const updatedQuest = normalizeQuest(await response.json());
    upsertQuestInCache(updatedQuest);
    return updatedQuest;
  } catch (error) {
    console.error('Failed to update quest:', error);
    
    const cachedQuest = getCachedQuests().find(q => q.id === questId);
    if (!cachedQuest) {
      throw error;
    }
    
    const optimisticQuest = mergeQuestUpdates(cachedQuest, questData);
    upsertQuestInCache(optimisticQuest);
    
    const offlineUpdates = JSON.parse(localStorage.getItem('offline-updates') || '[]');
    offlineUpdates.push({ type: 'update-quest', id: questId, data: serializeQuest(optimisticQuest) });
    localStorage.setItem('offline-updates', JSON.stringify(offlineUpdates));
    
    return optimisticQuest;
  }
};

export const deleteQuest = async (questId: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/quests/${questId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete quest');
    }
    
    removeQuestFromCache(questId);
    
  } catch (error) {
    console.error('Failed to delete quest:', error);
    
    removeQuestFromCache(questId);
    
    // Queue for sync when online
    const offlineUpdates = JSON.parse(localStorage.getItem('offline-updates') || '[]');
    offlineUpdates.push({ type: 'delete-quest', id: questId });
    localStorage.setItem('offline-updates', JSON.stringify(offlineUpdates));
  }
};

// --- AI Recommendation Functions ---
export const fetchRecommendations = async (studentId: string): Promise<RecommendationResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/recommendations/${studentId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch recommendations');
    }
    const recommendations = await response.json();
    
    // Cache recommendations for offline use
    localStorage.setItem(`learnquest-recommendations-${studentId}`, JSON.stringify(recommendations));
    
    return recommendations;
  } catch (error) {
    console.warn('Failed to fetch recommendations from network, using cache.', error);
    
    // Try to get cached recommendations
    const cached = localStorage.getItem(`learnquest-recommendations-${studentId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Return empty recommendations if no cache
    return {
      recommendedQuests: [],
      learningInsights: [],
      nextFocusArea: 'balanced'
    };
  }
};
