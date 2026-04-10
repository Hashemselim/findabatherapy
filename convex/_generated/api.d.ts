/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _helpers from "../_helpers.js";
import type * as admin from "../admin.js";
import type * as agreements from "../agreements.js";
import type * as analytics from "../analytics.js";
import type * as billing from "../billing.js";
import type * as clientPortal from "../clientPortal.js";
import type * as communications from "../communications.js";
import type * as crm from "../crm.js";
import type * as files from "../files.js";
import type * as inquiries from "../inquiries.js";
import type * as intake from "../intake.js";
import type * as jobs from "../jobs.js";
import type * as lib_public_branding from "../lib/public_branding.js";
import type * as listings from "../listings.js";
import type * as locations from "../locations.js";
import type * as notifications from "../notifications.js";
import type * as referrals from "../referrals.js";
import type * as seed from "../seed.js";
import type * as team from "../team.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  _helpers: typeof _helpers;
  admin: typeof admin;
  agreements: typeof agreements;
  analytics: typeof analytics;
  billing: typeof billing;
  clientPortal: typeof clientPortal;
  communications: typeof communications;
  crm: typeof crm;
  files: typeof files;
  inquiries: typeof inquiries;
  intake: typeof intake;
  jobs: typeof jobs;
  "lib/public_branding": typeof lib_public_branding;
  listings: typeof listings;
  locations: typeof locations;
  notifications: typeof notifications;
  referrals: typeof referrals;
  seed: typeof seed;
  team: typeof team;
  workspaces: typeof workspaces;
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
