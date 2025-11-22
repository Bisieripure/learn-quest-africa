import { useState, useEffect } from 'react';
import type { Progress, Quest } from '../types';
import { fetchProgress, fetchQuests, getCachedStudent } from '../utils/offlineSync';

const ProgressPage = () => {
  const [progress, setProgress] = useState<Progress[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const student = getCachedStudent();

  const fetchData = () => {
    if (student) {
      fetchProgress(student.id).then(setProgress);
    }
    fetchQuests().then(setQuests);
  };

  useEffect(() => {
    fetchData();
    window.addEventListener('focus', fetchData);
    return () => window.removeEventListener('focus', fetchData);
  }, [student]);

  const getQuestTitle = (questId: string) => {
    const quest = quests.find(q => q.id === questId);
    return quest ? quest.title : 'Unknown Quest';
  };

  return (
    <div className="dark:text-white">
      <h2 className="text-2xl font-bold mb-4">My Progress</h2>
      {student ? (
        <div className="space-y-4">
          {progress.map(p => (
            <div key={p.id} className="border p-4 rounded dark:bg-gray-800 dark:border-gray-700">
              <h3 className="font-bold">{getQuestTitle(p.questId)}</h3>
              <p>Score: {p.score}</p>
              <p>Completed: {p.completed ? 'Yes' : 'No'}</p>
            </div>
          ))}
        </div>
      ) : (
        <p>Please create a profile to see your progress.</p>
      )}
    </div>
  );
};

export default ProgressPage;
