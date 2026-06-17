// // Import authMiddleware from the server entrypoint where it's exported
// import { authMiddleware } from "@clerk/nextjs";

// export default authMiddleware({
//   // Public routes that don't require authentication
//   publicRoutes: [
//     "/",
//     "/sign-in(.*)",
//     "/sign-up(.*)",
//     "/api/webhooks(.*)",
//     "/api/public(.*)",
//   ],

//   // Routes that are always public
//   ignoredRoutes: ["/_next(.*)", "/api/health(.*)", "/favicon.ico"],
// });

// export const config = {
//   matcher: [
//     // Skip Next.js internals and all static files
//     "/((?!_next|static|favicon.ico|public).*)",
//     // Always run for API routes
//     "/(api|trpc)(.*)",
//   ],
// };
