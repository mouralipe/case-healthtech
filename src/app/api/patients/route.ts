// GET /api/pacientes — patient list (in-memory mock).
// Consumed by the sidebar via TanStack Query (server-state separate from the stream).
export async function GET() {
  const patients = [
    { id: "p-001", name: "Maria Silva", phone: "+351 912 000 001", lastVisit: "2026-05-10" },
    { id: "p-002", name: "John Santos", phone: "+351 912 000 002", lastVisit: "2026-04-22" },
    { id: "p-003", name: "Ana Ferreira", phone: "+351 912 000 003", lastVisit: "2026-06-01" },
  ];

  return Response.json(patients);
}
