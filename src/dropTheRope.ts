#!/usr/bin/env node --max-old-space-size=1024
/* istanbul ignore file */

import * as dropTheRopeRunner from './dropTheRopeRunner';
import { profileFn, timeFn } from './utils/logger';

// profileFn(() => dropTheRopeRunner.run({}))
timeFn(() => dropTheRopeRunner.run({}))
// dropTheRopeRunner.run({});
