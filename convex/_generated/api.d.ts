/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _smoke from "../_smoke.js";
import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as comments from "../comments.js";
import type * as dailyQuestions from "../dailyQuestions.js";
import type * as dev from "../dev.js";
import type * as favorites from "../favorites.js";
import type * as http from "../http.js";
import type * as invites from "../invites.js";
import type * as memories from "../memories.js";
import type * as questionPool from "../questionPool.js";
import type * as reactions from "../reactions.js";
import type * as seed from "../seed.js";
import type * as seedMutation from "../seedMutation.js";
import type * as spaces from "../spaces.js";
import type * as todos from "../todos.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  _smoke: typeof _smoke;
  admin: typeof admin;
  auth: typeof auth;
  comments: typeof comments;
  dailyQuestions: typeof dailyQuestions;
  dev: typeof dev;
  favorites: typeof favorites;
  http: typeof http;
  invites: typeof invites;
  memories: typeof memories;
  questionPool: typeof questionPool;
  reactions: typeof reactions;
  seed: typeof seed;
  seedMutation: typeof seedMutation;
  spaces: typeof spaces;
  todos: typeof todos;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
