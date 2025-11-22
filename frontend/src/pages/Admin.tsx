
import { useState, useEffect } from 'react';
import type { Student, Quest, Progress, SMSLog, QuestionType, QuestPlayMode } from '../types';
import { fetchStudents, fetchAllProgress, fetchQuests, fetchSmsLogs, createStudent, updateStudent, deleteStudent, createQuest, updateQuest, deleteQuest } from '../utils/offlineSync';

type AnswerFormState = {
  id: string;
  label: string;
  value: string;
  isCorrect: boolean;
};

type QuestionFormState = {
  id: string;
  prompt: string;
  order: number;
  type: QuestionType;
  payload?: Record<string, unknown>;
  answers: AnswerFormState[];
};

type QuestFormState = {
  title: string;
  type: 'math' | 'reading';
  difficulty: 1 | 2 | 3;
  description: string;
  maxScore: number;
  timeLimit: number;
  completionScore: number;
  levels: { level: number; scoreToLevelUp: number }[];
  playMode: QuestPlayMode;
  questions: QuestionFormState[];
};

const randomId = (prefix: string) => {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return `${prefix}-${crypto.randomUUID()}`;
    }
  } catch {
    // ignore and fall back
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

const createEmptyAnswer = (): AnswerFormState => ({
  id: randomId('ans'),
  label: '',
  value: '',
  isCorrect: false
});

const createEmptyQuestion = (): QuestionFormState => ({
  id: randomId('question'),
  prompt: '',
  order: 0,
  type: 'text',
  payload: undefined,
  answers: [createEmptyAnswer(), createEmptyAnswer(), createEmptyAnswer(), createEmptyAnswer()]
});

const DEFAULT_LEVELS = [{ level: 1, scoreToLevelUp: 100 }];

const Admin = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [smsLogs, setSmsLogs] = useState<SMSLog[]>([]);
  const [activeTab, setActiveTab] = useState<'students' | 'quests' | 'progress' | 'sms'>('students');
  
  // Modal states
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showQuestModal, setShowQuestModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  
  // Form states
  const [studentForm, setStudentForm] = useState({
    name: '',
    level: 1,
    xp: 0,
    parentPhone: ''
  });
  
  const [questForm, setQuestForm] = useState<QuestFormState>({
    title: '',
    type: 'math',
    difficulty: 1,
    description: '',
    maxScore: 100,
    timeLimit: 60,
    completionScore: 70,
    levels: DEFAULT_LEVELS.map(level => ({ ...level })),
    playMode: 'multiple-choice',
    questions: [createEmptyQuestion()]
  });

  const fetchData = () => {
    fetchStudents().then(setStudents);
    fetchQuests().then(setQuests);
    fetchAllProgress().then(setProgress);
    fetchSmsLogs().then(setSmsLogs);
  };

  const resetQuestForm = () => {
    setQuestForm({
      title: '',
      type: 'math',
      difficulty: 1,
      description: '',
      maxScore: 100,
      timeLimit: 60,
      completionScore: 70,
      levels: DEFAULT_LEVELS.map(level => ({ ...level })),
      playMode: 'multiple-choice',
      questions: [createEmptyQuestion()]
    });
  };

  const updateQuestionState = (questionId: string, updater: (question: QuestionFormState) => QuestionFormState) => {
    setQuestForm(prev => ({
      ...prev,
      questions: prev.questions.map(question =>
        question.id === questionId ? updater(question) : question
      )
    }));
  };

  const handleAddQuestion = () => {
    setQuestForm(prev => ({
      ...prev,
      questions: [...prev.questions, createEmptyQuestion()]
    }));
  };

  const handleRemoveQuestion = (questionId: string) => {
    setQuestForm(prev => {
      const remaining = prev.questions.filter(question => question.id !== questionId);
      return {
        ...prev,
        questions: remaining.length ? remaining : [createEmptyQuestion()]
      };
    });
  };

  const handleQuestionPromptChange = (questionId: string, value: string) => {
    updateQuestionState(questionId, question => ({ ...question, prompt: value }));
  };

  const handleQuestionTypeChange = (questionId: string, type: QuestionType) => {
    updateQuestionState(questionId, question => {
      if (type === 'fraction') {
        const existing = question.payload as { numerator?: number; denominator?: number } | undefined;
        return {
          ...question,
          type,
          payload: {
            numerator: existing?.numerator ?? 1,
            denominator: existing?.denominator ?? 2
          }
        };
      }
      return { ...question, type, payload: undefined };
    });
  };

  const handleFractionPayloadChange = (questionId: string, key: 'numerator' | 'denominator', value: string) => {
    const numericValue = Math.max(1, Number(value) || 1);
    updateQuestionState(questionId, question => {
      const payload = (question.payload as { numerator?: number; denominator?: number } | undefined) ?? { numerator: 1, denominator: 2 };
      return {
        ...question,
        payload: {
          numerator: key === 'numerator' ? numericValue : payload.numerator ?? 1,
          denominator: key === 'denominator' ? numericValue : payload.denominator ?? 2
        }
      };
    });
  };

  const handleAddAnswer = (questionId: string) => {
    updateQuestionState(questionId, question => ({
      ...question,
      answers: [...question.answers, createEmptyAnswer()]
    }));
  };

  const handleRemoveAnswer = (questionId: string, answerId: string) => {
    updateQuestionState(questionId, question => {
      const remaining = question.answers.filter(answer => answer.id !== answerId);
      return {
        ...question,
        answers: remaining.length ? remaining : [createEmptyAnswer()]
      };
    });
  };

  const handleAnswerChange = (questionId: string, answerId: string, field: 'label' | 'value', value: string) => {
    updateQuestionState(questionId, question => ({
      ...question,
      answers: question.answers.map(answer =>
        answer.id === answerId ? { ...answer, [field]: value } : answer
      )
    }));
  };

  const handleMarkCorrect = (questionId: string, answerId: string) => {
    updateQuestionState(questionId, question => ({
      ...question,
      answers: question.answers.map(answer => ({
        ...answer,
        isCorrect: answer.id === answerId
      }))
    }));
  };

  // Student handlers
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        await updateStudent(editingStudent.id, studentForm);
      } else {
        await createStudent(studentForm);
      }
      setShowStudentModal(false);
      setEditingStudent(null);
      setStudentForm({ name: '', level: 1, xp: 0, parentPhone: '' });
      fetchData();
    } catch (error) {
      console.error('Error saving student:', error);
      alert('Error saving student. Please try again.');
    }
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setStudentForm({
      name: student.name,
      level: student.level,
      xp: student.xp,
      parentPhone: student.parentPhone || ''
    });
    setShowStudentModal(true);
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (confirm('Are you sure you want to delete this student?')) {
      try {
        await deleteStudent(studentId);
        
        // Update state directly for immediate UI update
        setStudents(prev => prev.filter(s => s.id !== studentId));
        
        // Also refresh from cache to ensure consistency
        fetchData();
      } catch (error) {
        console.error('Error deleting student:', error);
        alert('Error deleting student. Please try again.');
      }
    }
  };

  // Quest handlers
  const handleQuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formattedQuestions = questForm.questions.map((question, index) => {
        if (!question.prompt.trim()) {
          throw new Error('Please provide a prompt for each question.');
        }

        const filteredAnswers = question.answers.filter(answer => answer.label.trim().length > 0);
        if (filteredAnswers.length === 0) {
          throw new Error('Each question must include at least one answer option.');
        }

        const answers = filteredAnswers.map(answer => ({
          id: answer.id || randomId('ans'),
          questionId: question.id,
          label: answer.label.trim(),
          value: (answer.value || answer.label).trim(),
          isCorrect: answer.isCorrect
        }));

        if (!answers.some(answer => answer.isCorrect)) {
          answers[0].isCorrect = true;
        }

        const payload =
          question.type === 'fraction'
            ? {
                numerator: Number(
                  (question.payload as { numerator?: number } | undefined)?.numerator ?? 1
                ),
                denominator: Math.max(
                  1,
                  Number((question.payload as { denominator?: number } | undefined)?.denominator ?? 2)
                )
              }
            : undefined;

        return {
          id: question.id,
          questId: editingQuest?.id ?? '',
          prompt: question.prompt.trim(),
          order: index,
          type: question.type,
          payload,
          answers
        };
      });

      const payload = {
        title: questForm.title.trim(),
        type: questForm.type,
        difficulty: questForm.difficulty,
        description: questForm.description.trim(),
        maxScore: questForm.maxScore,
        timeLimit: questForm.timeLimit,
        completionScore: questForm.completionScore,
        levels: questForm.levels,
        playMode: questForm.playMode,
        questions: formattedQuestions
      };

      if (editingQuest) {
        await updateQuest(editingQuest.id, payload);
      } else {
        await createQuest(payload);
      }
      setShowQuestModal(false);
      setEditingQuest(null);
      resetQuestForm();
      fetchData();
    } catch (error) {
      console.error('Error saving quest:', error);
      alert(error instanceof Error ? error.message : 'Error saving quest. Please try again.');
    }
  };

  const handleEditQuest = (quest: Quest) => {
    setEditingQuest(quest);
    const questionForms: QuestionFormState[] =
      quest.questions && quest.questions.length
        ? quest.questions.map(question => ({
            id: question.id,
            prompt: question.prompt,
            order: question.order ?? 0,
            type: question.type ?? 'text',
            payload: question.payload,
            answers:
              question.answers && question.answers.length
                ? question.answers.map(answer => ({
                    id: answer.id,
                    label: answer.label,
                    value: answer.value,
                    isCorrect: answer.isCorrect
                  }))
                : [createEmptyAnswer(), createEmptyAnswer()]
          }))
        : [createEmptyQuestion()];

    setQuestForm({
      title: quest.title,
      type: quest.type,
      difficulty: quest.difficulty,
      description: quest.description || '',
      maxScore: quest.maxScore,
      timeLimit: quest.timeLimit,
      completionScore: quest.completionScore,
      levels: quest.levels,
      playMode: quest.playMode ?? 'multiple-choice',
      questions: questionForms
    });
    setShowQuestModal(true);
  };

  const handleDeleteQuest = async (questId: string) => {
    if (confirm('Are you sure you want to delete this quest?')) {
      try {
        await deleteQuest(questId);
        
        // Update state directly for immediate UI update
        setQuests(prev => prev.filter(q => q.id !== questId));
        
        // Also refresh from cache to ensure consistency
        fetchData();
      } catch (error) {
        console.error('Error deleting quest:', error);
        alert('Error deleting quest. Please try again.');
      }
    }
  };

  useEffect(() => {
    fetchData();
    window.addEventListener('focus', fetchData);
    return () => window.removeEventListener('focus', fetchData);
  }, []);

  const progressWithDetails = progress.map(p => ({
    ...p,
    studentName: students.find(s => s.id === p.studentId)?.name || 'Unknown',
    questTitle: quests.find(q => q.id === p.questId)?.title || 'Unknown'
  }));

  const stats = {
    totalStudents: students.length,
    totalQuests: quests.length,
    totalProgress: progress.length,
    totalSms: smsLogs.length
  };

  return (
    <div className="p-4 dark:text-white max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Admin Dashboard</h2>
        <p className="text-gray-600 dark:text-gray-400">Manage students, quests, and track progress</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalStudents}</div>
          <div className="text-sm text-blue-600 dark:text-blue-400">Students</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalQuests}</div>
          <div className="text-sm text-green-600 dark:text-green-400">Quests</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalProgress}</div>
          <div className="text-sm text-purple-600 dark:text-purple-400">Progress Records</div>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.totalSms}</div>
          <div className="text-sm text-orange-600 dark:text-orange-400">SMS Sent</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex space-x-1 border-b dark:border-gray-700">
          {[
            { key: 'students', label: 'Students', icon: '👨‍🎓' },
            { key: 'quests', label: 'Quests', icon: '🎯' },
            { key: 'progress', label: 'Progress', icon: '📊' },
            { key: 'sms', label: 'SMS Logs', icon: '💬' }
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                activeTab === key
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 shadow-sm">
        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Student Management</h3>
              <button 
                onClick={() => {
                  setEditingStudent(null);
                  setStudentForm({ name: '', level: 1, xp: 0, parentPhone: '' });
                  setShowStudentModal(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                + Add Student
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Level</th>
                    <th className="px-4 py-3 text-left">XP</th>
                    <th className="px-4 py-3 text-left">Parent Phone</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {students.map(student => (
                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 font-medium">{student.name}</td>
                      <td className="px-4 py-3">
                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs">
                          Level {student.level}
                        </span>
                      </td>
                      <td className="px-4 py-3">{student.xp} XP</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {student.parentPhone || 'Not set'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleEditStudent(student)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteStudent(student.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Quests Tab */}
        {activeTab === 'quests' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Quest Management</h3>
              <button 
                onClick={() => {
                  setEditingQuest(null);
                  resetQuestForm();
                  setShowQuestModal(true);
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"
              >
                + Add Quest
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quests.map(quest => (
                <div key={quest.id} className="border dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-lg">{quest.title}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      quest.difficulty === 1 ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                      quest.difficulty === 2 ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                      'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                    }`}>
                      {quest.difficulty === 1 ? 'Easy' : quest.difficulty === 2 ? 'Medium' : 'Hard'}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{quest.description}</p>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Max Score: {quest.maxScore}</span>
                    <span>Time: {quest.timeLimit}s</span>
                    <span>Questions: {quest.questions ? quest.questions.length : 0}</span>
                  </div>
                  <div className="mt-3 flex space-x-2">
                    <button 
                      onClick={() => handleEditQuest(quest)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteQuest(quest.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div className="p-6">
            <h3 className="text-xl font-bold mb-4">Student Progress</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-left">Quest</th>
                    <th className="px-4 py-3 text-left">Score</th>
                    <th className="px-4 py-3 text-left">Attempts</th>
                    <th className="px-4 py-3 text-left">Completed</th>
                    <th className="px-4 py-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {progressWithDetails.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 font-medium">{p.studentName}</td>
                      <td className="px-4 py-3">{p.questTitle}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          p.score >= 80 ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                          p.score >= 60 ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                          'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        }`}>
                          {p.score}
                        </span>
                      </td>
                      <td className="px-4 py-3">{p.attempts}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          p.completed ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                          'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'
                        }`}>
                          {p.completed ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {p.completedAt ? new Date(p.completedAt).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SMS Logs Tab */}
        {activeTab === 'sms' && (
          <div className="p-6">
            <h3 className="text-xl font-bold mb-4">SMS Logs</h3>
            {smsLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="text-4xl mb-2">💬</div>
                <p>No SMS logs available</p>
                <p className="text-sm">SMS logs will appear here when messages are sent</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Phone</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-left">Message</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {smsLogs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 font-mono">{log.phoneNumber}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded-full text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                            {log.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate" title={log.message}>
                          {log.message}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            log.status === 'sent' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                            log.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                            'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {new Date(log.sentAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Student Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              {editingStudent ? 'Edit Student' : 'Add New Student'}
            </h3>
            <form onSubmit={handleStudentSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
                    className="w-full p-2 border dark:border-gray-600 rounded dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Level</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={studentForm.level}
                    onChange={(e) => setStudentForm({...studentForm, level: parseInt(e.target.value)})}
                    className="w-full p-2 border dark:border-gray-600 rounded dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">XP</label>
                  <input
                    type="number"
                    min="0"
                    value={studentForm.xp}
                    onChange={(e) => setStudentForm({...studentForm, xp: parseInt(e.target.value)})}
                    className="w-full p-2 border dark:border-gray-600 rounded dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Parent Phone</label>
                  <input
                    type="tel"
                    value={studentForm.parentPhone}
                    onChange={(e) => setStudentForm({...studentForm, parentPhone: e.target.value})}
                    className="w-full p-2 border dark:border-gray-600 rounded dark:bg-gray-700"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingStudent ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quest Modal */}
      {showQuestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {editingQuest ? 'Edit Quest' : 'Add New Quest'}
            </h3>
            <form onSubmit={handleQuestSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={questForm.title}
                    onChange={(e) => setQuestForm({...questForm, title: e.target.value})}
                    className="w-full p-2 border dark:border-gray-600 rounded dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={questForm.type}
                    onChange={(e) => setQuestForm({...questForm, type: e.target.value as 'math' | 'reading'})}
                    className="w-full p-2 border dark:border-gray-600 rounded dark:bg-gray-700"
                  >
                    <option value="math">Math</option>
                    <option value="reading">Reading</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Difficulty</label>
                  <select
                    value={questForm.difficulty}
                    onChange={(e) => setQuestForm({...questForm, difficulty: parseInt(e.target.value) as 1 | 2 | 3})}
                    className="w-full p-2 border dark:border-gray-600 rounded dark:bg-gray-700"
                  >
                    <option value="1">Easy</option>
                    <option value="2">Medium</option>
                    <option value="3">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Play Mode</label>
                  <select
                    value={questForm.playMode}
                    onChange={(e) => setQuestForm({...questForm, playMode: e.target.value as QuestPlayMode})}
                    className="w-full p-2 border dark:border-gray-600 rounded dark:bg-gray-700"
                  >
                    <option value="multiple-choice">Multiple Choice</option>
                    <option value="market-arithmetic">Market Arithmetic</option>
                    <option value="fraction-visual">Fraction Visual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={questForm.description}
                    onChange={(e) => setQuestForm({...questForm, description: e.target.value})}
                    className="w-full p-2 border dark:border-gray-600 rounded dark:bg-gray-700"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Score</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={questForm.maxScore}
                    onChange={(e) => setQuestForm({...questForm, maxScore: parseInt(e.target.value)})}
                    className="w-full p-2 border dark:border-gray-600 rounded dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Time Limit (seconds)</label>
                  <input
                    type="number"
                    min="1"
                    max="3600"
                    value={questForm.timeLimit}
                    onChange={(e) => setQuestForm({...questForm, timeLimit: parseInt(e.target.value)})}
                    className="w-full p-2 border dark:border-gray-600 rounded dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Completion Score</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={questForm.completionScore}
                    onChange={(e) => setQuestForm({...questForm, completionScore: parseInt(e.target.value)})}
                    className="w-full p-2 border dark:border-gray-600 rounded dark:bg-gray-700"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium">Questions</label>
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      + Add Question
                    </button>
                  </div>
                  <div className="space-y-3">
                    {questForm.questions.map((question, index) => {
                      const fractionPayload = (question.payload as { numerator?: number; denominator?: number } | undefined) ?? { numerator: 1, denominator: 2 };
                      return (
                        <div key={question.id} className="border border-gray-200 dark:border-gray-600 rounded-md p-4 bg-gray-50 dark:bg-gray-900/40">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Question {index + 1}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{question.type}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(question.id)}
                              className="text-xs text-red-600 dark:text-red-400 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium mb-1">Prompt</label>
                              <textarea
                                value={question.prompt}
                                onChange={(e) => handleQuestionPromptChange(question.id, e.target.value)}
                                className="w-full p-2 border dark:border-gray-600 rounded dark:bg-gray-800"
                                rows={2}
                              />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium mb-1">Question Type</label>
                                <select
                                  value={question.type}
                                  onChange={(e) => handleQuestionTypeChange(question.id, e.target.value as QuestionType)}
                                  className="w-full p-2 border dark:border-gray-600 rounded dark:bg-gray-800"
                                >
                                  <option value="text">Text</option>
                                  <option value="numeric">Numeric</option>
                                  <option value="fraction">Fraction</option>
                                  <option value="custom">Custom</option>
                                </select>
                              </div>
                              {question.type === 'fraction' && (
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-xs font-medium mb-1">Numerator</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={fractionPayload.numerator ?? 1}
                                      onChange={(e) => handleFractionPayloadChange(question.id, 'numerator', e.target.value)}
                                      className="w-full p-2 border dark:border-gray-600 rounded dark:bg-gray-800"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium mb-1">Denominator</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={fractionPayload.denominator ?? 2}
                                      onChange={(e) => handleFractionPayloadChange(question.id, 'denominator', e.target.value)}
                                      className="w-full p-2 border dark:border-gray-600 rounded dark:bg-gray-800"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Answers</span>
                                <button
                                  type="button"
                                  onClick={() => handleAddAnswer(question.id)}
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  + Add Answer
                                </button>
                              </div>
                              <div className="space-y-2">
                                {question.answers.map((answer, answerIndex) => (
                                  <div key={answer.id} className="grid grid-cols-1 md:grid-cols-[1fr,1fr,auto,auto] gap-2 items-center">
                                    <input
                                      type="text"
                                      placeholder={`Answer ${answerIndex + 1}`}
                                      value={answer.label}
                                      onChange={(e) => handleAnswerChange(question.id, answer.id, 'label', e.target.value)}
                                      className="w-full p-2 border dark:border-gray-600 rounded dark:bg-gray-800"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Value (optional)"
                                      value={answer.value}
                                      onChange={(e) => handleAnswerChange(question.id, answer.id, 'value', e.target.value)}
                                      className="w-full p-2 border dark:border-gray-600 rounded dark:bg-gray-800"
                                    />
                                    <label className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-300">
                                      <input
                                        type="radio"
                                        name={`correct-${question.id}`}
                                        checked={answer.isCorrect}
                                        onChange={() => handleMarkCorrect(question.id, answer.id)}
                                      />
                                      <span>Correct</span>
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveAnswer(question.id, answer.id)}
                                      className="text-xs text-red-600 dark:text-red-400 hover:underline justify-self-start md:justify-self-end"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowQuestModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  {editingQuest ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
