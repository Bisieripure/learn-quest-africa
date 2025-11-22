import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

interface Student {
  id: string;
  name: string;
  avatar: string;
  level: number;
  xp: number;
  parentPhone: string;
}

const Home = () => {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('boy');
  const [parentPhone, setParentPhone] = useState('');
  const [isReturningUser, setIsReturningUser] = useState(false);
  const navigate = useNavigate();

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const studentId = Date.now().toString();
    const student = { id: studentId, name: name.trim(), avatar, level: 1, xp: 0, parentPhone: parentPhone.trim() };

    // Optimistically navigate and save to local storage
    localStorage.setItem('learnquest-student', JSON.stringify(student));
    
    // Add to students array
    const savedStudents = localStorage.getItem('learnquest-students');
    const students: Student[] = savedStudents ? JSON.parse(savedStudents) : [];
    const existingStudentIndex = students.findIndex((s: Student) => s.name.toLowerCase() === name.trim().toLowerCase());
    if (existingStudentIndex === -1) {
      students.push(student);
      localStorage.setItem('learnquest-students', JSON.stringify(students));
    }
    
    navigate('/game');

    try {
      const response = await fetch(`${API_BASE_URL}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(student),
      });
      if (!response.ok) {
        console.error('Failed to create student on server');
        // Clean up the temporary student from cache
        const savedStudents = localStorage.getItem('learnquest-students');
        const students: Student[] = savedStudents ? JSON.parse(savedStudents) : [];
        const updatedStudents = students.filter(s => s.id !== studentId);
        localStorage.setItem('learnquest-students', JSON.stringify(updatedStudents));
      }
    } catch (error) {
      console.error('Failed to create student', error);
      // Clean up the temporary student from cache
      const savedStudents = localStorage.getItem('learnquest-students');
      const students: Student[] = savedStudents ? JSON.parse(savedStudents) : [];
      const updatedStudents = students.filter(s => s.id !== studentId);
      localStorage.setItem('learnquest-students', JSON.stringify(updatedStudents));
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const savedStudents = localStorage.getItem('learnquest-students');
    if (savedStudents) {
      const students: Student[] = JSON.parse(savedStudents);
      const matchingStudent = students.find((student: Student) => 
        student.name.toLowerCase() === name.trim().toLowerCase()
      );
      if (matchingStudent) {
        localStorage.setItem('learnquest-student', JSON.stringify(matchingStudent));
        navigate('/game');
      } else {
        alert('No saved profile found with that name. Please create a new profile.');
      }
    } else {
      alert('No saved profile found. Please create a new profile.');
    }
  };

  return (
    <div className="text-center px-4 py-8 md:py-12">
      <section className="mb-12">
        <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-800 dark:text-white">Unlock Your Potential with LearnQuest Africa</h2>
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">Embark on a fun-filled learning adventure designed for African students. Master new skills, earn rewards, and climb the leaderboard!</p>
      </section>

      <section className="mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h3 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">🎮 Engaging Games</h3>
            <p className="text-gray-600 dark:text-gray-300">Learn through play with our collection of educational games.</p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h3 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">📈 Track Your Progress</h3>
            <p className="text-gray-600 dark:text-gray-300">Monitor your learning journey and see how far you've come.</p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h3 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">🏆 Compete with Friends</h3>
            <p className="text-gray-600 dark:text-gray-300">Challenge your friends and climb the leaderboard to become a champion.</p>
          </div>
        </div>
      </section>

      <section className="max-w-md mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
        <div className="flex gap-x-2 mb-6">
          <button
            type="button"
            onClick={() => setIsReturningUser(false)}
            className={`flex-1 py-2 px-4 font-semibold rounded-l-lg transition-colors duration-300 ${
              !isReturningUser 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            New User
          </button>
          <button
            type="button"
            onClick={() => setIsReturningUser(true)}
            className={`flex-1 py-2 px-4 font-semibold rounded-r-lg transition-colors duration-300 ${
              isReturningUser 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Returning User
          </button>
        </div>
        
        <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">
          {isReturningUser ? 'Welcome Back!' : 'Create Your Profile'}
        </h2>
        <form onSubmit={isReturningUser ? handleLogin : handleSubmit}>
          <div className="mb-6">
            <label className="block text-left mb-2 text-gray-700 dark:text-gray-300 font-medium">Your Name:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          {!isReturningUser && (
            <>
              <div className="mb-6">
                <label className="block text-left mb-2 text-gray-700 dark:text-gray-300 font-medium">Choose Avatar:</label>
                <select
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="boy">Boy</option>
                  <option value="girl">Girl</option>
                  <option value="animal">Animal</option>
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-left mb-2 text-gray-700 dark:text-gray-300 font-medium">Parent's Phone Number (for SMS updates):</label>
                <input
                  type="text"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}
          <button type="submit" className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800">
            {isReturningUser ? 'Continue Learning' : 'Start Learning'}
          </button>
        </form>
      </section>
    </div>
  );
};

export default Home;

