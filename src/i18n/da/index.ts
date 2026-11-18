import { meta } from "./meta";
import { fmt } from "./fmt";
import { time } from "./time";
import { common } from "./common";
import { list } from "./list";
import { guest } from "./guest";
import { settings } from "./settings";
import { print } from "./print";
import { server } from "./server";
import { shell } from "./shell";

/** The reference language: every other one has exactly these keys (../types.ts). */
export const da = { meta, fmt, time, common, list, guest, settings, print, server, shell };
