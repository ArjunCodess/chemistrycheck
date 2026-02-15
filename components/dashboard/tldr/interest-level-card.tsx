import { ChatStats } from "@/types";

interface InterestLevelCardProps {
  stats: ChatStats;
}

export function InterestLevelCard({ stats }: InterestLevelCardProps) {
  const users = Object.keys(stats.messagesByUser || {}).slice(0, 2);

  const interestPercentages = stats.interestPercentage || {};

  const interestLevels = users.map(user => ({
    user,
    score: interestPercentages[user]?.score || 0
  }));

  return (
    <div className="bg-pink-50 dark:bg-pink-900/30 rounded-3xl p-5 shadow-sm h-auto">
      <h3 className="text-lg font-medium text-center text-pink-800 dark:text-pink-200 mb-4">
        Interest level
      </h3>

      <div className="flex justify-between items-center">
        {/* Show interest level for first user */}
        <div className="text-center w-1/3">
          <p className="text-sm text-pink-600 dark:text-pink-300 mb-1">{interestLevels[0]?.user}</p>
          <div className="relative">
            <div className="w-24 h-24 mx-auto">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#fbcfe8"
                  strokeWidth="8"
                  className="dark:opacity-30"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#ec4899"
                  strokeWidth="8"
                  strokeDasharray={`${interestLevels[0]?.score * 2.5} 1000`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-2xl font-bold text-pink-800 dark:text-pink-100">
                  {interestLevels[0]?.score}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Show interest level for second user */}
        {interestLevels.length > 1 && (
          <div className="text-center w-1/3">
            <p className="text-sm text-pink-600 dark:text-pink-300 mb-1">{interestLevels[1]?.user}</p>
            <div className="relative">
              <div className="w-24 h-24 mx-auto">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#fbcfe8"
                    strokeWidth="8"
                    className="dark:opacity-30"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#ec4899"
                    strokeWidth="8"
                    strokeDasharray={`${interestLevels[1]?.score * 2.5} 1000`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-2xl font-bold text-pink-800 dark:text-pink-100">
                    {interestLevels[1]?.score}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}