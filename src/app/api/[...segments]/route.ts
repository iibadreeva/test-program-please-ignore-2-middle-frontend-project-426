import { apiError } from "@/server/http";

function notFound() {
  return apiError(404, "NOT_FOUND", "Эндпоинт не найден");
}

export async function GET() {
  return notFound();
}

export async function POST() {
  return notFound();
}

export async function PUT() {
  return notFound();
}

export async function PATCH() {
  return notFound();
}

export async function DELETE() {
  return notFound();
}

export async function OPTIONS() {
  return notFound();
}
