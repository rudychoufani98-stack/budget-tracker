import { redirect } from 'next/navigation'

// User management lives in Settings -> User Management.
// This page only exists so old /users links keep working.
export default function UsersPage() {
  redirect('/settings')
}
