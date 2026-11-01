export function Background() {
  return (
    <>
      <div
        className="fixed inset-0 bg-cover bg-center opacity-25 scale-105 blur-[2px] pointer-events-none z-0"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop')" }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-[#0b131e]/95 via-[#0b131e]/85 to-[#0b131e]/95 pointer-events-none z-0" />
    </>
  );
}
