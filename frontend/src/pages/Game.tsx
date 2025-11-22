import { useState, useEffect } from 'react';
import type { Quest, Answer, Question, RecommendationResponse } from '../types';
import { fetchQuests, updateProgress, getCachedStudent, getCachedProgress, fetchRecommendations } from '../utils/offlineSync';
import AchievementPopup from '../components/AchievementPopup';

const Game = () => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
  const [, setLoadingRecommendations] = useState(false);

  useEffect(() => {
    fetchQuests().then(setQuests);
    
    // Load recommendations if student exists
    const student = getCachedStudent();
    if (student) {
      setLoadingRecommendations(true);
      fetchRecommendations(student.id)
        .then(setRecommendations)
        .catch(console.error)
        .finally(() => setLoadingRecommendations(false));
    }
  }, []);

  const handleGameEnd = (score: number) => {
    if(selectedQuest) {
        const student = getCachedStudent();
        if (student) {
            // Get existing progress to track attempts
            const existingProgress = getCachedProgress();
            const questProgress = existingProgress.filter(p => 
                p.studentId === student.id && p.questId === selectedQuest.id
            );
            const attempts = questProgress.length + 1;
            
            updateProgress({
                id: Date.now().toString(), // Generate unique ID for offline use
                studentId: student.id,
                questId: selectedQuest.id,
                completed: score >= selectedQuest.completionScore,
                score: score,
                attempts: attempts,
                completedAt: new Date(),
            });
        }
    }
    setSelectedQuest(null);
  };

  if (selectedQuest) {
    return <QuestGame quest={selectedQuest} onBack={() => setSelectedQuest(null)} onGameEnd={handleGameEnd} />;
  }

  const getQuestById = (questId: string) => quests.find(q => q.id === questId);
  const getRecommendedQuest = (questId: string) => {
    const quest = getQuestById(questId);
    const recommendation = recommendations?.recommendedQuests.find(r => r.questId === questId);
    return { quest, recommendation };
  };

  return (
    <div className="dark:text-white">
      <h2 className="text-2xl font-bold mb-6">Choose a Quest</h2>
      
      {/* AI Recommendations Section */}
      {recommendations && recommendations.recommendedQuests.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400 flex items-center gap-2">
            <span>🤖</span> Recommended for You
          </h3>
          <div className="grid gap-4">
            {recommendations.recommendedQuests.slice(0, 3).map((rec) => {
              const { quest } = getRecommendedQuest(rec.questId);
              if (!quest) return null;
              
              return (
                <div 
                  key={rec.questId} 
                  className="border-2 border-blue-500 p-4 rounded-lg cursor-pointer bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  onClick={() => setSelectedQuest(quest)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg">{quest.title}</h3>
                    <span className="bg-blue-500 text-white px-2 py-1 rounded text-sm">
                      {Math.round(rec.confidence * 100)}% match
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">{quest.description}</p>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Difficulty: {quest.difficulty}</span>
                    <span>Type: {quest.type}</span>
                  </div>
                  {rec.reasoning && (
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-2 italic">
                      {rec.reasoning}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Quests Section */}
      <div>
        <h3 className="text-xl font-semibold mb-4">All Quests</h3>
        <div className="grid gap-4">
          {quests.map(quest => {
            const isRecommended = recommendations?.recommendedQuests.some(r => r.questId === quest.id);
            
            return (
              <div 
                key={quest.id} 
                className={`border p-4 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 dark:border-gray-700 transition-colors ${
                  isRecommended ? 'border-l-4 border-l-blue-500' : ''
                }`}
                onClick={() => setSelectedQuest(quest)}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-bold">{quest.title}</h3>
                  {isRecommended && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-400">{quest.description}</p>
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-500 mt-2">
                  <span>Difficulty: {quest.difficulty}</span>
                  <span>Type: {quest.type}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Learning Insights */}
      {recommendations && recommendations.learningInsights.length > 0 && (
        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-semibold mb-3">Learning Insights</h4>
          <div className="space-y-2">
            {recommendations.learningInsights.map((insight, index) => (
              <div 
                key={index}
                className={`p-3 rounded text-sm ${
                  insight.type === 'strength' 
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                    : insight.type === 'weakness'
                    ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'
                    : 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
                }`}
              >
                {insight.insight}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const QuestGame = ({ quest, onBack, onGameEnd }: { quest: Quest; onBack: () => void; onGameEnd: (score: number) => void }) => (
  <div className="dark:text-white">
    <button onClick={onBack} className="mb-4 bg-gray-500 text-white px-4 py-2 rounded">Back to Quests</button>
    <QuestRunner quest={quest} onGameEnd={onGameEnd} />
  </div>
);

const QuestRunner = ({ quest, onGameEnd }: { quest: Quest; onGameEnd: (score: number) => void }) => {
  const questions = quest.questions ?? [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(quest.levels?.[0]?.level ?? 1);
  const [timeLeft, setTimeLeft] = useState(quest.timeLimit);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [showAchievement, setShowAchievement] = useState(false);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentIndex(0);
    setScore(0);
    setLevel(quest.levels?.[0]?.level ?? 1);
    setTimeLeft(quest.timeLimit);
    setFeedback(null);
    setGameCompleted(false);
    setShowAchievement(false);
    setSelectedAnswerId(null);
  }, [quest.id, quest.timeLimit, quest.levels]);

  useEffect(() => {
    if (gameCompleted) return;
    if (timeLeft <= 0) {
      finishGame();
      return;
    }
    const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, gameCompleted]);

  const pointsPerQuestion = questions.length ? Math.max(1, Math.round(quest.maxScore / questions.length)) : quest.maxScore;

  const currentQuestion = questions[currentIndex];

  const finishGame = (finalScore = score) => {
    if (gameCompleted) return;
    setGameCompleted(true);
    setTimeout(() => onGameEnd(finalScore), 3000);
  };

  const handleAnswer = (answer: Answer) => {
    if (!currentQuestion || gameCompleted || selectedAnswerId) {
      return;
    }

    setSelectedAnswerId(answer.id);

    const isCorrect = answer.isCorrect;
    const updatedScore = isCorrect ? score + pointsPerQuestion : score;

    if (isCorrect) {
      const nextLevel = quest.levels?.find(l => l.level === level + 1);
      if (nextLevel && updatedScore >= nextLevel.scoreToLevelUp) {
        setLevel(prev => prev + 1);
        setShowAchievement(true);
      }
    }

    setScore(updatedScore);
    setFeedback(isCorrect ? 'Correct! Keep going!' : 'Not quite, on to the next one!');
    setTimeout(() => setFeedback(null), 1500);

    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      finishGame(updatedScore);
    } else {
      setTimeout(() => {
        setCurrentIndex(nextIndex);
        setSelectedAnswerId(null);
      }, 400);
    }
  };

  const renderFractionVisual = (question: Question) => {
    const payload = (question.payload as { numerator?: number; denominator?: number } | undefined) ?? { numerator: 1, denominator: 2 };
    const numerator = Math.max(1, Number(payload.numerator) || 1);
    const denominator = Math.max(1, Number(payload.denominator) || 1);
    const rotation = (numerator / denominator) * 360;

    return (
      <div className="my-6 flex justify-center">
        <div className="relative w-48 h-48 rounded-full border-4 border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
          <div
            className="absolute top-0 left-0 w-full h-full bg-blue-500 origin-bottom"
            style={{ transform: `rotate(${rotation}deg)` }}
          />
          <div
            className="absolute top-0 left-1/2 w-1/2 h-full bg-blue-500 origin-left"
            style={{ transform: `rotate(${180 + rotation}deg)` }}
          />
          <div className="absolute inset-3 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700" />
          <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-gray-700 dark:text-gray-200">
            {numerator}/{denominator}
          </div>
        </div>
      </div>
    );
  };

  if (!questions.length) {
    return (
      <div className="text-center text-gray-700 dark:text-gray-300">
        <p>This quest does not have any questions yet. Please try another quest.</p>
      </div>
    );
  }

  if (gameCompleted) {
    const success = score >= quest.completionScore;
    return (
      <div className="text-center space-y-4">
        <h2 className={`text-2xl font-bold ${success ? 'text-green-500' : 'text-yellow-500'}`}>
          {success ? 'Quest Complete!' : 'Quest Over'}
        </h2>
        <p className="text-xl">You earned {score} XP!</p>
        <p>{success ? 'Fantastic job! Your progress has been saved.' : 'Keep practicing and try the quest again soon.'}</p>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="space-y-6">
      {showAchievement && (
        <AchievementPopup achievement={`Reached Level ${level}!`} onClose={() => setShowAchievement(false)} />
      )}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="font-bold text-lg">Score: {score}</div>
        <div className={`font-bold text-lg ${timeLeft <= 10 ? 'text-red-500' : ''}`}>
          Time Left: {Math.max(0, timeLeft)}s
        </div>
        <div className="font-semibold text-lg">Level {level}</div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-bold mb-2">{quest.title}</h3>
        <p className="mb-4 text-gray-700 dark:text-gray-300">{currentQuestion.prompt}</p>
        {(quest.playMode === 'fraction-visual' || currentQuestion.type === 'fraction') && renderFractionVisual(currentQuestion)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentQuestion.answers.map(answer => (
          <button
            key={answer.id}
            onClick={() => handleAnswer(answer)}
            className={`p-4 rounded-lg text-lg font-semibold transition-colors border dark:border-gray-700 ${
              selectedAnswerId === answer.id
                ? answer.isCorrect
                  ? 'bg-green-500 text-white'
                  : 'bg-red-500 text-white'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {answer.label}
          </button>
        ))}
      </div>

      {feedback && (
        <div
          className={`mt-4 p-3 rounded text-center font-medium ${
            feedback.includes('Correct') ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'
          }`}
        >
          {feedback}
        </div>
      )}
    </div>
  );
};

export default Game;
