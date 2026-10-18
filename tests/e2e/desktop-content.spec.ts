import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { replay } from '../../src/game/engine';
import { encodeSave } from '../../src/game/storage';
import type { Decision } from '../../src/game/types';

test('desktop content fixture handles an existing profile after upgrade verification', async ({ page }) => {
  const route: Decision[] = [
    { sceneId: 'first-reply', choiceId: 'first-reply-1' }, { sceneId: 'c2-open', choiceId: 'c2-open-1' },
    { sceneId: 'c2-call', choiceId: 'c2-call-1' }, { sceneId: 'c3-choice', choiceId: 'c3-choice-2' },
    { sceneId: 'c4-choice', choiceId: 'c4-choice-1' }, { sceneId: 'c5-choice', choiceId: 'c5-choice-1' },
  ];
  await page.addInitScript(save => localStorage.setItem('netlove:v1:save:auto', save), JSON.stringify(encodeSave(replay(route, 'end-tinghe', 9))));
  await page.goto('/');
  const result = await page.evaluate(readFileSync('electron/smoke-script.js', 'utf8'));
  expect(result).toMatchObject({ story: true, autosave: true, sandbox: true, tinghe: true, xumi: true, ending: true, archive: true });
});
