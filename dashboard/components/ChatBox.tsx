
export function ChatBox({ children }) {
  return (
    <div className="min-h-28 w-full rounded-lg bg-white py-2 p-4 ring-1 ring-slate-900/5 dark:bg-slate-800">
      <div className="flex space-x-4  text-gray-700">{children}</div>
    </div>
  );
}
