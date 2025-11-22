import { createQuest, createSmsTemplate } from '../src/database';

const seedQuests = () => {
  // Sample quests matching frontend structure
  createQuest({
    id: '1',
    title: 'Market Math Basics',
    type: 'math',
    difficulty: 1,
    description: 'Learn addition and subtraction with African market prices.',
    maxScore: 100,
    timeLimit: 60,
    completionScore: 80,
    levels: [
      { level: 1, scoreToLevelUp: 50 },
      { level: 2, scoreToLevelUp: 100 }
    ],
    playMode: 'market-arithmetic',
    questions: [
      {
        id: '1-q1',
        questId: '1',
        prompt: 'A mango costs 15 KES and an orange costs 10 KES. How much for both?',
        order: 1,
        type: 'numeric',
        answers: [
          { id: '1-q1-a1', questionId: '1-q1', label: '20 KES', value: '20', isCorrect: false },
          { id: '1-q1-a2', questionId: '1-q1', label: '25 KES', value: '25', isCorrect: true },
          { id: '1-q1-a3', questionId: '1-q1', label: '30 KES', value: '30', isCorrect: false },
          { id: '1-q1-a4', questionId: '1-q1', label: '35 KES', value: '35', isCorrect: false }
        ]
      },
      {
        id: '1-q2',
        questId: '1',
        prompt: 'You have 40 KES. After buying a banana for 12 KES, how much remains?',
        order: 2,
        type: 'numeric',
        answers: [
          { id: '1-q2-a1', questionId: '1-q2', label: '18 KES', value: '18', isCorrect: false },
          { id: '1-q2-a2', questionId: '1-q2', label: '26 KES', value: '26', isCorrect: true },
          { id: '1-q2-a3', questionId: '1-q2', label: '28 KES', value: '28', isCorrect: false },
          { id: '1-q2-a4', questionId: '1-q2', label: '30 KES', value: '30', isCorrect: false }
        ]
      }
    ]
  });

  createQuest({
    id: '2',
    title: 'Fraction Village Introduction',
    type: 'math',
    difficulty: 1,
    description: 'Understand basic fractions with visual pizza slices.',
    maxScore: 100,
    timeLimit: 60,
    completionScore: 80,
    levels: [
      { level: 1, scoreToLevelUp: 40 },
      { level: 2, scoreToLevelUp: 80 }
    ],
    playMode: 'fraction-visual',
    questions: [
      {
        id: '2-q1',
        questId: '2',
        prompt: 'What fraction of the pizza is shaded?',
        order: 1,
        type: 'fraction',
        payload: { numerator: 1, denominator: 2 },
        answers: [
          { id: '2-q1-a1', questionId: '2-q1', label: '1/2', value: '1/2', isCorrect: true },
          { id: '2-q1-a2', questionId: '2-q1', label: '1/3', value: '1/3', isCorrect: false },
          { id: '2-q1-a3', questionId: '2-q1', label: '2/3', value: '2/3', isCorrect: false },
          { id: '2-q1-a4', questionId: '2-q1', label: '1/4', value: '1/4', isCorrect: false }
        ]
      },
      {
        id: '2-q2',
        questId: '2',
        prompt: 'How many slices are shaded?',
        order: 2,
        type: 'fraction',
        payload: { numerator: 3, denominator: 4 },
        answers: [
          { id: '2-q2-a1', questionId: '2-q2', label: '1/4', value: '1/4', isCorrect: false },
          { id: '2-q2-a2', questionId: '2-q2', label: '2/4', value: '2/4', isCorrect: false },
          { id: '2-q2-a3', questionId: '2-q2', label: '3/4', value: '3/4', isCorrect: true },
          { id: '2-q2-a4', questionId: '2-q2', label: '4/4', value: '4/4', isCorrect: false }
        ]
      }
    ]
  });

  createQuest({
    id: '3',
    title: 'Market Math Advanced',
    type: 'math',
    difficulty: 2,
    description: 'More challenging addition and subtraction problems.',
    maxScore: 150,
    timeLimit: 90,
    completionScore: 120,
    levels: [
      { level: 1, scoreToLevelUp: 60 },
      { level: 2, scoreToLevelUp: 120 }
    ],
    playMode: 'market-arithmetic',
    questions: [
      {
        id: '3-q1',
        questId: '3',
        prompt: 'Three pawpaws cost 18 KES each. What is the total cost?',
        order: 1,
        type: 'numeric',
        answers: [
          { id: '3-q1-a1', questionId: '3-q1', label: '36 KES', value: '36', isCorrect: false },
          { id: '3-q1-a2', questionId: '3-q1', label: '48 KES', value: '48', isCorrect: false },
          { id: '3-q1-a3', questionId: '3-q1', label: '54 KES', value: '54', isCorrect: true },
          { id: '3-q1-a4', questionId: '3-q1', label: '60 KES', value: '60', isCorrect: false }
        ]
      },
      {
        id: '3-q2',
        questId: '3',
        prompt: 'A shopper had 200 KES and spent 85 KES. What is left?',
        order: 2,
        type: 'numeric',
        answers: [
          { id: '3-q2-a1', questionId: '3-q2', label: '105 KES', value: '105', isCorrect: true },
          { id: '3-q2-a2', questionId: '3-q2', label: '110 KES', value: '110', isCorrect: false },
          { id: '3-q2-a3', questionId: '3-q2', label: '120 KES', value: '120', isCorrect: false },
          { id: '3-q2-a4', questionId: '3-q2', label: '125 KES', value: '125', isCorrect: false }
        ]
      }
    ]
  });

  createQuest({
    id: '4',
    title: 'Fraction Village Challenges',
    type: 'math',
    difficulty: 2,
    description: 'Advanced fraction problems with multiple slices.',
    maxScore: 150,
    timeLimit: 90,
    completionScore: 120,
    levels: [
      { level: 1, scoreToLevelUp: 50 },
      { level: 2, scoreToLevelUp: 100 },
      { level: 3, scoreToLevelUp: 150 }
    ],
    playMode: 'fraction-visual',
    questions: [
      {
        id: '4-q1',
        questId: '4',
        prompt: 'Shade shows what portion of the basket is full?',
        order: 1,
        type: 'fraction',
        payload: { numerator: 2, denominator: 3 },
        answers: [
          { id: '4-q1-a1', questionId: '4-q1', label: '2/3', value: '2/3', isCorrect: true },
          { id: '4-q1-a2', questionId: '4-q1', label: '1/3', value: '1/3', isCorrect: false },
          { id: '4-q1-a3', questionId: '4-q1', label: '3/4', value: '3/4', isCorrect: false },
          { id: '4-q1-a4', questionId: '4-q1', label: '1/2', value: '1/2', isCorrect: false }
        ]
      },
      {
        id: '4-q2',
        questId: '4',
        prompt: 'Which fraction matches the shaded village huts?',
        order: 2,
        type: 'fraction',
        payload: { numerator: 5, denominator: 6 },
        answers: [
          { id: '4-q2-a1', questionId: '4-q2', label: '5/6', value: '5/6', isCorrect: true },
          { id: '4-q2-a2', questionId: '4-q2', label: '4/6', value: '4/6', isCorrect: false },
          { id: '4-q2-a3', questionId: '4-q2', label: '3/6', value: '3/6', isCorrect: false },
          { id: '4-q2-a4', questionId: '4-q2', label: '6/6', value: '6/6', isCorrect: false }
        ]
      }
    ]
  });

  console.log('Sample quests seeded');
};

const seedSmsTemplates = () => {
    createSmsTemplate('welcome', 'welcome', 'Welcome to LearnQuest Africa, {studentName}! We are excited to have you on board.');
    createSmsTemplate('progress', 'progress', 'Hello! {studentName} has just completed the {questName} quest with a score of {score}. Keep up the great work!');
    createSmsTemplate('achievement', 'achievement', 'Amazing! {studentName} has just reached Level {level}! Congratulations on this achievement!');
    createSmsTemplate('weekly-summary', 'weekly', 'Hi! Here is a summary of {studentName}\'s progress this week: ...');

    console.log('SMS templates seeded');
}

seedQuests();
seedSmsTemplates();
