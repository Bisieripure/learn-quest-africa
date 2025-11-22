
import { useEffect, useState } from 'react';

interface AchievementPopupProps {
  achievement: string;
  onClose: () => void;
}

const AchievementPopup = ({ achievement, onClose }: AchievementPopupProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose();
    }, 3000); // auto close after 3 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-yellow-400 text-gray-800 p-4 rounded-lg shadow-lg animate-bounce">
      <h3 className="font-bold text-lg">Achievement Unlocked!</h3>
      <p>{achievement}</p>
    </div>
  );
};

export default AchievementPopup;
