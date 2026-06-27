import { clerkClient, auth } from "@clerk/nextjs/server";

export async function getCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const client = await clerkClient();
  const currentUserData = await client.users.getUser(userId);
  return currentUserData;
}
