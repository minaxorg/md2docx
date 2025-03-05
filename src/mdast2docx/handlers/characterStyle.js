/*
 * Copyright 2021 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import all from '../all.js';

export default function characterStyle(opts) {
  return async (ctx, node) => {
    if (typeof opts === 'string') {
      // eslint-disable-next-line no-param-reassign
      opts = {
        [opts]: true,
      };
    }
    Object.assign(ctx.style, opts);
    const result = await all(ctx, node);
    Object.keys(opts).forEach((key) => {
      delete ctx.style[key];
    });
    return result;
  };
}
