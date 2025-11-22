
import { useState, useEffect } from 'react';
import type { Student } from '../types';
import { fetchStudents } from '../utils/offlineSync';

const Leaderboard = () => {
  const [students, setStudents] = useState<Student[]>([]);

  const fetchData = () => {
    fetchStudents().then(students => {
      const sortedStudents = students.sort((a, b) => b.xp - a.xp);
      setStudents(sortedStudents);
    });
  };

  useEffect(() => {
    fetchData();
    window.addEventListener('focus', fetchData);
    return () => window.removeEventListener('focus', fetchData);
  }, []);

  return (
    <div className="dark:text-white">
      <h2 className="text-2xl font-bold mb-4">Leaderboard</h2>
      <ol className="list-decimal list-inside space-y-2">
        {students.map((student, index) => (
          <li key={student.id} className="border-b py-2 dark:border-gray-700">
            <span className="font-bold text-lg">{index + 1}. {student.name}</span> - <span className="text-gray-600 dark:text-gray-400">{student.xp} XP</span>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default Leaderboard;
